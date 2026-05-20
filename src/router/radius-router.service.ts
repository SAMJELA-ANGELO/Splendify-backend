import { Injectable, Logger } from '@nestjs/common';
import { RouterProvider, RadiusUser, RadiusSession, RadiusSessionLimits } from './router-provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import * as dgram from 'dgram';
import * as radius from 'radius';
import { tryDecryptSecret } from '../common/encryption.util';

@Injectable()
export class RadiusRouterService implements RouterProvider {
  private readonly logger = new Logger(RadiusRouterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async authenticateUser(user: RadiusUser): Promise<boolean> {
    this.logger.log(`RADIUS Router: authenticate user ${user.username}`);
    // Defer to actual RADIUS auth flow (handled by RadiusService). Router provider only needs to perform CoA/Disconnect.
    return true;
  }

  async authorizeUser(user: RadiusUser): Promise<RadiusSessionLimits> {
    this.logger.log(`RADIUS Router: authorize user ${user.username}`);
    return {
      sessionTimeout: 24 * 60 * 60,
      idleTimeout: 30 * 60,
      downloadSpeed: 10000,
      uploadSpeed: 5000,
      attributes: {
        'Mikrotik-Rate-Limit': '10M/5M',
      },
    };
  }

  async startAccounting(session: RadiusSession): Promise<boolean> {
    this.logger.log(`RADIUS Router: start accounting for ${session.username}`);
    return true;
  }

  async updateAccounting(session: RadiusSession): Promise<boolean> {
    this.logger.log(`RADIUS Router: update accounting for ${session.username}`);
    return true;
  }

  async stopAccounting(session: RadiusSession): Promise<boolean> {
    this.logger.log(`RADIUS Router: stop accounting for ${session.username}`);
    return true;
  }

  /**
   * Send a CoA / Disconnect-Request to the NAS for the provided username/session.
   * Finds active sessions for the username and sends a RADIUS CoA to the NAS-IP-Address.
   */
  async disconnectUser(username: string, sessionId?: string): Promise<boolean> {
    this.logger.log(`RADIUS Router: disconnectUser ${username} session ${sessionId || '<any>'}`);

    try {
      // Find active sessions for the username
      const sessions = await this.prisma.session.findMany({
        where: {
          isActive: true,
          user: {
            username,
          },
        },
        include: { router: true, user: true },
      });

      if (!sessions || sessions.length === 0) {
        this.logger.warn(`No active sessions found for ${username}`);
        return false;
      }

      let anySent = false;

      for (const s of sessions) {
        if (sessionId && s.acctSessionId !== sessionId) {
          continue;
        }

        const nasIp = s.nasIpAddress || s.router?.localIpAddress;
        if (!nasIp) {
          this.logger.warn(`No NAS IP available for session ${s.id}`);
          continue;
        }

        const encryptedSecret = s.router?.radiusSecret || null;
        const secret = tryDecryptSecret(encryptedSecret) || 'secret';

        try {
          const coaPacket = radius.encode({
            code: 'CoA-Request',
            secret,
            attributes: [
              ['User-Name', username],
              s.acctSessionId ? ['Acct-Session-Id', s.acctSessionId] : null,
            ].filter(Boolean),
          } as any);

          const sock = dgram.createSocket('udp4');
          await new Promise<void>((resolve, reject) => {
            sock.send(coaPacket, 0, coaPacket.length, 3799, nasIp, (err) => {
              sock.close();
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });

          this.logger.log(`Sent CoA to ${nasIp} for ${username} (session ${s.acctSessionId || s.id})`);
          anySent = true;
        } catch (err: any) {
          this.logger.error(`Failed to send CoA to ${nasIp} for ${username}: ${err?.message || err}`);
          // attempt Disconnect-Request fallback
          try {
            const dr = radius.encode({
              code: 'Disconnect-Request',
              secret,
              attributes: [
                ['User-Name', username],
                s.acctSessionId ? ['Acct-Session-Id', s.acctSessionId] : null,
              ].filter(Boolean),
            } as any);
            const sock2 = dgram.createSocket('udp4');
            await new Promise<void>((resolve, reject) => {
              sock2.send(dr, 0, dr.length, 3799, nasIp, (err) => {
                sock2.close();
                if (err) reject(err); else resolve();
              });
            });
            this.logger.log(`Sent Disconnect-Request to ${nasIp} for ${username}`);
            anySent = true;
          } catch (err2: any) {
            this.logger.error(`Fallback Disconnect failed for ${nasIp}: ${err2?.message || err2}`);
          }
        }
      }

      return anySent;
    } catch (error: any) {
      this.logger.error(`Error disconnecting user ${username}: ${error?.message || error}`);
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    // Basic health: ensure DB reachable and return true
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (err) {
      this.logger.warn('RadiusRouterService health check failed', err?.message || err);
      return false;
    }
  }

  async testConnection(): Promise<any> {
    this.logger.log('RadiusRouter: testConnection');
    const healthy = await this.healthCheck();
    return { message: healthy ? 'Radius router provider is healthy' : 'Radius router provider is unhealthy' };
  }

  async listHotspotUsers(): Promise<any[]> {
    this.logger.log('RadiusRouter: listHotspotUsers not supported in RADIUS-only mode');
    return [];
  }

  async getUserDetails(username: string): Promise<any> {
    this.logger.log(`RadiusRouter: getUserDetails not supported in RADIUS-only mode for ${username}`);
    return null;
  }

  async getActiveUsers(): Promise<any[]> {
    this.logger.log('RadiusRouter: getActiveUsers not supported in RADIUS-only mode');
    return [];
  }

  async disableUser(username: string): Promise<any> {
    this.logger.log(`RadiusRouter: disableUser not supported in RADIUS-only mode for ${username}`);
    return { success: false, message: 'Not supported in RADIUS-only mode' };
  }

  async deleteUser(username: string): Promise<any> {
    this.logger.log(`RadiusRouter: deleteUser not supported in RADIUS-only mode for ${username}`);
    return { success: false, message: 'Not supported in RADIUS-only mode' };
  }

  async deactivateUser(username: string): Promise<any> {
    this.logger.log(`RadiusRouter: deactivateUser not supported in RADIUS-only mode for ${username}`);
    return { success: false, message: 'Not supported in RADIUS-only mode' };
  }

  // --- Proxy-like helpers
  async userExists(username: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({ where: { username } });
    return !!user;
  }

  async createUser(username: string, password: string): Promise<any> {
    // In a RADIUS setup, the authoritative store is the DB. Creating user in router is a no-op.
    this.logger.log(`RadiusRouter: createUser noop for ${username}`);
    return { success: true };
  }

  async createHotspotUserOnly(username: string, durationHours: number): Promise<{ activeRouter?: string }> {
    this.logger.log(`RadiusRouter: createHotspotUserOnly (noop) ${username} ${durationHours}h`);
    return { activeRouter: 'radius-managed' };
  }

  async silentLogin(username: string, password: string, macAddress: string, ipAddress: string, durationHours: number): Promise<any> {
    this.logger.log(`RadiusRouter: silentLogin noop for ${username}`);
    // Best-effort: send CoA to try and enforce session if possible
    await this.disconnectUser(username);
    return { activeRouter: 'radius-managed' };
  }

  async activateUser(username: string, durationHours: number): Promise<any> {
    this.logger.log(`RadiusRouter: activateUser not supported in RADIUS-only mode for ${username} ${durationHours}h`);
    return { success: false, message: 'Not supported in RADIUS-only mode' };
  }

  async bindMacOnAvailableRouter(macAddress: string, durationHours: number = 0): Promise<any> {
    this.logger.log(`RadiusRouter: bindMacOnAvailableRouter noop for ${macAddress}`);
    return { activeRouter: 'radius-managed' };
  }

  async unbindMacOnAvailableRouters(macAddress: string): Promise<any> {
    this.logger.log(`RadiusRouter: unbindMacOnAvailableRouters noop for ${macAddress}`);
    return { result: 'ok' };
  }

  async activateOnAvailableRouter(username: string, durationHours: number, macAddress?: string): Promise<any> {
    this.logger.log(`RadiusRouter: activateOnAvailableRouter noop for ${username}`);
    return { activeRouter: 'radius-managed' };
  }
}

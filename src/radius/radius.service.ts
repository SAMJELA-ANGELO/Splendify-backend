import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { tryDecryptSecret } from '../common/encryption.util';
import { RadiusStatusDto } from './dto/radius-status.dto';
import * as dgram from 'dgram';
import * as radius from 'radius';

@Injectable()
export class RadiusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RadiusService.name);
  private authServer: dgram.Socket;
  private acctServer: dgram.Socket;
  private routerCache = new Map<string, { secret: string; tenantId: string; expires: number }>();
  private readonly CACHE_TTL = 30 * 1000; // 30 seconds

  // Statistics
  private startTime = Date.now();
  private totalAuthRequests = 0;
  private totalAcctRequests = 0;
  private activeSessions = 0;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.startAuthServer();
    this.startAcctServer();
  }

  onModuleDestroy() {
    if (this.authServer) {
      this.authServer.close();
    }
    if (this.acctServer) {
      this.acctServer.close();
    }
  }

  private startAuthServer() {
    this.authServer = dgram.createSocket('udp4');

    this.authServer.on('listening', () => {
      const address = this.authServer.address();
      this.logger.log(`RADIUS Authentication server listening on ${address.address}:${address.port}`);
    });

    this.authServer.on('message', async (msg, rinfo) => {
      try {
        await this.handleAuthRequest(msg, rinfo);
      } catch (error) {
        this.logger.error(`Error handling auth request from ${rinfo.address}:${rinfo.port}`, error);
      }
    });

    this.authServer.on('error', (err) => {
      this.logger.error('RADIUS Auth server error:', err);
    });

    this.authServer.bind(1812);
  }

  private startAcctServer() {
    this.acctServer = dgram.createSocket('udp4');

    this.acctServer.on('listening', () => {
      const address = this.acctServer.address();
      this.logger.log(`RADIUS Accounting server listening on ${address.address}:${address.port}`);
    });

    this.acctServer.on('message', async (msg, rinfo) => {
      try {
        await this.handleAcctRequest(msg, rinfo);
      } catch (error) {
        this.logger.error(`Error handling acct request from ${rinfo.address}:${rinfo.port}`, error);
      }
    });

    this.acctServer.on('error', (err) => {
      this.logger.error('RADIUS Acct server error:', err);
    });

    this.acctServer.bind(1813);
  }

  private async handleAuthRequest(msg: Buffer, rinfo: dgram.RemoteInfo) {
    this.totalAuthRequests++;
    // Mock mode: just log the packet
    this.logger.log(`[RADIUS] Auth Request from ${rinfo.address}:${rinfo.port}, size: ${msg.length} bytes`);

    try {
      // Get router secret from cache or database
      const routerInfo = await this.getRouterInfo(rinfo.address);
      if (!routerInfo) {
        this.logger.warn(`[RADIUS] No router found for IP ${rinfo.address}`);
        this.sendAccessReject(rinfo, msg, null); // No secret available
        return;
      }

      // Decode the RADIUS packet
      const packet = radius.decode({
        packet: msg,
        secret: routerInfo.secret,
      });

      this.logger.log(`[RADIUS] Decoded packet: ${JSON.stringify(packet)}`);

      const username = packet.attributes['User-Name'];
      if (!username) {
        this.logger.warn('[RADIUS] No User-Name in request');
        this.sendAccessReject(rinfo, msg, routerInfo.secret);
        return;
      }

      // Find user by username (not voucher code)
      const user = await this.prisma.user.findFirst({
        where: {
          username: username,
          tenantId: routerInfo.tenantId,
        },
        include: {
          plan: true,
        },
      });

      if (!user) {
        this.logger.log(`[RADIUS] User not found: ${username}`);
        this.sendAccessReject(rinfo, msg, routerInfo.secret);
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        this.logger.log(`[RADIUS] User inactive: ${username}`);
        this.sendAccessReject(rinfo, msg, routerInfo.secret);
        return;
      }

      // Check if user has an active plan
      if (!user.planId || !user.plan) {
        this.logger.log(`[RADIUS] User has no active plan: ${username}`);
        this.sendAccessReject(rinfo, msg, routerInfo.secret);
        return;
      }

      // Verify password
      const userPassword = packet.attributes['User-Password'];
      if (!userPassword) {
        this.logger.warn('[RADIUS] No User-Password in request');
        this.sendAccessReject(rinfo, msg, routerInfo.secret);
        return;
      }

      // Compare passwords (user.password is hashed, so we need to compare)
      const bcrypt = require('bcrypt');
      const passwordMatch = await bcrypt.compare(userPassword, user.password);
      if (!passwordMatch) {
        this.logger.log(`[RADIUS] Invalid password for user: ${username}`);
        this.sendAccessReject(rinfo, msg, routerInfo.secret);
        return;
      }

      // Check session expiry
      if (user.sessionExpiry && user.sessionExpiry < new Date()) {
        this.logger.log(`[RADIUS] User session expired: ${username}`);
        // Update user as inactive
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: false },
        });
        this.sendAccessReject(rinfo, msg, routerInfo.secret);
        return;
      }

      // User is valid - send Access-Accept
      this.logger.log(`[RADIUS] Auth success for user: ${username}`);
      this.sendAccessAccept(rinfo, msg, packet, user);

    } catch (error) {
      this.logger.error('[RADIUS] Error processing auth request:', error);
      this.sendAccessReject(rinfo, msg);
    }
  }

  private async handleAcctRequest(msg: Buffer, rinfo: dgram.RemoteInfo) {
    this.totalAcctRequests++;
    this.logger.log(`[RADIUS] Acct Request from ${rinfo.address}:${rinfo.port}, size: ${msg.length} bytes`);

    try {
      const routerInfo = await this.getRouterInfo(rinfo.address);
      if (!routerInfo) {
        this.logger.warn(`[RADIUS] No router found for accounting from IP ${rinfo.address}`);
        return;
      }

      const packet = radius.decode({
        packet: msg,
        secret: routerInfo.secret,
      });

      this.logger.log(`[RADIUS] Accounting packet: ${JSON.stringify(packet)}`);

      const acctStatusType = packet.attributes['Acct-Status-Type'];
      const username = packet.attributes['User-Name'];
      const sessionId = packet.attributes['Acct-Session-Id'];

      if (!username || !sessionId) {
        this.logger.warn('[RADIUS] Missing username or session ID in accounting packet');
        return;
      }

      // Find the user
      const user = await this.prisma.user.findFirst({
        where: {
          username: username,
          tenantId: routerInfo.tenantId,
        },
      });

      if (!user) {
        this.logger.warn(`[RADIUS] User not found for accounting: ${username}`);
        return;
      }

      switch (acctStatusType) {
        case 1: // Accounting-Start
          this.logger.log(`[RADIUS] Accounting-Start for user: ${username}, session: ${sessionId}`);
          await this.handleAccountingStart(user, sessionId, packet, routerInfo.tenantId);
          break;

        case 2: // Interim-Update
          this.logger.log(`[RADIUS] Interim-Update for user: ${username}, session: ${sessionId}`);
          await this.handleAccountingUpdate(user, sessionId, packet, routerInfo.tenantId);
          break;

        case 3: // Accounting-Stop
          this.logger.log(`[RADIUS] Accounting-Stop for user: ${username}, session: ${sessionId}`);
          await this.handleAccountingStop(user, sessionId, packet, routerInfo.tenantId);
          break;

        default:
          this.logger.warn(`[RADIUS] Unknown accounting status type: ${acctStatusType}`);
      }

    } catch (error) {
      this.logger.error('[RADIUS] Error processing acct request:', error);
    }
  }

  private async getRouterInfo(ipAddress: string): Promise<{ secret: string; tenantId: string } | null> {
    // Check cache first
    const cached = this.routerCache.get(ipAddress);
    if (cached && cached.expires > Date.now()) {
      return { secret: cached.secret, tenantId: cached.tenantId };
    }

    // Query database
    const router = await this.prisma.router.findFirst({
      where: { localIpAddress: ipAddress },
      select: {
        radiusSecret: true,
        tenantId: true,
      },
    });

    if (!router || !router.radiusSecret) {
      return null;
    }

    const secret = tryDecryptSecret(router.radiusSecret);
    if (!secret) {
      return null;
    }

    // Cache the result
    this.routerCache.set(ipAddress, {
      secret,
      tenantId: router.tenantId,
      expires: Date.now() + this.CACHE_TTL,
    });

    return { secret, tenantId: router.tenantId };
  }

  private sendAccessAccept(rinfo: dgram.RemoteInfo, requestPacket: Buffer, packet: any, user: any) {
    const response = radius.encode_response({
      packet: packet, // Use the decoded packet object, not the raw buffer
      code: 'Access-Accept',
      secret: this.routerCache.get(rinfo.address)?.secret || '',
      attributes: [
        // Session timeout based on remaining time until expiry
        user.sessionExpiry ? [
          'Session-Timeout',
          Math.floor((user.sessionExpiry.getTime() - Date.now()) / 1000)
        ] : null,

        // MikroTik rate limit from plan
        user.plan ? [
          'Mikrotik-Rate-Limit',
          this.formatRateLimit(user.plan)
        ] : null,
      ].filter(Boolean),
    });

    this.authServer.send(response, 0, response.length, rinfo.port, rinfo.address);
  }

  private async handleAccountingStart(user: any, sessionId: string, packet: any, tenantId: string) {
    try {
      const sessionData = {
        tenantId,
        userId: user.id,
        routerId: null, // We'll set this if we can determine the router
        startTime: new Date(),
        isActive: true,
        macAddress: packet.attributes['Calling-Station-Id'],
        ipAddress: packet.attributes['Framed-IP-Address'],
        nasIdentifier: packet.attributes['NAS-Identifier'],
        nasIpAddress: packet.attributes['NAS-IP-Address'],
        framedIpAddress: packet.attributes['Framed-IP-Address'],
        callingStationId: packet.attributes['Calling-Station-Id'],
        calledStationId: packet.attributes['Called-Station-Id'],
        acctSessionId: sessionId,
      };

      const session = await this.prisma.session.create({
        data: sessionData,
      });

      this.logger.log(`[RADIUS] Session created: ${session.id} for user ${user.username}`);
    } catch (error) {
      this.logger.error(`[RADIUS] Error creating session: ${error.message}`);
    }
  }

  private async handleAccountingUpdate(user: any, sessionId: string, packet: any, tenantId: string) {
    try {
      // Find existing session
      const session = await this.prisma.session.findFirst({
        where: {
          acctSessionId: sessionId,
          userId: user.id,
          tenantId,
          isActive: true,
        },
      });

      if (!session) {
        this.logger.warn(`[RADIUS] No active session found for update: ${sessionId}`);
        return;
      }

      // Update data usage
      const inputOctets = packet.attributes['Acct-Input-Octets'] || 0;
      const outputOctets = packet.attributes['Acct-Output-Octets'] || 0;
      const sessionTime = packet.attributes['Acct-Session-Time'] || 0;

      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          dataUsedDownload: BigInt(inputOctets),
          dataUsedUpload: BigInt(outputOctets),
          dataUsed: BigInt(inputOctets + outputOctets),
          remainingTime: sessionTime,
        },
      });

      this.logger.log(`[RADIUS] Session updated: ${session.id}, data used: ${inputOctets + outputOctets} bytes`);
    } catch (error) {
      this.logger.error(`[RADIUS] Error updating session: ${error.message}`);
    }
  }

  private async handleAccountingStop(user: any, sessionId: string, packet: any, tenantId: string) {
    try {
      // Find and close the session
      const session = await this.prisma.session.findFirst({
        where: {
          acctSessionId: sessionId,
          userId: user.id,
          tenantId,
          isActive: true,
        },
      });

      if (!session) {
        this.logger.warn(`[RADIUS] No active session found for stop: ${sessionId}`);
        return;
      }

      // Final data usage update
      const inputOctets = packet.attributes['Acct-Input-Octets'] || 0;
      const outputOctets = packet.attributes['Acct-Output-Octets'] || 0;
      const sessionTime = packet.attributes['Acct-Session-Time'] || 0;
      const terminateCause = packet.attributes['Acct-Terminate-Cause'];

      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          endTime: new Date(),
          isActive: false,
          dataUsedDownload: BigInt(inputOctets),
          dataUsedUpload: BigInt(outputOctets),
          dataUsed: BigInt(inputOctets + outputOctets),
          remainingTime: sessionTime,
          acctTerminateCause: terminateCause,
        },
      });

      this.logger.log(`[RADIUS] Session closed: ${session.id}, final data used: ${inputOctets + outputOctets} bytes`);
    } catch (error) {
      this.logger.error(`[RADIUS] Error closing session: ${error.message}`);
    }
  }

  private sendAccessReject(rinfo: dgram.RemoteInfo, requestPacket: Buffer, secret?: string | null) {
    if (!secret) {
      // Can't send a proper RADIUS response without the secret
      this.logger.warn(`[RADIUS] Cannot send Access-Reject: no secret available for ${rinfo.address}`);
      return;
    }

    const response = radius.encode_response({
      packet: radius.decode({ packet: requestPacket, secret }), // Decode first, then use decoded packet
      code: 'Access-Reject',
      secret,
      attributes: [],
    });

    this.authServer.send(response, 0, response.length, rinfo.port, rinfo.address);
  }

  private formatRateLimit(plan: any): string {
    // Format as "download/upload" in Mbps or Kbps
    // MikroTik expects format like "5M/10M" for 5Mbps download, 10Mbps upload
    if (plan.downloadLimit && plan.uploadLimit) {
      const download = this.formatSpeed(plan.downloadLimit);
      const upload = this.formatSpeed(plan.uploadLimit);
      return `${download}/${upload}`;
    }

    // Fallback to legacy speedLimit field
    if (plan.speedLimit) {
      return `${plan.speedLimit}M/${plan.speedLimit}M`;
    }

    return '1M/1M'; // Default fallback
  }

  private formatSpeed(bytesPerSecond: bigint): string {
    const bps = Number(bytesPerSecond);
    const mbps = bps / (1024 * 1024);

    if (mbps >= 1) {
      return `${Math.floor(mbps)}M`;
    }

    const kbps = bps / 1024;
    return `${Math.floor(kbps)}K`;
  }

  getStatus(): RadiusStatusDto {
    return {
      status: 'RADIUS server is running',
      authPort: 1812,
      acctPort: 1813,
      uptime: Date.now() - this.startTime,
      totalRequests: this.totalAuthRequests + this.totalAcctRequests,
      activeSessions: this.activeSessions,
    };
  }
}
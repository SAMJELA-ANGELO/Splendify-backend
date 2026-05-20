import { Injectable, Logger } from '@nestjs/common';
import {
  RouterProvider,
  RadiusUser,
  RadiusSession,
  RadiusSessionLimits,
} from './router-provider.interface';

@Injectable()
export class MockRouterService implements RouterProvider {
  private readonly logger = new Logger(MockRouterService.name);

  async authenticateUser(user: RadiusUser): Promise<boolean> {
    this.logger.log(
      `🔐 RADIUS AUTH: Authenticating user ${user.username} for tenant ${user.tenantId}`,
    );

    // Simulate authentication logic
    const isAuthenticated = true; // Always succeed for mock

    this.logger.log(
      `✅ RADIUS AUTH: User ${user.username} authentication ${isAuthenticated ? 'successful' : 'failed'}`,
    );

    return isAuthenticated;
  }

  async authorizeUser(user: RadiusUser): Promise<RadiusSessionLimits> {
    this.logger.log(
      `📋 RADIUS AUTHZ: Authorizing user ${user.username} with plan ${user.planId}`,
    );

    // Mock session limits based on plan
    const limits: RadiusSessionLimits = {
      maxDataDownload: 100 * 1024 * 1024 * 1024, // 100GB
      maxDataUpload: 50 * 1024 * 1024 * 1024, // 50GB
      maxSessionTime: 24 * 60 * 60, // 24 hours
      maxIdleTime: 30 * 60, // 30 minutes
      downloadSpeed: 10000, // 10Mbps
      uploadSpeed: 5000, // 5Mbps
      sessionTimeout: 24 * 60 * 60,
      idleTimeout: 30 * 60,
      attributes: {
        'Mikrotik-Rate-Limit': '10M/5M',
        'Mikrotik-Address-List': `tenant-${user.tenantId}`,
        'Session-Timeout': 86400,
        'Idle-Timeout': 1800,
      },
    };

    this.logger.log(
      `✅ RADIUS AUTHZ: User ${user.username} authorized with limits:`,
      limits,
    );

    return limits;
  }

  async startAccounting(session: RadiusSession): Promise<boolean> {
    this.logger.log(
      `📊 RADIUS ACCT START: Starting session for ${session.username}`,
    );
    this.logger.log(`Session details:`, {
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      nasIdentifier: session.nasIdentifier,
      nasIpAddress: session.nasIpAddress,
      framedIpAddress: session.framedIpAddress,
      callingStationId: session.callingStationId,
      calledStationId: session.calledStationId,
      acctSessionId: session.acctSessionId,
      startTime: session.startTime,
    });

    // Simulate successful accounting start
    this.logger.log(
      `✅ RADIUS ACCT START: Session ${session.sessionId} started successfully`,
    );

    return true;
  }

  async updateAccounting(session: RadiusSession): Promise<boolean> {
    this.logger.log(
      `📊 RADIUS ACCT UPDATE: Updating session ${session.sessionId} for ${session.username}`,
    );
    this.logger.log(`Usage stats:`, {
      dataUsedDownload: session.dataUsedDownload,
      dataUsedUpload: session.dataUsedUpload,
      sessionTime: session.sessionTime,
    });

    // Simulate successful accounting update
    this.logger.log(
      `✅ RADIUS ACCT UPDATE: Session ${session.sessionId} updated successfully`,
    );

    return true;
  }

  async stopAccounting(session: RadiusSession): Promise<boolean> {
    this.logger.log(
      `📊 RADIUS ACCT STOP: Stopping session ${session.sessionId} for ${session.username}`,
    );
    this.logger.log(`Final stats:`, {
      dataUsedDownload: session.dataUsedDownload,
      dataUsedUpload: session.dataUsedUpload,
      sessionTime: session.sessionTime,
    });

    // Simulate successful accounting stop
    this.logger.log(
      `✅ RADIUS ACCT STOP: Session ${session.sessionId} stopped successfully`,
    );

    return true;
  }

  // --- Proxy-like helpers (simulate MikroTik proxy behavior)
  async userExists(username: string): Promise<boolean> {
    this.logger.log(`MockRouter: check userExists ${username}`);
    return false;
  }

  async createUser(username: string, password: string): Promise<any> {
    this.logger.log(`MockRouter: createUser ${username}`);
    return { success: true };
  }

  async createHotspotUserOnly(username: string, durationHours: number): Promise<{ activeRouter?: string }> {
    this.logger.log(`MockRouter: createHotspotUserOnly ${username} (${durationHours}h)`);
    return { activeRouter: 'mock-router-1' };
  }

  async silentLogin(username: string, password: string, macAddress: string, ipAddress: string, durationHours: number): Promise<any> {
    this.logger.log(`MockRouter: silentLogin ${username} mac=${macAddress} ip=${ipAddress}`);
    return { activeRouter: 'mock-router-1' };
  }

  async bindMacOnAvailableRouter(macAddress: string, durationHours: number = 0): Promise<any> {
    this.logger.log(`MockRouter: bindMacOnAvailableRouter ${macAddress}`);
    return { activeRouter: 'mock-router-1' };
  }

  async unbindMacOnAvailableRouters(macAddress: string): Promise<any> {
    this.logger.log(`MockRouter: unbindMacOnAvailableRouters ${macAddress}`);
    return { result: 'ok' };
  }

  async activateOnAvailableRouter(username: string, durationHours: number, macAddress?: string): Promise<any> {
    this.logger.log(`MockRouter: activateOnAvailableRouter ${username}`);
    return { activeRouter: 'mock-router-1' };
  }

  async activateUser(username: string, durationHours: number): Promise<any> {
    this.logger.log(`MockRouter: activateUser ${username} (${durationHours}h)`);
    return { success: true, activeRouter: 'mock-router-1' };
  }

  async disconnectUser(username: string, sessionId?: string): Promise<boolean> {
    this.logger.log(
      `🔌 RADIUS CoA: Disconnecting user ${username}${sessionId ? ` (session: ${sessionId})` : ''}`,
    );

    // Simulate successful disconnect
    this.logger.log(
      `✅ RADIUS CoA: User ${username} disconnected successfully`,
    );

    return true;
  }

  async healthCheck(): Promise<boolean> {
    this.logger.log(`🏥 RADIUS HEALTH: Performing router health check`);

    // Simulate health check
    const isHealthy = true;

    this.logger.log(
      `✅ RADIUS HEALTH: Router is ${isHealthy ? 'healthy' : 'unhealthy'}`,
    );

    return isHealthy;
  }

  async testConnection(): Promise<any> {
    this.logger.log(`MockRouter: testConnection`);
    return { message: 'Router provider is healthy' };
  }

  async listHotspotUsers(): Promise<any[]> {
    this.logger.log(`MockRouter: listHotspotUsers`);
    return [];
  }

  async getUserDetails(username: string): Promise<any> {
    this.logger.log(`MockRouter: getUserDetails ${username}`);
    return null;
  }

  async getActiveUsers(): Promise<any[]> {
    this.logger.log(`MockRouter: getActiveUsers`);
    return [];
  }

  async disableUser(username: string): Promise<any> {
    this.logger.log(`MockRouter: disableUser ${username}`);
    return { success: true };
  }

  async deleteUser(username: string): Promise<any> {
    this.logger.log(`MockRouter: deleteUser ${username}`);
    return { success: true };
  }

  async deactivateUser(username: string): Promise<any> {
    this.logger.log(`MockRouter: deactivateUser ${username}`);
    return { success: true };
  }
}

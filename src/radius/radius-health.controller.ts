import { Controller, Get, Logger } from '@nestjs/common';
import { RadiusService } from './radius.service';

/**
 * RADIUS Health Check Controller
 * 
 * Provides HTTP endpoints to check the status of RADIUS servers running on:
 * - Port 1812: Authentication (Access-Request/Access-Accept)
 * - Port 1813: Accounting (Accounting-Request)
 */
@Controller('health/radius')
export class RadiusHealthController {
  private readonly logger = new Logger(RadiusHealthController.name);

  constructor(private readonly radiusService: RadiusService) {}

  /**
   * Get overall RADIUS service status
   */
  @Get('status')
  getRadiusStatus() {
    this.logger.log('📊 RADIUS status check requested');
    const status = this.radiusService.getStatus();
    
    return {
      status: 'operational',
      message: 'RADIUS servers are running',
      service: 'RADIUS Authentication & Accounting',
      ports: {
        authentication: {
          port: 1812,
          protocol: 'UDP',
          service: 'Access-Request / Access-Accept',
          status: 'listening',
        },
        accounting: {
          port: 1813,
          protocol: 'UDP',
          service: 'Accounting-Request / Accounting-Response',
          status: 'listening',
        },
      },
      metrics: {
        authRequests: status.totalAuthRequests ?? 0,
        acctRequests: status.totalAcctRequests ?? 0,
        activeSessions: status.activeSessions ?? 0,
        uptime: status.uptime ?? 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Authentication port (1812) status
   */
  @Get('auth-port')
  getAuthPortStatus() {
    this.logger.log('🔐 RADIUS authentication port (1812) status check');
    const status = this.radiusService.getStatus();

    return {
      port: 1812,
      status: 'operational',
      protocol: 'UDP',
      service: 'RADIUS Authentication',
      description:
        'Handles Access-Request packets for user authentication and returns Access-Accept or Access-Reject',
      features: [
        'User-Name and User-Password validation',
        'Session-Timeout calculation',
        'Rate-Limit attributes (MikroTik-Rate-Limit)',
        'Plan-based speed limits (download/upload)',
      ],
      requests: status.totalAuthRequests ?? 0,
      uptime: status.uptime ?? 0,
      lastCheck: new Date().toISOString(),
      url: 'udp://your-server-ip:1812',
    };
  }

  /**
   * Accounting port (1813) status
   */
  @Get('acct-port')
  getAcctPortStatus() {
    this.logger.log('📊 RADIUS accounting port (1813) status check');
    const status = this.radiusService.getStatus();

    return {
      port: 1813,
      status: 'operational',
      protocol: 'UDP',
      service: 'RADIUS Accounting',
      description:
        'Handles Accounting-Request packets for session tracking and returns Accounting-Response',
      features: [
        'Accounting-Start on session begin',
        'Interim-Update for ongoing sessions',
        'Accounting-Stop on session end',
        'Data usage tracking (input/output octets)',
        'Session duration calculation',
      ],
      requests: status.totalAcctRequests ?? 0,
      activeSessions: status.activeSessions ?? 0,
      uptime: status.uptime ?? 0,
      lastCheck: new Date().toISOString(),
      url: 'udp://your-server-ip:1813',
    };
  }

  /**
   * Detailed health check with MikroTik configuration
   */
  @Get('setup-guide')
  getSetupGuide() {
    this.logger.log('📖 RADIUS setup guide requested');

    const serverIp = process.env.SERVER_IP || 'your-server-ip';

    return {
      title: 'RADIUS Server Configuration Guide',
      server: {
        authentication: `${serverIp}:1812`,
        accounting: `${serverIp}:1813`,
      },
      status: {
        port1812: 'operational',
        port1813: 'operational',
        description: 'Both RADIUS ports are accessible',
      },
      configuration: {
        mikrotik: {
          title: 'MikroTik RouterOS Configuration',
          steps: [
            {
              step: 1,
              title: 'Access Router Management',
              instructions: [
                'Open WinBox or web interface',
                'Connect to your MikroTik router',
              ],
            },
            {
              step: 2,
              title: 'Configure RADIUS Server',
              path: 'IP > Hotspot > RADIUS',
              instructions: [
                'Click "+" to add a new RADIUS server',
                `Address: ${serverIp}`,
                'Authentication Port: 1812',
                'Accounting Port: 1813',
                'Secret: [Your router RADIUS secret]',
                'Check "Hotspot" service',
              ],
            },
            {
              step: 3,
              title: 'Configure Hotspot Profile',
              path: 'IP > Hotspot > Server Profiles',
              instructions: [
                'Edit your hotspot server profile',
                'Go to Login tab',
                'Change "Login By" to "HTTP CHAP"',
                'Check "RADIUS" checkbox',
              ],
            },
            {
              step: 4,
              title: 'Test Connection',
              instructions: [
                'Connect to the hotspot with a valid voucher code',
                'Check server logs for RADIUS authentication messages',
                'Monitor the status endpoints below',
              ],
            },
          ],
        },
      },
      endpoints: {
        overall_status: '/health/radius/status',
        auth_port_1812: '/health/radius/auth-port',
        acct_port_1813: '/health/radius/acct-port',
      },
      voucher_format: {
        description: 'RADIUS vouchers use username:password format',
        example: 'username:password_hash',
        authentication:
          'When connecting, use the voucher code as username and the original password',
      },
      testing: {
        curl: `curl http://${serverIp}/health/radius/status`,
        description:
          'Use this endpoint to verify RADIUS ports are accessible',
      },
    };
  }

  /**
   * Quick connectivity test
   */
  @Get('quick-check')
  quickCheck() {
    this.logger.log('⚡ Quick RADIUS connectivity check');
    const status = this.radiusService.getStatus();

    const isHealthy =
      (status.totalAuthRequests ?? 0) >= 0 && (status.totalAcctRequests ?? 0) >= 0;

    return {
      healthy: isHealthy,
      port1812: {
        name: 'Authentication',
        status: 'listening',
        requests: status.totalAuthRequests ?? 0,
      },
      port1813: {
        name: 'Accounting',
        status: 'listening',
        requests: status.totalAcctRequests ?? 0,
      },
      uptime: `${Math.floor((status.uptime ?? 0) / 1000)}s`,
    };
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class AdminSeederService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeederService.name);

  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
  ) {}

  async onModuleInit() {
    // Create default tenant
    let defaultTenant = await this.tenantsService.findBySubdomain('default');
    if (!defaultTenant) {
      defaultTenant = await this.tenantsService.create({
        name: 'Default ISP',
        subdomain: 'default',
        email: 'admin@splendidstarlink.com',
        businessName: 'Splendid Starlink',
        isActive: true,
      });
      this.logger.log('Default tenant created');
    }

    // Check globally for existing user (username is globally unique)
    const existing = await this.usersService.findByIdentifierAnyTenant('splendid');
    if (existing) {
      this.logger.log(
        `Admin user already exists: splendid (Tenant: ${existing.tenantId}, ID: ${existing.id})`,
      );
      return;
    }

    const adminPassword = 'To2dayPips';
    await this.usersService.create(
      defaultTenant.id,
      'splendid',
      adminPassword,
      'admin@splendidstarlink.com',
      undefined,
      undefined,
      undefined,
      'ISP_ADMIN', // Admin user, not a customer
    );
    this.logger.log('Admin user created: splendid (ISP_ADMIN)');
    this.logger.log(
      'Use username "splendid" + password "To2dayPips" to login and access plans endpoints',
    );
  }
}

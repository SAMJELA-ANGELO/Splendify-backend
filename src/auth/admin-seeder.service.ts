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
    // Create the system SUPER_ADMIN user
    await this.createSuperAdmin();
  }

  private async createSuperAdmin() {
    try {
      // Check if super admin already exists
      const existingSuperAdmin = await this.usersService.findByIdentifierAnyTenant('splendid');
      
      if (existingSuperAdmin) {
        if (existingSuperAdmin.role === 'SUPER_ADMIN') {
          this.logger.log('✅ SUPER_ADMIN user already exists: splendid');
          this.logger.log(`   📧 Email: ${existingSuperAdmin.email}`);
          this.logger.log(`   🔑 Use these credentials to login to the system`);
          return;
        } else {
          this.logger.warn(`⚠️ User 'splendid' exists but is not a SUPER_ADMIN (role: ${existingSuperAdmin.role})`);
          return;
        }
      }

      // Create SUPER_ADMIN user
      const superAdmin = await this.usersService.createSuperAdmin(
        'splendid',
        'To2dayPips',
        'splendid@gmail.com',
      );

      this.logger.log('✅ SUPER_ADMIN user created successfully');
      this.logger.log(`   👤 Username: ${superAdmin.username}`);
      this.logger.log(`   📧 Email: ${superAdmin.email}`);
      this.logger.log(`   🔑 Password: To2dayPips`);
      this.logger.log(`   🎯 Role: SUPER_ADMIN`);
      this.logger.log('');
      this.logger.log('🔐 LOGIN CREDENTIALS:');
      this.logger.log('   Username: splendid');
      this.logger.log('   Password: To2dayPips');
      this.logger.log('   Email: splendid@gmail.com');
      this.logger.log('');
      this.logger.log('✨ This user can:');
      this.logger.log('   • Create and manage tenants (ISPs)');
      this.logger.log('   • Assign routers to tenants');
      this.logger.log('   • Access all system administration features');

    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation - user already exists
        this.logger.log('✅ SUPER_ADMIN user already exists: splendid');
      } else {
        this.logger.error(`❌ Failed to create SUPER_ADMIN: ${error.message}`, error.stack);
      }
    }
  }
}

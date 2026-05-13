import { Injectable, Logger } from '@nestjs/common';
import { Prisma, User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MikrotikService } from '../mikrotik/mikrotik.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private logger = new Logger('UsersService');

  constructor(
    private prisma: PrismaService,
    private mikrotikService: MikrotikService,
  ) {}

  async create(
    tenantId: string,
    username: string,
    password: string,
    email?: string,
    macAddress?: string,
    ipAddress?: string,
    routerIdentity?: string,
    role: string = 'CUSTOMER',
  ): Promise<PrismaUser> {
    this.logger.log(
      `👤 Starting user creation process for username: ${username} (Tenant: ${tenantId}, Role: ${role})`,
    );
    if (macAddress) {
      this.logger.log(`   📌 MAC Address: ${macAddress}`);
    }
    if (ipAddress) {
      this.logger.log(`   🌐 IP Address: ${ipAddress}`);
    }
    if (routerIdentity) {
      this.logger.log(`   🛰️ Router Identity: ${routerIdentity}`);
    }

    try {
      // Only create MikroTik user for CUSTOMER role
      if (role === 'CUSTOMER') {
        this.logger.log(`  1️⃣ Creating MikroTik hotspot user: ${username}`);
        await this.mikrotikService.createUser(username, password);
        this.logger.log(`  ✅ MikroTik hotspot user created: ${username}`);
      } else {
        this.logger.log(`  1️⃣ Skipping MikroTik user creation for role: ${role}`);
      }

      this.logger.log(`  2️⃣ Hashing password for database storage`);
      const hashedPassword = await bcrypt.hash(password, 10);
      this.logger.log(`  ✅ Password hashed successfully`);

      this.logger.log(`  3️⃣ Creating user record in PostgreSQL via Prisma`);
      const savedUser = await this.prisma.user.create({
        data: {
          tenantId,
          username,
          email: email?.toLowerCase() || null,
          password: hashedPassword,
          role,
          mikrotikCreated: role === 'CUSTOMER',
          macAddress: macAddress || null,
          ipAddress: ipAddress || null,
          routerIdentity: routerIdentity || null,
          isActive: role !== 'CUSTOMER', // ISP_ADMIN and SUPER_ADMIN active by default
        },
      });

      this.logger.log(
        `✅ User created successfully: ${username} (ID: ${savedUser.id}, Tenant: ${tenantId}, Role: ${role}, MikroTik: ${role === 'CUSTOMER' ? '✓' : '✗'}, MAC: ${macAddress || 'null'}, IP: ${ipAddress || 'null'})`,
      );
      return savedUser;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to create user ${username}: ${error.message}`,
      );
      throw error;
    }
  }

  async createSuperAdmin(
    username: string,
    password: string,
    email: string,
  ): Promise<PrismaUser> {
    this.logger.log(`👤 Creating SUPER_ADMIN user: ${username}`);

    try {
      this.logger.log(`  1️⃣ Hashing password for database storage`);
      const hashedPassword = await bcrypt.hash(password, 10);
      this.logger.log(`  ✅ Password hashed successfully`);

      this.logger.log(`  2️⃣ Creating SUPER_ADMIN user record in PostgreSQL`);
      const savedUser = await this.prisma.user.create({
        data: {
          tenantId: null, // SUPER_ADMIN has no tenant
          username,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          isActive: true, // Super admins are active by default
          mikrotikCreated: false,
        },
      });

      this.logger.log(
        `✅ SUPER_ADMIN created successfully: ${username} (ID: ${savedUser.id}, Email: ${email})`,
      );
      return savedUser;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to create SUPER_ADMIN ${username}: ${error.message}`,
      );
      throw error;
    }
  }

  async findByIdentifier(
    tenantId: string,
    identifier: string,
  ): Promise<PrismaUser | null> {
    this.logger.log(
      `🔍 Finding user by identifier: ${identifier} (Tenant: ${tenantId})`,
    );
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        OR: [
          { username: identifier },
          {
            email: {
              equals: identifier,
              mode: 'insensitive',
            },
          },
        ],
      },
    });
    if (user) {
      this.logger.log(`✅ User found: ${user.username} (ID: ${user.id})`);
    } else {
      this.logger.warn(`⚠️ User not found: ${identifier}`);
    }
    return user;
  }

  async findByUsername(
    tenantId: string,
    username: string,
  ): Promise<PrismaUser | null> {
    this.logger.log(
      `🔍 Finding user by username: ${username} (Tenant: ${tenantId})`,
    );
    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_username: {
          tenantId,
          username,
        },
      },
    });
    if (user) {
      this.logger.log(`✅ User found: ${username} (ID: ${user.id})`);
    } else {
      this.logger.warn(`⚠️ User not found: ${username}`);
    }
    return user;
  }

  async findByIdentifierAnyTenant(identifier: string): Promise<PrismaUser | null> {
    this.logger.log(
      `🔍 Finding user by identifier across all tenants: ${identifier}`,
    );
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          {
            email: {
              equals: identifier,
              mode: 'insensitive',
            },
          },
        ],
      },
    });
    if (user) {
      this.logger.log(
        `✅ User found: ${user.username} (ID: ${user.id}, Tenant: ${user.tenantId})`,
      );
    } else {
      this.logger.warn(`⚠️ User not found: ${identifier}`);
    }
    return user;
  }

  async findById(tenantId: string, id: string): Promise<PrismaUser | null> {
    this.logger.log(`🔍 Finding user by ID: ${id} (Tenant: ${tenantId})`);
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
      },
    });
    if (user) {
      this.logger.log(`✅ User found by ID: ${user.username}`);
    } else {
      this.logger.warn(`⚠️ User not found with ID: ${id}`);
    }
    return user;
  }

  async findAll(tenantId: string) {
    this.logger.log(`📋 Fetching all users for tenant: ${tenantId}`);
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 1,
          select: { startTime: true, endTime: true, isActive: true },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(
    tenantId: string,
    id: string,
    updateData: Partial<Prisma.UserUncheckedUpdateInput>,
  ): Promise<PrismaUser | null> {
    this.logger.log(
      `✏️ Updating user ${id} with: ${JSON.stringify(updateData)} (Tenant: ${tenantId})`,
    );

    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existingUser) {
      this.logger.error(
        `❌ Failed to update user: ${id} (not found in tenant ${tenantId})`,
      );
      return null;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`✅ User updated successfully: ${updatedUser.username}`);
    return updatedUser;
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    this.logger.debug(`🔐 Validating password`);
    const isValid = await bcrypt.compare(password, hashedPassword);
    if (isValid) {
      this.logger.log(`✅ Password validation successful`);
    } else {
      this.logger.warn(`⚠️ Password validation failed`);
    }
    return isValid;
  }

  async findByMacWithActiveSession(
    tenantId: string,
    macAddress: string,
  ): Promise<PrismaUser | null> {
    this.logger.log(
      `📌 Checking for active user with MAC: ${macAddress} (Tenant: ${tenantId})`,
    );

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        macAddress,
        isActive: true,
        sessionExpiry: {
          gt: new Date(),
        },
      },
    });

    if (user) {
      this.logger.log(
        `✅ Active user found with MAC ${macAddress}: ${user.username} (expires: ${user.sessionExpiry})`,
      );
      return user;
    }

    this.logger.warn(`⚠️ No active user found with MAC: ${macAddress}`);
    return null;
  }

  async findByMacIncludingExpired(
    tenantId: string,
    macAddress: string,
  ): Promise<PrismaUser | null> {
    this.logger.log(
      `📌 Checking for user with MAC (including expired): ${macAddress} (Tenant: ${tenantId})`,
    );

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        macAddress,
      },
    });

    if (user) {
      const isExpired =
        !user.isActive ||
        !user.sessionExpiry ||
        new Date() > user.sessionExpiry;
      this.logger.log(
        `${isExpired ? '⚠️' : '✅'} User found with MAC ${macAddress}: ${user.username} (expired: ${isExpired})`,
      );
      return user;
    }

    this.logger.warn(`⚠️ No user found with MAC: ${macAddress}`);
    return null;
  }
}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    tenantId: string | undefined,
    username: string,
    password: string,
  ): Promise<any> {
    let user;

    // If tenantId is provided, use it for tenant-scoped lookup
    if (tenantId) {
      user = await this.usersService.findByIdentifier(tenantId, username);
    } else {
      // For admin login without tenant context, find user across all tenants
      user = await this.usersService.findByIdentifierAnyTenant(username);
    }

    if (
      user &&
      (await this.usersService.validatePassword(password, user.password))
    ) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);
    return {
      success: true,
      message: 'Login successful',
      data: {
        token,
        access_token: token,
        expires_in: 3600,
        token_type: 'Bearer',
        user: {
          userId: user.id.toString(),
          username: user.username,
          role: user.role,
        },
        planStatus: {} as any, // Will be set by controller
        mikrotikAuth: {} as any, // Will be set by controller
      },
    };
  }
}

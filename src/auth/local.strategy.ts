import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      passReqToCallback: true,
    });
  }

  async validate(
    request: any,
    username: string,
    password: string,
  ): Promise<any> {
    let tenantId = request.tenantId || request.body?.tenantId || request.headers['x-tenant-id'];
    if (typeof tenantId !== 'string') {
      tenantId = undefined;
    }

    const user = await this.authService.validateUser(
      tenantId,
      username,
      password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return user;
  }
}

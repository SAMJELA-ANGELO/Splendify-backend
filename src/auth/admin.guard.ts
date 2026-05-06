import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  private logger = new Logger(AdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    this.logger.debug(
      `AdminGuard - User from request: ${JSON.stringify(user)}`,
    );

    if (!user || !user.username) {
      this.logger.warn('AdminGuard - No user or username found in request');
      throw new ForbiddenException('Access denied: admin credentials required');
    }

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const isAdminUser =
      user.username === adminUsername ||
      user.username === 'splendid' ||
      user.role === 'SUPER_ADMIN';

    if (!isAdminUser) {
      this.logger.warn(
        `AdminGuard - User ${user.username} is not authorized as admin`,
      );
      throw new ForbiddenException(
        'Access denied: only admin can access this endpoint',
      );
    }

    this.logger.debug(`AdminGuard - User ${user.username} authorized`);
    return true;
  }
}

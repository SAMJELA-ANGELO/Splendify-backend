import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';

export interface RequestWithTenant extends Request {
  tenantId?: string;
  user?: any;
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  constructor(private readonly jwtService: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const response = context.switchToHttp().getResponse();

    // Skip tenant resolution for public endpoints that do not require tenant context
    if (this.shouldSkipTenantValidation(request)) {
      this.logger.debug(
        `Skipping tenant validation for public route: ${request.method} ${request.url}`,
      );
      return next.handle();
    }

    // Extract tenantId from multiple sources (priority order)
    const tenantId = this.extractTenantId(request);

    if (!tenantId) {
      this.logger.warn(
        `No tenantId found in request: ${request.method} ${request.url}`,
      );
      throw new BadRequestException('Tenant ID is required');
    }

    // Validate tenantId format (should be UUID or similar)
    if (!this.isValidTenantId(tenantId)) {
      this.logger.warn(`Invalid tenantId format: ${tenantId}`);
      throw new BadRequestException('Invalid tenant ID format');
    }

    // Attach tenantId to request object
    request.tenantId = tenantId;

    // Log tenant context for debugging
    this.logger.debug(
      `Tenant context set: ${tenantId} for ${request.method} ${request.url}`,
    );

    return next.handle();
  }

  private extractTenantId(request: Request): string | null {
    // Priority 1: Header 'x-tenant-id'
    const headerTenantId = request.headers['x-tenant-id'] as string;
    if (headerTenantId) {
      this.logger.debug(`TenantId from header: ${headerTenantId}`);
      return headerTenantId;
    }

    // Priority 2: URL parameter 'tenantId' or tenant route param 'id'
    let urlTenantId: string | null = null;
    if (typeof request.params.tenantId === 'string') {
      urlTenantId = request.params.tenantId;
    } else if (typeof request.params.id === 'string' && request.path.startsWith('/tenants/')) {
      urlTenantId = request.params.id;
    } else if (typeof request.query.tenantId === 'string') {
      urlTenantId = request.query.tenantId;
    }

    if (urlTenantId) {
      this.logger.debug(`TenantId from URL: ${urlTenantId}`);
      return urlTenantId;
    }

    // Priority 3: JWT token payload (if available)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = this.jwtService.decode(token);
        if (payload && payload.tenantId) {
          this.logger.debug(`TenantId from JWT: ${payload.tenantId}`);
          return payload.tenantId;
        }
      } catch (error) {
        this.logger.warn(`Failed to decode JWT token: ${error.message}`);
      }
    }

    // Priority 4: Subdomain extraction (for multi-tenant subdomains)
    const host = request.headers.host;
    if (host) {
      const subdomain = this.extractSubdomain(host);
      if (subdomain) {
        this.logger.debug(`TenantId from subdomain: ${subdomain}`);
        return subdomain;
      }
    }

    return null;
  }

  private extractSubdomain(host: string): string | null {
    // Remove port if present
    const hostname = host.split(':')[0];

    // For development: localhost, 127.0.0.1, etc.
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.')
    ) {
      return null; // No subdomain in development
    }

    // Split by dots and check for subdomain
    const parts = hostname.split('.');
    if (parts.length > 2) {
      // Assume format: tenant.domain.com
      const subdomain = parts[0];
      // Skip common prefixes like 'www', 'api', 'app'
      if (!['www', 'api', 'app', 'admin'].includes(subdomain)) {
        return subdomain;
      }
    }

    return null;
  }

  private isValidTenantId(tenantId: string): boolean {
    // Accept both UUID format and Nanoid format
    // UUID: 8-4-4-4-12 hex digits with hyphens
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // Nanoid: 15-30 alphanumeric characters (lowercase letters, numbers)
    const nanoidRegex = /^[a-z0-9]{15,30}$/;
    
    return uuidRegex.test(tenantId) || nanoidRegex.test(tenantId);
  }

  private shouldSkipTenantValidation(request: Request): boolean {
    const publicRoutes = [
      { method: 'POST', path: '/tenants' },
      { method: 'GET', path: '/tenants' },
      { method: 'POST', path: '/auth/register' },
      { method: 'POST', path: '/auth/login' },
      { method: 'POST', path: '/tenant/auth/register' },
      { method: 'POST', path: '/tenant/auth/login' },
      { method: 'GET', path: '/health' },
      { method: 'GET', path: '/health/ping' },
      { method: 'GET', path: '/health/detailed' },
    ];

    const requestPath = (request.path || request.url || '').split('?')[0];
    return publicRoutes.some(
      (route) => route.method === request.method && requestPath === route.path,
    );
  }
}

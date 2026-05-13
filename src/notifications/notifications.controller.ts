import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  UseGuards,
  Request,
  Logger,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SessionNotificationService } from './session-notification.service';
import { PaymentStatusNotificationService } from './payment-status-notification.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly sessionNotificationService: SessionNotificationService,
    private readonly paymentNotificationService: PaymentStatusNotificationService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({
    summary: 'Manually trigger session notification check',
    description:
      'Manually run the session notification check to send warnings for expiring sessions. ' +
      'Useful for testing. In production, this runs automatically every 2 minutes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification check completed',
    schema: {
      example: {
        message: 'Session notification check completed',
        timestamp: '2026-03-27T00:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - No valid JWT token provided',
  })
  @Post('check-session')
  @UseGuards(JwtAuthGuard)
  async checkSessionNotifications() {
    this.logger.log(`🔄 Manual session notification check triggered by user`);
    await this.sessionNotificationService.handleSessionNotifications();
    return {
      message: 'Session notification check completed',
      timestamp: new Date().toISOString(),
    };
  }

  @ApiOperation({
    summary: 'Manually trigger payment notification check',
    description:
      'Manually run the payment notification check to send payment status notifications. ' +
      'Useful for testing. In production, this runs automatically every 1 minute.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment notification check completed',
    schema: {
      example: {
        message: 'Payment notification check completed',
        timestamp: '2026-03-27T00:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - No valid JWT token provided',
  })
  @Post('check-payments')
  @UseGuards(JwtAuthGuard)
  async checkPaymentNotifications() {
    this.logger.log(`🔄 Manual payment notification check triggered by user`);
    await this.paymentNotificationService.handlePaymentNotifications();
    return {
      message: 'Payment notification check completed',
      timestamp: new Date().toISOString(),
    };
  }

  @ApiOperation({
    summary: 'Reset session notification flags for testing',
    description:
      'Reset notification flags for a specific user to re-test session notifications. ' +
      'This allows re-sending the same notifications for testing purposes.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to reset notification flags for',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification flags reset successfully',
    schema: {
      example: {
        message:
          'Session notification flags reset for user: 507f1f77bcf86cd799439011',
        timestamp: '2026-03-27T00:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - No valid JWT token provided',
  })
  @Post('reset-session-flags/:userId')
  @UseGuards(JwtAuthGuard)
  async resetSessionNotificationFlags(@Param('userId') userId: string) {
    this.logger.log(
      `🔄 Resetting session notification flags for user: ${userId}`,
    );
    await this.sessionNotificationService.resetNotificationFlags(userId);
    return {
      message: `Session notification flags reset for user: ${userId}`,
      timestamp: new Date().toISOString(),
    };
  }

  @ApiOperation({
    summary: 'Reset payment notification flags for testing',
    description:
      'Reset notification flags for a specific payment to re-test payment notifications. ' +
      'This allows re-sending the same notifications for testing purposes.',
  })
  @ApiParam({
    name: 'paymentId',
    description: 'Payment ID to reset notification flags for',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification flags reset successfully',
    schema: {
      example: {
        message:
          'Payment notification flags reset for: 507f1f77bcf86cd799439011',
        timestamp: '2026-03-27T00:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - No valid JWT token provided',
  })
  @Post('reset-payment-flags/:paymentId')
  @UseGuards(JwtAuthGuard)
  async resetPaymentNotificationFlags(@Param('paymentId') paymentId: string) {
    this.logger.log(
      `🔄 Resetting payment notification flags for: ${paymentId}`,
    );
    await this.paymentNotificationService.resetNotificationFlags(paymentId);
    return {
      message: `Payment notification flags reset for: ${paymentId}`,
      timestamp: new Date().toISOString(),
    };
  }

  @ApiOperation({
    summary: 'Get notification system status',
    description:
      'Get current status and information about the notification system, including cron schedules and last run times.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification system status retrieved',
    schema: {
      example: {
        system: 'Notifications',
        status: 'active',
        services: [
          {
            name: 'SessionNotificationService',
            schedule: 'Every 2 minutes',
            description: 'Checks for expiring sessions and sends warnings',
          },
          {
            name: 'PaymentStatusNotificationService',
            schedule: 'Every 1 minute',
            description:
              'Checks payment status changes and sends notifications',
          },
        ],
        timestamp: '2026-03-27T00:30:00Z',
      },
    },
  })
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getNotificationStatus() {
    this.logger.log(`📊 Notification system status requested`);
    return {
      system: 'Notifications',
      status: 'active',
      services: [
        {
          name: 'SessionNotificationService',
          schedule: 'Every 2 minutes (*/2 * * * *)',
          description:
            'Checks for expiring sessions and sends warnings at 30 min, 10 min, and at expiry',
          endpoints: [
            '/notifications/check-session',
            '/notifications/reset-session-flags/:userId',
          ],
        },
        {
          name: 'PaymentStatusNotificationService',
          schedule: 'Every 1 minute (*/1 * * * *)',
          description:
            'Checks payment status changes and sends initiated/success/failed notifications',
          endpoints: [
            '/notifications/check-payments',
            '/notifications/reset-payment-flags/:paymentId',
          ],
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // ============== NOTIFICATION MANAGEMENT ENDPOINTS ==============

  @ApiOperation({
    summary: 'Get tenant notifications',
    description: 'Retrieve all notifications for the current tenant with optional filtering.',
  })
  @ApiQuery({
    name: 'read',
    required: false,
    description: 'Filter by read status',
    enum: ['true', 'false'],
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by notification type',
    enum: ['payment', 'system', 'warning', 'user', 'connection'],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of notifications to return',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of notifications to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  @Get('tenant')
  @UseGuards(JwtAuthGuard)
  async getTenantNotifications(
    @Request() req: any,
    @Query('read') read?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const tenantId = req.user.tenantId;
    this.logger.log(`📋 Fetching notifications for tenant: ${tenantId}`);

    const where: any = { tenantId };

    if (read !== undefined) {
      where.read = read === 'true';
    }

    if (type) {
      where.type = type;
    }

    const take = limit ? parseInt(limit, 10) : 50;
    const skip = offset ? parseInt(offset, 10) : 0;

    const notifications = await this.prisma.notification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    const total = await this.prisma.notification.count({ where });

    this.logger.log(`✅ Retrieved ${notifications.length} notifications for tenant: ${tenantId}`);

    return {
      notifications,
      total,
      limit: take,
      offset: skip,
    };
  }

  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: 'notif-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  @Put(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.user.tenantId;
    this.logger.log(`✅ Marking notification ${id} as read for tenant: ${tenantId}`);

    const notification = await this.prisma.notification.updateMany({
      where: {
        id,
        tenantId, // Ensure user can only update their own tenant's notifications
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    if (notification.count === 0) {
      throw new Error('Notification not found or access denied');
    }

    return {
      message: 'Notification marked as read',
      id,
    };
  }

  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all unread notifications as read for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  @Put('tenant/read-all')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@Request() req: any) {
    const tenantId = req.user.tenantId;
    this.logger.log(`✅ Marking all notifications as read for tenant: ${tenantId}`);

    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      message: 'All notifications marked as read',
      updatedCount: result.count,
    };
  }

  @ApiOperation({
    summary: 'Delete notification',
    description: 'Delete a specific notification.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: 'notif-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted',
  })
  @Post(':id/delete')
  @UseGuards(JwtAuthGuard)
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.user.tenantId;
    this.logger.log(`🗑️ Deleting notification ${id} for tenant: ${tenantId}`);

    const result = await this.prisma.notification.deleteMany({
      where: {
        id,
        tenantId, // Ensure user can only delete their own tenant's notifications
      },
    });

    if (result.count === 0) {
      throw new Error('Notification not found or access denied');
    }

    return {
      message: 'Notification deleted',
      id,
    };
  }

  @ApiOperation({
    summary: 'Create notification',
    description: 'Create a new notification for the tenant.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['payment', 'system', 'warning', 'user', 'connection'],
          example: 'system',
        },
        title: { type: 'string', example: 'System Update' },
        message: { type: 'string', example: 'System maintenance completed' },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high'],
          example: 'normal',
        },
        userId: { type: 'string', example: 'user-123' },
        data: { type: 'object', example: { key: 'value' } },
      },
      required: ['type', 'title', 'message'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  @Post('tenant')
  @UseGuards(JwtAuthGuard)
  async createNotification(@Body() notificationData: any, @Request() req: any) {
    const tenantId = req.user.tenantId;
    this.logger.log(`➕ Creating notification for tenant: ${tenantId}`);

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority || 'normal',
        userId: notificationData.userId || null,
        data: notificationData.data || null,
      },
    });

    this.logger.log(`✅ Notification created: ${notification.id}`);

    return {
      message: 'Notification created successfully',
      notification,
    };
  }
}

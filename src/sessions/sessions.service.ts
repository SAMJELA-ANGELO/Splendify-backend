import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { PlansService } from '../plans/plans.service';
import type {
  RouterProvider,
  RadiusUser,
  RadiusSession,
} from '../router/router-provider.interface';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private plansService: PlansService,
    @Inject('RouterProvider') private routerProvider: RouterProvider,
  ) {}

  async startSession(
    tenantId: string,
    userId: string,
    routerId?: string,
    radiusData?: {
      macAddress?: string;
      ipAddress?: string;
      nasIdentifier?: string;
      nasIpAddress?: string;
      framedIpAddress?: string;
      callingStationId?: string;
      calledStationId?: string;
      acctSessionId?: string;
    },
  ): Promise<any> {
    this.logger.log(
      `🚀 Starting session for user: ${userId} (Tenant: ${tenantId})`,
    );

    try {
      // Get user and plan details
      const user = await this.usersService.findById(tenantId, userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (!user.planId) {
        throw new BadRequestException('User has no plan assigned');
      }

      const plan = await this.plansService.findById(tenantId, user.planId);
      if (!plan) {
        throw new BadRequestException('Plan not found');
      }

      // Check if user already has an active session
      const existingSession = await this.prisma.session.findFirst({
        where: {
          tenantId,
          userId,
          isActive: true,
        },
      });

      if (existingSession) {
        this.logger.warn(
          `⚠️ User ${userId} already has active session, ending it first`,
        );
        await this.endSession(tenantId, userId, existingSession.id);
      }

      // Create new session in database
      const session = await this.prisma.session.create({
        data: {
          tenantId,
          userId,
          routerId,
          startTime: new Date(),
          isActive: true,
          remainingTime: plan.sessionTimeout || 86400, // Default 24 hours
          sessionTimeout: plan.sessionTimeout,
          macAddress: radiusData?.macAddress,
          ipAddress: radiusData?.ipAddress,
          nasIdentifier: radiusData?.nasIdentifier,
          nasIpAddress: radiusData?.nasIpAddress,
          framedIpAddress: radiusData?.framedIpAddress,
          callingStationId: radiusData?.callingStationId,
          calledStationId: radiusData?.calledStationId,
          acctSessionId: radiusData?.acctSessionId,
        },
        include: {
          user: true,
          router: true,
          tenant: true,
        },
      });

      // RADIUS Authentication and Authorization
      const radiusUser: RadiusUser = {
        username: user.username,
        tenantId,
        planId: user.planId,
        macAddress: radiusData?.macAddress,
        ipAddress: radiusData?.ipAddress,
      };

      // Authenticate user with router
      const authResult = await this.routerProvider.authenticateUser(radiusUser);
      if (!authResult) {
        this.logger.error(
          `❌ RADIUS authentication failed for user ${user.username}`,
        );
        // Clean up session
        await this.prisma.session.delete({ where: { id: session.id } });
        throw new BadRequestException('RADIUS authentication failed');
      }

      // Authorize user and get session limits
      const sessionLimits = await this.routerProvider.authorizeUser(radiusUser);

      // Start RADIUS accounting
      const radiusSession: RadiusSession = {
        sessionId: session.id,
        username: user.username,
        tenantId,
        nasIdentifier: radiusData?.nasIdentifier,
        nasIpAddress: radiusData?.nasIpAddress,
        framedIpAddress: radiusData?.framedIpAddress,
        callingStationId: radiusData?.callingStationId,
        calledStationId: radiusData?.calledStationId,
        acctSessionId: radiusData?.acctSessionId,
        startTime: session.startTime,
      };

      const accountingResult =
        await this.routerProvider.startAccounting(radiusSession);
      if (!accountingResult) {
        this.logger.error(
          `❌ RADIUS accounting start failed for session ${session.id}`,
        );
        // Clean up session
        await this.prisma.session.delete({ where: { id: session.id } });
        throw new BadRequestException('RADIUS accounting start failed');
      }

      this.logger.log(
        `✅ Session started successfully: ${session.id} for user ${user.username}`,
      );
      return {
        session,
        radiusLimits: sessionLimits,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error starting session: ${error.message}`);
      throw error;
    }
  }

  async updateSession(
    tenantId: string,
    sessionId: string,
    updateData: {
      dataUsedDownload?: number;
      dataUsedUpload?: number;
      sessionTime?: number;
    },
  ): Promise<any> {
    this.logger.log(`📊 Updating session: ${sessionId} (Tenant: ${tenantId})`);

    try {
      const session = await this.prisma.session.findFirst({
        where: { id: sessionId, tenantId, isActive: true },
        include: { user: true },
      });

      if (!session) {
        throw new BadRequestException('Active session not found');
      }

      // Update session in database
      const updatedSession = await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          dataUsedDownload: updateData.dataUsedDownload,
          dataUsedUpload: updateData.dataUsedUpload,
          remainingTime: Math.max(
            0,
            session.remainingTime - (updateData.sessionTime || 0),
          ),
        },
        include: { user: true, router: true },
      });

      // Update RADIUS accounting
      const radiusSession: RadiusSession = {
        sessionId,
        username: session.user.username,
        tenantId,
        startTime: session.startTime,
        dataUsedDownload: updateData.dataUsedDownload,
        dataUsedUpload: updateData.dataUsedUpload,
        sessionTime: updateData.sessionTime,
      };

      await this.routerProvider.updateAccounting(radiusSession);

      this.logger.log(`✅ Session updated: ${sessionId}`);
      return updatedSession;
    } catch (error: any) {
      this.logger.error(`❌ Error updating session: ${error.message}`);
      throw error;
    }
  }

  async endSession(
    tenantId: string,
    userId: string,
    sessionId?: string,
  ): Promise<any> {
    this.logger.log(
      `🛑 Ending session for user: ${userId} (Tenant: ${tenantId})`,
    );

    try {
      // Find the active session
      const whereClause = sessionId
        ? { id: sessionId, tenantId, isActive: true }
        : { userId, tenantId, isActive: true };

      const session = await this.prisma.session.findFirst({
        where: whereClause,
        include: { user: true },
      });

      if (!session) {
        this.logger.warn(`⚠️ No active session found for user ${userId}`);
        return null;
      }

      // Update session in database
      const endTime = new Date();
      const sessionTime = Math.floor(
        (endTime.getTime() - session.startTime.getTime()) / 1000,
      );

      const updatedSession = await this.prisma.session.update({
        where: { id: session.id },
        data: {
          endTime,
          isActive: false,
          remainingTime: 0,
        },
        include: { user: true, router: true },
      });

      // Stop RADIUS accounting
      const radiusSession: RadiusSession = {
        sessionId: session.id,
        username: session.user.username,
        tenantId,
        startTime: session.startTime,
        dataUsedDownload: Number(session.dataUsedDownload),
        dataUsedUpload: Number(session.dataUsedUpload),
        sessionTime,
      };

      await this.routerProvider.stopAccounting(radiusSession);

      this.logger.log(
        `✅ Session ended: ${session.id} for user ${session.user.username}`,
      );
      return updatedSession;
    } catch (error: any) {
      this.logger.error(`❌ Error ending session: ${error.message}`);
      throw error;
    }
  }

  async getCurrentSession(tenantId: string, userId: string): Promise<any> {
    this.logger.log(
      `📊 Getting current session for user: ${userId} (Tenant: ${tenantId})`,
    );

    try {
      const session = await this.prisma.session.findFirst({
        where: {
          tenantId,
          userId,
          isActive: true,
        },
        include: {
          user: true,
          router: true,
          tenant: true,
        },
        orderBy: {
          startTime: 'desc',
        },
      });

      if (!session) {
        this.logger.log(`ℹ️ No active session found for user ${userId}`);
        return null;
      }

      const now = new Date();
      const elapsed = Math.floor(
        (now.getTime() - session.startTime.getTime()) / 1000,
      );
      const remainingTime = Math.max(0, session.remainingTime - elapsed);

      this.logger.log(
        `✅ Current session found: ${session.id} for ${session.user.username}`,
      );
      return {
        ...session,
        elapsedTime: elapsed,
        remainingTime,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error getting current session: ${error.message}`);
      return null;
    }
  }

  async getSessionStatus(
    tenantId: string,
    userId: string,
  ): Promise<{
    isActive: boolean;
    remainingTime?: number;
    sessionId?: string;
  }> {
    this.logger.log(
      `⏱️ Getting session status for user: ${userId} (Tenant: ${tenantId})`,
    );

    try {
      const session = await this.getCurrentSession(tenantId, userId);

      if (!session) {
        return { isActive: false };
      }

      return {
        isActive: true,
        remainingTime: session.remainingTime,
        sessionId: session.id,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error getting session status: ${error.message}`);
      return { isActive: false };
    }
  }

  async disconnectUser(tenantId: string, userId: string): Promise<boolean> {
    this.logger.log(`🔌 Disconnecting user: ${userId} (Tenant: ${tenantId})`);

    try {
      const session = await this.getCurrentSession(tenantId, userId);
      if (!session) {
        this.logger.warn(`⚠️ No active session found for user ${userId}`);
        return false;
      }

      // Disconnect via RADIUS CoA
      const result = await this.routerProvider.disconnectUser(
        session.user.username,
        session.id,
      );

      if (result) {
        // End the session in database
        await this.endSession(tenantId, userId, session.id);
      }

      this.logger.log(`✅ User ${userId} disconnected: ${result}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Error disconnecting user: ${error.message}`);
      return false;
    }
  }

  async getSessionsByTenant(
    tenantId: string,
    filters?: { userId?: string; isActive?: boolean; limit?: number },
  ): Promise<any[]> {
    this.logger.log(`📋 Getting sessions for tenant: ${tenantId}`);

    try {
      const sessions = await this.prisma.session.findMany({
        where: {
          tenantId,
          ...(filters?.userId && { userId: filters.userId }),
          ...(filters?.isActive !== undefined && {
            isActive: filters.isActive,
          }),
        },
        include: {
          user: { select: { id: true, username: true, email: true } },
          router: { select: { id: true, name: true, localIpAddress: true } },
        },
        orderBy: { startTime: 'desc' },
        take: filters?.limit || 50,
      });

      this.logger.log(
        `✅ Retrieved ${sessions.length} sessions for tenant ${tenantId}`,
      );
      return sessions;
    } catch (error: any) {
      this.logger.error(`❌ Error getting sessions: ${error.message}`);
      throw error;
    }
  }
}

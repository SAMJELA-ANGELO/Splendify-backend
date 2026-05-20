import { Injectable } from '@nestjs/common';

export interface RadiusUser {
  username: string;
  password?: string;
  tenantId: string;
  planId: string;
  macAddress?: string;
  ipAddress?: string;
}

export interface RadiusSession {
  sessionId: string;
  username: string;
  tenantId: string;
  nasIdentifier?: string;
  nasIpAddress?: string;
  framedIpAddress?: string;
  callingStationId?: string; // MAC address
  calledStationId?: string;
  acctSessionId?: string;
  startTime: Date;
  dataUsedDownload?: number;
  dataUsedUpload?: number;
  sessionTime?: number;
}

export interface RadiusSessionLimits {
  maxDataDownload?: number;
  maxDataUpload?: number;
  maxSessionTime?: number;
  maxIdleTime?: number;
  sessionTimeout?: number;
  idleTimeout?: number;
  downloadSpeed?: number;
  uploadSpeed?: number;
  attributes?: Record<string, any>;
}

export interface RouterProvider {
  /**
   * Authenticate a user for RADIUS access
   * @param user - User authentication details
   * @returns Promise<boolean> - True if authentication successful
   */
  authenticateUser(user: RadiusUser): Promise<boolean>;

  /**
   * Authorize a user session with specific limits
   * @param user - User details with plan information
   * @returns Promise<RadiusSessionLimits> - Session limits and attributes
   */
  authorizeUser(user: RadiusUser): Promise<RadiusSessionLimits>;

  /**
   * Start a RADIUS accounting session
   * @param session - Session details
   * @returns Promise<boolean> - True if session started successfully
   */
  startAccounting(session: RadiusSession): Promise<boolean>;

  /**
   * Update RADIUS accounting during session
   * @param session - Updated session details
   * @returns Promise<boolean> - True if update successful
   */
  updateAccounting(session: RadiusSession): Promise<boolean>;

  /**
   * Stop a RADIUS accounting session
   * @param session - Session details with final stats
   * @returns Promise<boolean> - True if session stopped successfully
   */
  stopAccounting(session: RadiusSession): Promise<boolean>;

  /**
   * Disconnect a user session (CoA - Change of Authorization)
   * @param username - Username to disconnect
   * @param sessionId - Session ID to disconnect
   * @returns Promise<boolean> - True if disconnect successful
   */
  disconnectUser(username: string, sessionId?: string): Promise<boolean>;

  /**
   * Check if router is healthy and responding
   * @returns Promise<boolean> - True if router is healthy
   */
  healthCheck(): Promise<boolean>;

  // Optional hotspot/router provisioning helpers (proxy-like operations)
  userExists?(username: string): Promise<boolean>;
  createUser?(username: string, password: string): Promise<any>;
  createHotspotUserOnly?(username: string, durationHours: number): Promise<{ activeRouter?: string }>;
  silentLogin?(username: string, password: string, macAddress: string, ipAddress: string, durationHours: number): Promise<any>;
  bindMacOnAvailableRouter?(macAddress: string, durationHours?: number): Promise<any>;
  unbindMacOnAvailableRouters?(macAddress: string): Promise<any>;
  activateOnAvailableRouter?(username: string, durationHours: number, macAddress?: string): Promise<any>;
  activateUser?(username: string, durationHours: number): Promise<any>;

  // Optional admin/proxy inspection helpers
  testConnection?(): Promise<any>;
  listHotspotUsers?(): Promise<any[]>;
  getUserDetails?(username: string): Promise<any>;
  getActiveUsers?(): Promise<any[]>;
  disableUser?(username: string): Promise<any>;
  deleteUser?(username: string): Promise<any>;
  deactivateUser?(username: string): Promise<any>;
  idleTimeout?: number; // seconds
  attributes?: Record<string, any>; // Additional RADIUS attributes
}

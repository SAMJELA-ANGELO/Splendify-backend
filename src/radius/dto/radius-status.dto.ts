export class RadiusStatusDto {
  status: string;
  authPort: number;
  acctPort: number;
  uptime?: number;
  totalRequests?: number;
  activeSessions?: number;
}
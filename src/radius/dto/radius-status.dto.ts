export class RadiusStatusDto {
  status: string;
  authPort: number;
  acctPort: number;
  uptime?: number;
  totalRequests?: number;
  totalAuthRequests?: number;
  totalAcctRequests?: number;
  activeSessions?: number;
}
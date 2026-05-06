import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantDocument = Tenant & Document;

@Schema()
export class Tenant {
  @Prop({ required: true })
  name: string; // ISP Business Name

  @Prop({ unique: true })
  domain?: string; // Custom domain

  @Prop({ unique: true })
  subdomain?: string; // Subdomain for white-label

  @Prop({ required: true })
  email: string;

  @Prop()
  phone?: string;

  @Prop()
  address?: string;

  @Prop()
  mikrotikHost?: string;

  @Prop()
  mikrotikPort?: number;

  @Prop()
  mikrotikUsername?: string;

  @Prop()
  mikrotikPassword?: string;

  @Prop()
  mikrotikIdentity?: string;

  @Prop()
  mikrotikUseSsl?: boolean;

  @Prop()
  logoUrl?: string; // White-label logo

  @Prop({ type: Object })
  brandColors?: Record<string, string>; // {"primary": "#000000", "secondary": "#ffffff"}

  @Prop()
  businessName?: string; // Display name for captive portal

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

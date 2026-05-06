import * as dotenv from 'dotenv';

// Load environment variables from .env file at project root
dotenv.config();

// Suppress specific deprecation warnings
process.on('warning', (warning) => {
  // Suppress url.parse() deprecation warning from node-radius
  if (warning.name === 'DeprecationWarning' && warning.message.includes('url.parse()')) {
    return;
  }
  // Suppress circular dependency warnings about lineno/filename
  if (warning.message.includes('circular dependency') && 
      (warning.message.includes('lineno') || warning.message.includes('filename'))) {
    return;
  }
  // Log other warnings normally
  console.warn(warning.name, warning.message);
});

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  logger.log('✅ Application initialized');

  // Enable CORS for frontend integration
  app.enableCors({
    origin: [
      'http://localhost:3000', // Next.js default dev port
      'http://localhost:3001', // Alternative dev port
      'http://localhost:3002', // Another common dev port
      'https://splendid-starlink-frontend.onrender.com', // If you deploy frontend to Render
      'https://splendid-starlink.vercel.app', // If you deploy to Vercel
      'https://splendidstarlink.netlify.app', // If you deploy to Netlify
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });
  logger.log('✅ CORS enabled for frontend origins');

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Splendid Starlink - Wi-Fi Hotspot Management API')
    .setDescription(
      `
Complete REST API for managing paid Wi-Fi hotspot access with enterprise-grade features.

**Key Features:**
- 🔐 JWT-based user authentication with role-based access control
- 💳 Payment processing via Fapshi gateway with webhook support
- 📡 MikroTik RouterOS integration for automatic hotspot user creation
- 📊 Real-time connection metrics and analytics
- 🔔 Automated session/payment notifications via SMS/Email
- 📋 Complete billing history and invoice tracking
- 👥 Multi-tenant architecture for scalability
- 🎯 Activity logging for auditing and compliance

**Authentication:**
- Most endpoints require JWT Bearer token authentication
- Obtain token via \`/auth/login\` endpoint
- Include token in Authorization header: \`Bearer <token>\`

**Base URL Examples:**
- Development: \`http://localhost:3000\`
- Production: \`https://api.splendidstarlink.com\`

**Response Format:**
All endpoints return JSON responses with consistent structure:
\`\`\`json
{
  "success": true/false,
  "data": {...},
  "message": "Optional message",
  "error": "Optional error details"
}
\`\`\`
    `,
    )
    .setVersion('1.0.0')
    .setContact(
      'Splendid Starlink Support',
      'https://github.com/SAMJELA-ANGELO/splendid-starlink',
      'support@splendidstarlink.com',
    )
    .setLicense('MIT License', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://api.splendidstarlink.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Enter JWT access token for protected endpoints. Obtain token via /auth/login or /tenant/auth/login',
      },
      'JWT',
    )
    // Auth Endpoints
    .addTag(
      'Auth',
      'User Registration & Authentication\n\n' +
        '**Endpoints:**\n' +
        '- `POST /auth/login` - Login with credentials\n' +
        '- `POST /auth/register` - Create new account\n' +
        '- `POST /auth/silent-login` - Silent authentication\n\n' +
        '**Returns:** JWT token for authenticated requests',
    )
    .addTag(
      'Tenant Auth',
      'Tenant Portal Authentication\n\n' +
        '**Endpoints:**\n' +
        '- `POST /tenant/auth/login` - Tenant portal login\n' +
        '- `POST /tenant/auth/register` - Tenant portal registration\n\n' +
        '**Returns:** JWT token for authenticated tenant portal access',
    )
    // User Management
    .addTag(
      'Users',
      'User Account Management\n\n' +
        '**Endpoints:**\n' +
        '- `POST /users/signup` - User registration\n\n' +
        '**Features:** Account creation with automatic email/password validation',
    )
    // Plans
    .addTag(
      'Plans',
      'Internet Bundle Products\n\n' +
        '**Endpoints:**\n' +
        '- `GET /plans` - List all available plans\n' +
        '- `GET /plans/:id` - Get plan details\n' +
        '- `POST /plans` - Create plan (Admin)\n' +
        '- `PUT /plans/:id` - Update plan (Admin)\n' +
        '- `DELETE /plans/:id` - Delete plan (Admin)\n\n' +
        '**Fields:** name, price (CFA), duration (hours)',
    )
    // Payments
    .addTag(
      'Payments',
      'Payment Processing & Orders\n\n' +
        '**Endpoints:**\n' +
        '- `POST /payments/initiate` - Start payment for plan purchase\n' +
        '- `GET /payments/status/:transactionId` - Check payment status\n' +
        '- `GET /payments/history` - Get user purchase history\n' +
        '- `POST /payments/webhook` - Fapshi webhook (automatic)\n\n' +
        '**Integrations:** Fapshi payment gateway with M-Pesa/MTN mobile money',
    )
    // Billing
    .addTag(
      'Billing',
      'Invoices & Financial Records\n\n' +
        '**Endpoints:**\n' +
        '- `GET /user/billing` - Get invoice history\n' +
        '- `GET /user/billing/stats` - Get spending statistics\n\n' +
        '**Includes:** All transactions, amounts, dates, payment methods',
    )
    // Sessions
    .addTag(
      'Sessions',
      'Active Connection Sessions\n\n' +
        '**Endpoints:**\n' +
        '- `GET /sessions/current` - Get current session details\n' +
        '- `GET /sessions/status` - Get session status\n\n' +
        '**Tracks:** Session duration, data usage, expiry countdown',
    )
    // Activities
    .addTag(
      'Activities',
      'User Action History & Audit Log\n\n' +
        '**Endpoints:**\n' +
        '- `GET /activities/recent` - Recent user activities (paginated)\n' +
        '- `GET /activities/stats` - Current month statistics\n' +
        '- `GET /activities/by-category` - Filter by category\n\n' +
        '**Categories:** payment, session, connection, account, system',
    )
    // Metrics
    .addTag(
      'Metrics',
      'Connection Performance Analytics\n\n' +
        '**Endpoints:**\n' +
        '- `GET /connection/metrics` - Current speed/latency\n' +
        '- `GET /connection/metrics/history` - Historical data\n\n' +
        '**Metrics:** Download/upload speed (Mbps), latency (ms), signal strength (%)',
    )
    // MikroTik Management
    .addTag(
      'MikroTik',
      'RouterOS Hotspot User Management (Admin Only)\n\n' +
        '**Endpoints:**\n' +
        '- `GET /mikrotik/test-connection` - Test router connection\n' +
        '- `GET /mikrotik/users` - List all hotspot users\n' +
        '- `GET /mikrotik/users/:username` - Get user details\n' +
        '- `GET /mikrotik/active-users` - Get connected users\n' +
        '- `POST /mikrotik/activate` - Activate user\n' +
        '- `POST /mikrotik/disable` - Disable user\n' +
        '- `DELETE /mikrotik/delete` - Remove user\n\n' +
        '**Features:** Automatic creation on payment, MAC binding, expiry management',
    )
    // Notifications
    .addTag(
      'Notifications',
      'Alerts & Notification System\n\n' +
        '**Endpoints:**\n' +
        '- `POST /notifications/check-session` - Trigger session warnings\n' +
        '- `POST /notifications/check-payments` - Trigger payment alerts\n' +
        '- `POST /notifications/reset-session-flags/:userId` - Reset flags (testing)\n' +
        '- `POST /notifications/reset-payment-flags/:paymentId` - Reset flags (testing)\n\n' +
        '**Features:** Automatic SMS/Email on session expiry, payment status updates',
    )
    // Tenants
    .addTag(
      'Tenants',
      'Multi-Tenant Organization Management\n\n' +
        '**Endpoints:**\n' +
        '- `GET /tenants` - List active tenants\n' +
        '- `GET /tenants/:id` - Get tenant details\n' +
        '- `POST /tenants` - Create tenant\n' +
        '- `PUT /tenants/:id` - Update tenant\n\n' +
        '**Use:** For SaaS/white-label deployments',
    )
    // Health Check
    .addTag(
      'Health',
      'Service Status & Monitoring\n\n' +
        '**Endpoints:**\n' +
        '- `GET /health` - Quick health check\n' +
        '- `GET /health/ping` - Ping response\n' +
        '- `GET /health/detailed` - Full dependency status\n\n' +
        '**Checks:** API status, database connection, MikroTik, Fapshi gateway',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  logger.log('✅ Swagger documentation available at /docs');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`🚀 Server running on http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/docs`);
}

bootstrap().catch(console.error);

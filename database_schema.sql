-- Multi-Tenant Data Model for XenFi-like SaaS Platform
-- PostgreSQL Schema (Migration from MongoDB)

-- Core Tenant Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL, -- ISP Business Name
    domain VARCHAR(255) UNIQUE, -- Custom domain (e.g., isp1.splendidstarlink.com)
    subdomain VARCHAR(100) UNIQUE, -- Subdomain for white-label
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    logo_url VARCHAR(500), -- White-label logo
    brand_colors JSONB, -- {"primary": "#000000", "secondary": "#ffffff"}
    business_name VARCHAR(255), -- Display name for captive portal
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table (Multi-tenant)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin', 'agent'
    is_active BOOLEAN DEFAULT false,
    session_expiry TIMESTAMP WITH TIME ZONE,
    mikrotik_created BOOLEAN DEFAULT false,
    mac_address VARCHAR(17),
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, username)
);

-- Plans Table (Multi-tenant)
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL, -- in CFA
    duration INTEGER NOT NULL, -- in hours
    data_limit BIGINT, -- in bytes, optional
    speed_limit INTEGER, -- in Mbps, optional
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments Table (Multi-tenant)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'created', -- 'created', 'pending', 'SUCCESSFUL', 'FAILED', 'EXPIRED'
    fapshi_transaction_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    external_id VARCHAR(255),
    fapshi_response JSONB,
    is_gift BOOLEAN DEFAULT false,
    recipient_username VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notification_initiated_sent TIMESTAMP WITH TIME ZONE,
    notification_success_sent TIMESTAMP WITH TIME ZONE,
    notification_failed_sent TIMESTAMP WITH TIME ZONE
);

-- Routers Table (Multi-tenant) - For future expansion
CREATE TABLE routers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    identity VARCHAR(255), -- MikroTik identity
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions Table (Multi-tenant)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    router_id UUID REFERENCES routers(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    data_used BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    remaining_time INTEGER DEFAULT 0,
    mac_address VARCHAR(17),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities Table (Multi-tenant)
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'success',
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    router_identity VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- White-label Settings Table (Optional - can be part of tenants)
CREATE TABLE white_label_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    portal_title VARCHAR(255) DEFAULT 'WiFi Login',
    portal_description TEXT,
    login_background_url VARCHAR(500),
    success_message TEXT DEFAULT 'Connected successfully!',
    footer_text TEXT,
    custom_css TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_tenant_username ON users(tenant_id, username);
CREATE INDEX idx_plans_tenant ON plans(tenant_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX idx_activities_tenant ON activities(tenant_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_sessions_active ON sessions(is_active) WHERE is_active = true;
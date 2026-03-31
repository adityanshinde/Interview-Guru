-- Migration: Initialize users and audit tables for InterviewGuru
-- Created: 2024
-- Description: Creates tables for user accounts, quotas, and audit logging

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (primary quota storage)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) UNIQUE NOT NULL,  -- Clerk user ID (e.g., "user_XXXXX")
  email VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',  -- 'free', 'basic', 'pro', 'enterprise'
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'trial',  -- 'trial', 'active', 'expired', 'cancelled'
  
  -- Monthly quotas (reset each month)
  current_month VARCHAR(7) NOT NULL,  -- Format: "2024-03"
  voice_minutes_used INTEGER NOT NULL DEFAULT 0,
  chat_messages_used INTEGER NOT NULL DEFAULT 0,
  sessions_used INTEGER NOT NULL DEFAULT 0,
  
  -- Trial tracking
  trial_start_date TIMESTAMP,
  trials_used BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Admin fields
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Stripe/payment fields (future)
  stripe_customer_id VARCHAR(255)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at DESC);

-- Session records table (audit trail)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  
  start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP,
  
  questions_asked INTEGER DEFAULT 0,
  voice_minutes_used INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active',  -- 'active', 'completed', 'abandoned'
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time DESC);

-- Audit log table (for tracking quota changes, upgrades, etc.)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  action VARCHAR(100) NOT NULL,  -- e.g., 'quota_update', 'plan_upgrade', 'trial_reset'
  details JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Helper function: auto-update timestamp on users table
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-update timestamp
DROP TRIGGER IF EXISTS trigger_update_users_timestamp ON users;
CREATE TRIGGER trigger_update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_timestamp();

-- Helpful views
CREATE OR REPLACE VIEW user_quotas AS
SELECT
  user_id,
  email,
  plan,
  subscription_status,
  current_month,
  voice_minutes_used,
  chat_messages_used,
  sessions_used,
  last_active_at
FROM users
ORDER BY last_active_at DESC;

CREATE OR REPLACE VIEW active_sessions AS
SELECT
  s.session_id,
  s.user_id,
  u.email,
  s.start_time,
  s.questions_asked,
  s.voice_minutes_used,
  CURRENT_TIMESTAMP - s.start_time AS duration
FROM sessions s
JOIN users u ON s.user_id = u.user_id
WHERE s.status = 'active'
ORDER BY s.start_time DESC;

-- Grant permissions (for read-only operations, if needed in future)
-- GRANT SELECT ON users TO readonly_user;
-- GRANT SELECT ON sessions TO readonly_user;
-- GRANT SELECT ON audit_logs TO readonly_user;

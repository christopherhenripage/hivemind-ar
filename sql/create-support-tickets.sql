-- HiveMind AR - Support Tickets System
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CREATE SUPPORT TICKETS TABLE
-- =====================================================

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Ticket info
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'general', -- 'general', 'billing', 'technical', 'account', 'feature_request'
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'

    -- Contact info (in case user not logged in or for reference)
    contact_email TEXT,
    contact_name TEXT,

    -- Admin handling
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can create tickets
CREATE POLICY "Users can create support tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (true);

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
    ON support_tickets FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own open tickets
CREATE POLICY "Users can update own open tickets"
    ON support_tickets FOR UPDATE
    USING (user_id = auth.uid() AND status = 'open');

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
    ON support_tickets FOR SELECT
    USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE));

-- Admins can update all tickets
CREATE POLICY "Admins can update all tickets"
    ON support_tickets FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE));

-- =====================================================
-- 4. AUTO-UPDATE TIMESTAMP TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_timestamp();

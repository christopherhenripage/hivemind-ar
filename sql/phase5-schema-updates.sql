-- HiveMind AR Phase 5 Schema Updates
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. UPDATE SUBSCRIPTION PLANS (Basic/Pro/Studio)
-- =====================================================

-- First, update existing plans or insert new ones
-- Basic Plan: 10 artworks, $19.99/month
UPDATE subscription_plans
SET name = 'Basic', artwork_limit = 10, price_monthly = 19.99, features = '["10 artworks", "AR viewing", "Basic analytics", "Email support"]'
WHERE slug = 'basic';

-- Pro Plan: 30 artworks, $29.99/month
UPDATE subscription_plans
SET name = 'Pro', artwork_limit = 30, price_monthly = 29.99, features = '["30 artworks", "AR viewing", "Full analytics", "Priority support", "Custom gallery branding"]'
WHERE slug = 'pro';

-- Rename Unlimited to Studio: 100 artworks, $49.99/month
UPDATE subscription_plans
SET name = 'Studio', slug = 'studio', artwork_limit = 100, price_monthly = 49.99, features = '["100 artworks", "AR viewing", "Full analytics", "Priority support", "Custom gallery branding", "API access"]'
WHERE slug = 'unlimited' OR slug = 'studio';

-- Ensure Free plan exists
INSERT INTO subscription_plans (name, slug, price_monthly, artwork_limit, features, is_active)
VALUES ('Free', 'free', 0, 3, '["3 artworks", "AR viewing", "Basic gallery"]', true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 2. ADD PAYPAL COLUMNS TO SUBSCRIPTIONS TABLE
-- =====================================================

-- Add PayPal subscription ID column
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

-- Add PayPal plan ID column (maps to our plan)
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS paypal_plan_id TEXT;

-- Add subscription period dates
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Add cancellation tracking
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Create index for PayPal ID lookups (for webhook processing)
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_id
ON subscriptions(paypal_subscription_id);

-- =====================================================
-- 3. CREATE MESSAGES TABLE (Collector Inquiries)
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Artists can view their own messages
CREATE POLICY "Artists can view own messages" ON messages
    FOR SELECT USING (artist_id = auth.uid());

-- Artists can update their own messages (mark as read)
CREATE POLICY "Artists can update own messages" ON messages
    FOR UPDATE USING (artist_id = auth.uid());

-- Anyone can insert messages (for collector contact forms)
CREATE POLICY "Anyone can send messages" ON messages
    FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_artist ON messages(artist_id);
CREATE INDEX IF NOT EXISTS idx_messages_artwork ON messages(artwork_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- =====================================================
-- 4. CREATE SUPPORT TICKETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_email TEXT,
    user_name TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
    FOR SELECT USING (user_id = auth.uid());

-- Users can create tickets
CREATE POLICY "Users can create tickets" ON support_tickets
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);

-- =====================================================
-- 5. CREATE PAYMENT HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    paypal_transaction_id TEXT,
    paypal_subscription_id TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_type TEXT CHECK (payment_type IN ('subscription', 'one_time', 'refund')),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment history
CREATE POLICY "Users can view own payments" ON payment_history
    FOR SELECT USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_paypal_tx ON payment_history(paypal_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created ON payment_history(created_at DESC);

-- =====================================================
-- 6. ADD ADMIN POLICIES (for admin dashboard access)
-- =====================================================

-- Check if user is admin (you'll need to add is_admin column to profiles)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Admin can view all messages
CREATE POLICY "Admins can view all messages" ON messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Admin can view all support tickets
CREATE POLICY "Admins can view all tickets" ON support_tickets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Admin can view all payment history
CREATE POLICY "Admins can view all payments" ON payment_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Admin can update subscriptions
CREATE POLICY "Admins can manage subscriptions" ON subscriptions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- =====================================================
-- 7. HELPER FUNCTION: Update timestamp trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to messages
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply to support_tickets
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. SET YOUR ADMIN USER
-- =====================================================

-- Replace 'your-email@example.com' with your actual admin email
-- UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';

-- Or by user ID:
-- UPDATE profiles SET is_admin = true WHERE id = 'your-user-uuid-here';

-- =====================================================
-- VERIFICATION QUERIES (run these to check setup)
-- =====================================================

-- Check subscription plans
-- SELECT * FROM subscription_plans ORDER BY price_monthly;

-- Check table structures
-- \d messages
-- \d support_tickets
-- \d payment_history

-- Check policies
-- SELECT * FROM pg_policies WHERE tablename IN ('messages', 'support_tickets', 'payment_history');

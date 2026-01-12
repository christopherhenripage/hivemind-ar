-- HiveMind AR - New Subscription Model
-- Run this in Supabase SQL Editor
-- This replaces the 4-tier model with a simpler 3-tier model

-- =====================================================
-- 1. ADD NEW COLUMNS TO SUBSCRIPTION_PLANS
-- =====================================================

-- Add columns for feature flags
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS show_branding BOOLEAN DEFAULT TRUE;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS custom_url BOOLEAN DEFAULT FALSE;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS social_links BOOLEAN DEFAULT FALSE;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS basic_analytics BOOLEAN DEFAULT TRUE;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS full_analytics BOOLEAN DEFAULT FALSE;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS priority_support BOOLEAN DEFAULT FALSE;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS featured_listing BOOLEAN DEFAULT FALSE;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS custom_domain BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 2. UPDATE/INSERT NEW SUBSCRIPTION PLANS
-- =====================================================

-- First, deactivate old plans we're replacing
UPDATE subscription_plans SET is_active = FALSE WHERE slug IN ('basic', 'pro', 'studio', 'unlimited');

-- FREE TIER: 5 artworks, HiveMind branding, basic features
UPDATE subscription_plans
SET
    name = 'Free',
    artwork_limit = 5,
    price_monthly = 0,
    features = '["5 artworks", "AR viewing for collectors", "Basic gallery page", "View count analytics", "Community support"]',
    show_branding = TRUE,
    custom_url = FALSE,
    social_links = FALSE,
    basic_analytics = TRUE,
    full_analytics = FALSE,
    priority_support = FALSE,
    featured_listing = FALSE,
    custom_domain = FALSE,
    is_active = TRUE
WHERE slug = 'free';

-- If free doesn't exist, insert it
INSERT INTO subscription_plans (name, slug, price_monthly, artwork_limit, features, is_active, show_branding, custom_url, social_links, basic_analytics, full_analytics, priority_support, featured_listing, custom_domain)
SELECT 'Free', 'free', 0, 5,
    '["5 artworks", "AR viewing for collectors", "Basic gallery page", "View count analytics", "Community support"]',
    TRUE, TRUE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE slug = 'free');

-- ARTIST TIER: $12/month, 25 artworks, no branding, social links, basic analytics
INSERT INTO subscription_plans (name, slug, price_monthly, artwork_limit, features, is_active, show_branding, custom_url, social_links, basic_analytics, full_analytics, priority_support, featured_listing, custom_domain)
VALUES (
    'Artist',
    'artist',
    12.00,
    25,
    '["25 artworks", "AR viewing for collectors", "Custom gallery URL", "Remove HiveMind branding", "Social media links", "Views + AR activation analytics", "Email support"]',
    TRUE,
    FALSE,  -- no branding
    TRUE,   -- custom URL
    TRUE,   -- social links
    TRUE,   -- basic analytics
    FALSE,  -- no full analytics
    FALSE,  -- no priority support
    FALSE,  -- no featured listing
    FALSE   -- no custom domain
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    artwork_limit = EXCLUDED.artwork_limit,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    show_branding = EXCLUDED.show_branding,
    custom_url = EXCLUDED.custom_url,
    social_links = EXCLUDED.social_links,
    basic_analytics = EXCLUDED.basic_analytics,
    full_analytics = EXCLUDED.full_analytics,
    priority_support = EXCLUDED.priority_support,
    featured_listing = EXCLUDED.featured_listing,
    custom_domain = EXCLUDED.custom_domain;

-- PROFESSIONAL TIER: $29/month, unlimited artworks, all features
INSERT INTO subscription_plans (name, slug, price_monthly, artwork_limit, features, is_active, show_branding, custom_url, social_links, basic_analytics, full_analytics, priority_support, featured_listing, custom_domain)
VALUES (
    'Professional',
    'professional',
    29.00,
    9999,  -- effectively unlimited
    '["Unlimited artworks", "AR viewing for collectors", "Custom gallery URL", "Remove HiveMind branding", "Social media links", "Full analytics (location, engagement)", "Priority support", "Featured artist listing", "Custom domain support"]',
    TRUE,
    FALSE,  -- no branding
    TRUE,   -- custom URL
    TRUE,   -- social links
    TRUE,   -- basic analytics
    TRUE,   -- full analytics
    TRUE,   -- priority support
    TRUE,   -- featured listing
    TRUE    -- custom domain
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    artwork_limit = EXCLUDED.artwork_limit,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    show_branding = EXCLUDED.show_branding,
    custom_url = EXCLUDED.custom_url,
    social_links = EXCLUDED.social_links,
    basic_analytics = EXCLUDED.basic_analytics,
    full_analytics = EXCLUDED.full_analytics,
    priority_support = EXCLUDED.priority_support,
    featured_listing = EXCLUDED.featured_listing,
    custom_domain = EXCLUDED.custom_domain;

-- =====================================================
-- 3. MIGRATE EXISTING USERS TO NEW PLANS
-- =====================================================

-- Users on old 'basic' plan -> 'artist' plan
UPDATE subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE slug = 'artist')
WHERE plan_id IN (SELECT id FROM subscription_plans WHERE slug = 'basic' AND is_active = FALSE);

-- Users on old 'pro' or 'studio' plan -> 'professional' plan
UPDATE subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE slug = 'professional')
WHERE plan_id IN (SELECT id FROM subscription_plans WHERE slug IN ('pro', 'studio', 'unlimited') AND is_active = FALSE);

-- =====================================================
-- 4. ADD AR ACTIVATION TRACKING
-- =====================================================

-- Add column to track AR activations (when user taps "View in AR")
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS ar_view_count INTEGER DEFAULT 0;

-- Create table for detailed AR view tracking
CREATE TABLE IF NOT EXISTS ar_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    viewer_ip TEXT,
    viewer_country TEXT,
    viewer_city TEXT,
    user_agent TEXT,
    session_duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ar_views ENABLE ROW LEVEL SECURITY;

-- Anyone can record AR views
CREATE POLICY "Anyone can record AR views" ON ar_views
    FOR INSERT WITH CHECK (true);

-- Artists can view their AR stats
CREATE POLICY "Artists can view own AR stats" ON ar_views
    FOR SELECT USING (
        artwork_id IN (
            SELECT id FROM artworks WHERE user_id = auth.uid()
        )
    );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ar_views_artwork ON ar_views(artwork_id);
CREATE INDEX IF NOT EXISTS idx_ar_views_created ON ar_views(created_at DESC);

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- View the new subscription plans
-- SELECT name, slug, price_monthly, artwork_limit, show_branding, social_links, full_analytics, featured_listing FROM subscription_plans WHERE is_active = TRUE ORDER BY price_monthly;

-- Check user migrations
-- SELECT s.*, sp.name as plan_name FROM subscriptions s JOIN subscription_plans sp ON s.plan_id = sp.id;

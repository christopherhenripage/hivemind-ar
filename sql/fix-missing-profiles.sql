-- Fix Missing Profiles
-- Run this in Supabase SQL Editor to fix users who signed up before the trigger was fixed
-- This creates profiles and subscriptions for any users who are missing them

-- =====================================================
-- 1. ENSURE FREE PLAN EXISTS
-- =====================================================

INSERT INTO subscription_plans (name, slug, price_monthly, artwork_limit, features, is_active)
VALUES (
    'Free',
    'free',
    0,
    5,
    '["5 artworks", "AR viewing for collectors", "Basic gallery page", "View count analytics", "Community support"]',
    TRUE
)
ON CONFLICT (slug) DO UPDATE SET
    is_active = TRUE,
    artwork_limit = 5;

-- =====================================================
-- 2. CREATE MISSING PROFILES
-- =====================================================

-- Create profiles for users who don't have one
INSERT INTO profiles (id, email, full_name, created_at)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    COALESCE(au.created_at, NOW())
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- =====================================================
-- 3. CREATE MISSING SUBSCRIPTIONS
-- =====================================================

-- Get the free plan ID
DO $$
DECLARE
    free_plan_id UUID;
BEGIN
    SELECT id INTO free_plan_id FROM subscription_plans WHERE slug = 'free' LIMIT 1;

    -- Create subscriptions for users who don't have one
    INSERT INTO subscriptions (user_id, plan_id, status, created_at)
    SELECT
        au.id,
        free_plan_id,
        'active',
        COALESCE(au.created_at, NOW())
    FROM auth.users au
    LEFT JOIN subscriptions s ON au.id = s.user_id
    WHERE s.user_id IS NULL;
END $$;

-- =====================================================
-- 4. VERIFY RESULTS
-- =====================================================

-- Show all users and their profile/subscription status
SELECT
    au.email,
    p.id IS NOT NULL AS has_profile,
    s.id IS NOT NULL AS has_subscription,
    sp.name AS plan_name,
    sp.artwork_limit
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN subscriptions s ON au.id = s.user_id
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
ORDER BY au.created_at DESC;

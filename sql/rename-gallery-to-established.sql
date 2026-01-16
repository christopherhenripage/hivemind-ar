-- HiveMind AR - Rename Gallery Tier to Established
-- Run this in Supabase SQL Editor
-- Renames the individual "Gallery" tier to "Established" to avoid confusion
-- with future gallery business accounts

-- =====================================================
-- RENAME GALLERY TO ESTABLISHED
-- =====================================================

UPDATE subscription_plans
SET
    name = 'Established',
    slug = 'established',
    features = '["25 artworks", "AR viewing for collectors", "Custom gallery URL", "Remove HiveMind branding", "Social media links", "Full analytics (views, AR, location)", "Email support"]'
WHERE slug = 'gallery';

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
    name,
    slug,
    price_monthly,
    artwork_limit
FROM subscription_plans
WHERE is_active = TRUE
ORDER BY price_monthly;

-- Expected output:
-- Free        | free        | 0   | 3
-- Artist      | artist      | 12  | 10
-- Established | established | 19  | 25
-- Professional| professional| 29  | 75

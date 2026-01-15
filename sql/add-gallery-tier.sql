-- HiveMind AR - Add Gallery Tier
-- Run this in Supabase SQL Editor
-- Adds a new "Gallery" tier between Artist ($12) and Professional ($29)

-- =====================================================
-- ADD GALLERY TIER: $19/month, 50 artworks
-- =====================================================

INSERT INTO subscription_plans (
    name,
    slug,
    price_monthly,
    artwork_limit,
    features,
    is_active,
    show_branding,
    custom_url,
    social_links,
    basic_analytics,
    full_analytics,
    priority_support,
    featured_listing,
    custom_domain
)
VALUES (
    'Gallery',
    'gallery',
    19.00,
    50,
    '["50 artworks", "AR viewing for collectors", "Custom gallery URL", "Remove HiveMind branding", "Social media links", "Full analytics (views, AR, location)", "Email support"]',
    TRUE,
    FALSE,  -- no branding (removed)
    TRUE,   -- custom URL
    TRUE,   -- social links
    TRUE,   -- basic analytics
    TRUE,   -- full analytics (upgrade from Artist)
    FALSE,  -- no priority support (that's Professional)
    FALSE,  -- no featured listing (that's Professional)
    FALSE   -- no custom domain (that's Professional)
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
-- VERIFICATION
-- =====================================================

-- View all active plans ordered by price
SELECT
    name,
    slug,
    price_monthly,
    artwork_limit,
    show_branding,
    full_analytics,
    priority_support
FROM subscription_plans
WHERE is_active = TRUE
ORDER BY price_monthly;

-- Expected output:
-- Free        | free         | 0     | 5     | true  | false | false
-- Artist      | artist       | 12    | 25    | false | false | false
-- Gallery     | gallery      | 19    | 50    | false | true  | false
-- Professional| professional | 29    | 9999  | false | true  | true

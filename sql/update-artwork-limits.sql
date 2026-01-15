-- HiveMind AR - Update Artwork Limits
-- Run this in Supabase SQL Editor
-- More conservative limits to manage storage costs and create clear upgrade paths

-- =====================================================
-- UPDATE ALL ARTWORK LIMITS
-- =====================================================

-- Free: 5 -> 3 artworks
UPDATE subscription_plans
SET artwork_limit = 3
WHERE slug = 'free';

-- Artist: 25 -> 10 artworks
UPDATE subscription_plans
SET artwork_limit = 10
WHERE slug = 'artist';

-- Gallery: 50 -> 25 artworks
UPDATE subscription_plans
SET artwork_limit = 25
WHERE slug = 'gallery';

-- Professional: 9999 -> 75 artworks
UPDATE subscription_plans
SET artwork_limit = 75
WHERE slug = 'professional';

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
-- Free         | free         | 0   | 3
-- Artist       | artist       | 12  | 10
-- Gallery      | gallery      | 19  | 25
-- Professional | professional | 29  | 75

-- HiveMind AR - Gallery Accounts Schema
-- DO NOT RUN YET - This is a planned feature for v2
-- Adds support for gallery businesses managing multiple artists

-- =====================================================
-- 1. ADD ACCOUNT TYPE TO PROFILES
-- =====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual';
-- Values: 'individual' | 'gallery'

COMMENT ON COLUMN profiles.account_type IS 'Whether this is an individual artist or a gallery business account';


-- =====================================================
-- 2. GALLERIES TABLE (for gallery business accounts)
-- =====================================================

CREATE TABLE IF NOT EXISTS galleries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Gallery business info
    name TEXT NOT NULL,                    -- "Riverside Gallery"
    slug TEXT UNIQUE NOT NULL,             -- "riverside-gallery" (for URLs)
    description TEXT,
    logo_url TEXT,
    website TEXT,

    -- Location
    city TEXT,
    country TEXT,

    -- Settings
    is_public BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE galleries IS 'Gallery businesses that represent multiple artists';


-- =====================================================
-- 3. ARTIST PROFILES (artists represented by galleries)
-- =====================================================

CREATE TABLE IF NOT EXISTS artist_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gallery_id UUID REFERENCES galleries(id) ON DELETE CASCADE,

    -- Artist info
    name TEXT NOT NULL,                    -- "Jane Smith"
    slug TEXT NOT NULL,                    -- "jane-smith" (for URLs)
    bio TEXT,
    headshot_url TEXT,

    -- Optional: link to real user account (if artist also has own account)
    linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Social/contact
    website TEXT,
    instagram TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,        -- Gallery can "archive" artists

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each artist slug must be unique within a gallery
    UNIQUE(gallery_id, slug)
);

COMMENT ON TABLE artist_profiles IS 'Artists represented by a gallery business';


-- =====================================================
-- 4. UPDATE ARTWORKS TABLE
-- =====================================================

-- Add optional link to artist profile (for gallery-managed works)
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS artist_profile_id UUID REFERENCES artist_profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN artworks.artist_profile_id IS 'For gallery accounts: which artist this artwork belongs to';

-- Artworks now belong to either:
-- A) user_id only (individual artist account)
-- B) user_id + artist_profile_id (gallery account, specific artist)


-- =====================================================
-- 5. GALLERY-SPECIFIC SUBSCRIPTION PLANS
-- =====================================================

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'individual';
-- Values: 'individual' | 'gallery'

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS artist_profile_limit INTEGER DEFAULT 1;
-- How many artist profiles a gallery plan allows

COMMENT ON COLUMN subscription_plans.plan_type IS 'Whether this plan is for individuals or gallery businesses';
COMMENT ON COLUMN subscription_plans.artist_profile_limit IS 'Max artist profiles allowed (galleries only)';


-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_galleries_owner ON galleries(owner_id);
CREATE INDEX IF NOT EXISTS idx_galleries_slug ON galleries(slug);
CREATE INDEX IF NOT EXISTS idx_artist_profiles_gallery ON artist_profiles(gallery_id);
CREATE INDEX IF NOT EXISTS idx_artist_profiles_slug ON artist_profiles(gallery_id, slug);
CREATE INDEX IF NOT EXISTS idx_artworks_artist_profile ON artworks(artist_profile_id);


-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Galleries: owner can do everything, public can view if is_public
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their gallery"
    ON galleries FOR ALL
    USING (owner_id = auth.uid());

CREATE POLICY "Public can view public galleries"
    ON galleries FOR SELECT
    USING (is_public = true);

-- Artist profiles: gallery owner can manage, public can view
ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery owners can manage artist profiles"
    ON artist_profiles FOR ALL
    USING (gallery_id IN (
        SELECT id FROM galleries WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Public can view active artist profiles"
    ON artist_profiles FOR SELECT
    USING (is_active = true);


-- =====================================================
-- 8. ADD GALLERY SUBSCRIPTION PLANS
-- =====================================================

-- Gallery tier: $49/month, 100 artworks, 5 artist profiles
INSERT INTO subscription_plans (
    name,
    slug,
    plan_type,
    price_monthly,
    artwork_limit,
    artist_profile_limit,
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
    'gallery-business',
    'gallery',
    49.00,
    100,
    5,
    '["100 artworks total", "5 artist profiles", "Individual artist pages", "Gallery branding", "Full analytics", "Priority support"]',
    TRUE,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    FALSE
)
ON CONFLICT (slug) DO NOTHING;

-- Gallery Pro tier: $99/month, 300 artworks, 15 artist profiles
INSERT INTO subscription_plans (
    name,
    slug,
    plan_type,
    price_monthly,
    artwork_limit,
    artist_profile_limit,
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
    'Gallery Pro',
    'gallery-pro',
    'gallery',
    99.00,
    300,
    15,
    '["300 artworks total", "15 artist profiles", "Individual artist pages", "Gallery branding", "Full analytics", "Priority support", "Featured listing", "Custom domain"]',
    TRUE,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- Update existing individual plans to have plan_type = 'individual'
UPDATE subscription_plans
SET plan_type = 'individual', artist_profile_limit = 1
WHERE slug IN ('free', 'artist', 'established', 'professional');

-- Note: The individual 'gallery' plan was renamed to 'established' to avoid
-- confusion with gallery business accounts.


-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
    name,
    slug,
    plan_type,
    price_monthly,
    artwork_limit,
    artist_profile_limit
FROM subscription_plans
WHERE is_active = TRUE
ORDER BY plan_type, price_monthly;

-- Expected output:
-- Gallery Business Plans:
-- Gallery      | gallery-business | gallery    | 49  | 100 | 5
-- Gallery Pro  | gallery-pro      | gallery    | 99  | 300 | 15
--
-- Individual Plans:
-- Free         | free            | individual | 0   | 3   | 1
-- Artist       | artist          | individual | 12  | 10  | 1
-- Established  | established     | individual | 19  | 25  | 1
-- Professional | professional    | individual | 29  | 75  | 1


-- =====================================================
-- URL STRUCTURE (for reference)
-- =====================================================
--
-- Individual artists:
--   hivemind.ar/artist/{username}
--   hivemind.ar/artist/{username}/{artwork-slug}
--
-- Gallery accounts:
--   hivemind.ar/gallery/{gallery-slug}
--   hivemind.ar/gallery/{gallery-slug}/{artist-slug}
--   hivemind.ar/gallery/{gallery-slug}/{artist-slug}/{artwork-slug}

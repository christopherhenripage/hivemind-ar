-- HiveMind AR - Add Analytics Fields
-- Run these in Supabase SQL Editor

-- =====================================================
-- 1. DROP EXISTING TABLE (if recreating)
-- =====================================================
-- DROP TABLE IF EXISTS gallery_analytics CASCADE;


-- =====================================================
-- 2. CREATE GALLERY ANALYTICS TABLE
-- =====================================================

CREATE TABLE gallery_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    visitor_id TEXT,
    country_code CHAR(2),
    country TEXT,
    city TEXT,
    device_type TEXT,
    browser TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================
-- 3. INDEXES
-- =====================================================

CREATE INDEX idx_gallery_analytics_profile ON gallery_analytics(profile_id);
CREATE INDEX idx_gallery_analytics_event ON gallery_analytics(event_type);
CREATE INDEX idx_gallery_analytics_created ON gallery_analytics(created_at);


-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

ALTER TABLE gallery_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics"
    ON gallery_analytics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Artists can view own analytics"
    ON gallery_analytics FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all analytics"
    ON gallery_analytics FOR SELECT
    USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE));


-- =====================================================
-- 5. ADD COUNTRY TO PROFILES
-- =====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code CHAR(2);

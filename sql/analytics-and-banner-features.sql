-- Analytics and Banner Features Migration
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. NEW PROFILE COLUMNS FOR BANNER FEATURES
-- =====================================================

-- Banner position (X and Y for 2D positioning)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_position_x INTEGER DEFAULT 50;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_position_y INTEGER DEFAULT 50;

-- Banner zoom level (50-200%)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_zoom INTEGER DEFAULT 100;

-- Banner effects (Artist+ feature)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_blur INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_darken INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_tint VARCHAR(20) DEFAULT 'none';

-- =====================================================
-- 2. GALLERY ANALYTICS TABLES
-- =====================================================

-- Main analytics events table
CREATE TABLE IF NOT EXISTS gallery_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'page_view', 'artwork_view', 'ar_view', 'inquiry'
    artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,

    -- Visitor info (anonymous)
    session_id VARCHAR(100),
    visitor_fingerprint VARCHAR(100),

    -- Context
    referrer VARCHAR(500),
    user_agent VARCHAR(500),
    device_type VARCHAR(20), -- 'mobile', 'tablet', 'desktop'
    country VARCHAR(100),
    city VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_gallery_analytics_artist_id ON gallery_analytics(artist_id);
CREATE INDEX IF NOT EXISTS idx_gallery_analytics_event_type ON gallery_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_gallery_analytics_created_at ON gallery_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_gallery_analytics_artwork_id ON gallery_analytics(artwork_id);

-- Daily aggregates table (for faster dashboard queries)
CREATE TABLE IF NOT EXISTS gallery_analytics_daily (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Counts
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    artwork_views INTEGER DEFAULT 0,
    ar_views INTEGER DEFAULT 0,
    inquiries INTEGER DEFAULT 0,

    -- Most viewed artwork that day
    top_artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
    top_artwork_views INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(artist_id, date)
);

CREATE INDEX IF NOT EXISTS idx_gallery_analytics_daily_artist_date ON gallery_analytics_daily(artist_id, date);

-- =====================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE gallery_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT analytics (for tracking views)
CREATE POLICY "Anyone can insert analytics" ON gallery_analytics
    FOR INSERT WITH CHECK (true);

-- Artists can only view their own analytics
CREATE POLICY "Artists can view own analytics" ON gallery_analytics
    FOR SELECT USING (artist_id = auth.uid());

-- Artists can only view their own daily aggregates
CREATE POLICY "Artists can view own daily analytics" ON gallery_analytics_daily
    FOR SELECT USING (artist_id = auth.uid());

-- Service role can do everything (for aggregation jobs)
CREATE POLICY "Service role full access analytics" ON gallery_analytics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access daily" ON gallery_analytics_daily
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 4. HELPER FUNCTION: Aggregate daily stats
-- =====================================================

CREATE OR REPLACE FUNCTION aggregate_daily_analytics(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS void AS $$
BEGIN
    INSERT INTO gallery_analytics_daily (artist_id, date, page_views, unique_visitors, artwork_views, ar_views, inquiries)
    SELECT
        artist_id,
        target_date,
        COUNT(*) FILTER (WHERE event_type = 'page_view'),
        COUNT(DISTINCT visitor_fingerprint) FILTER (WHERE event_type = 'page_view'),
        COUNT(*) FILTER (WHERE event_type = 'artwork_view'),
        COUNT(*) FILTER (WHERE event_type = 'ar_view'),
        COUNT(*) FILTER (WHERE event_type = 'inquiry')
    FROM gallery_analytics
    WHERE DATE(created_at) = target_date
    GROUP BY artist_id
    ON CONFLICT (artist_id, date)
    DO UPDATE SET
        page_views = EXCLUDED.page_views,
        unique_visitors = EXCLUDED.unique_visitors,
        artwork_views = EXCLUDED.artwork_views,
        ar_views = EXCLUDED.ar_views,
        inquiries = EXCLUDED.inquiries,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. VIEW FOR CURRENT STATS (real-time)
-- =====================================================

CREATE OR REPLACE VIEW gallery_stats_current AS
SELECT
    artist_id,
    COUNT(*) FILTER (WHERE event_type = 'page_view' AND created_at > NOW() - INTERVAL '30 days') as views_30d,
    COUNT(DISTINCT visitor_fingerprint) FILTER (WHERE event_type = 'page_view' AND created_at > NOW() - INTERVAL '30 days') as unique_visitors_30d,
    COUNT(*) FILTER (WHERE event_type = 'ar_view' AND created_at > NOW() - INTERVAL '30 days') as ar_views_30d,
    COUNT(*) FILTER (WHERE event_type = 'inquiry' AND created_at > NOW() - INTERVAL '30 days') as inquiries_30d,
    COUNT(*) FILTER (WHERE event_type = 'page_view' AND created_at > NOW() - INTERVAL '7 days') as views_7d,
    COUNT(*) FILTER (WHERE event_type = 'page_view' AND created_at > NOW() - INTERVAL '24 hours') as views_24h
FROM gallery_analytics
GROUP BY artist_id;

COMMENT ON TABLE gallery_analytics IS 'Stores individual analytics events for gallery views, artwork views, AR activations, and inquiries';
COMMENT ON TABLE gallery_analytics_daily IS 'Aggregated daily analytics for faster dashboard queries';

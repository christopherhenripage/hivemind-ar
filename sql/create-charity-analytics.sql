-- Charity Gallery Analytics Table
-- Separate from main platform analytics for charity gallery pages
-- Created for: Shannon E Thomas — Queen Freret XIV charity auction gallery

CREATE TABLE IF NOT EXISTS charity_gallery_analytics (
  id BIGSERIAL PRIMARY KEY,
  gallery_id TEXT NOT NULL DEFAULT 'shannon-thomas',
  event_type TEXT NOT NULL,  -- page_view, artwork_view, ar_view, bid_click
  artwork_name TEXT,
  visitor_fingerprint TEXT,
  device_type TEXT,
  browser TEXT,
  referrer TEXT,
  country_code TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX idx_charity_analytics_gallery ON charity_gallery_analytics(gallery_id);
CREATE INDEX idx_charity_analytics_event ON charity_gallery_analytics(event_type);
CREATE INDEX idx_charity_analytics_created ON charity_gallery_analytics(created_at);
CREATE INDEX idx_charity_analytics_artwork ON charity_gallery_analytics(artwork_name);

-- RLS: Allow anonymous inserts (tracking), allow anonymous reads (dashboard uses anon key)
ALTER TABLE charity_gallery_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert" ON charity_gallery_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON charity_gallery_analytics FOR SELECT USING (true);

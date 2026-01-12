-- HiveMind AR Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Artists/Subscribers table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gallery_name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  location VARCHAR(255),
  bio TEXT,
  phone VARCHAR(50),
  website VARCHAR(255),
  avatar_url TEXT,
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, bronze, silver, gold
  max_images INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Artworks/Images table
CREATE TABLE IF NOT EXISTS artworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  creator VARCHAR(255),
  year_created VARCHAR(50),
  medium VARCHAR(255),
  description TEXT,
  copyright VARCHAR(255),
  price_usd DECIMAL(10,2) DEFAULT 0,
  -- Physical dimensions in cm
  width_cm DECIMAL(10,2),
  height_cm DECIMAL(10,2),
  -- Browser display dimensions in px
  width_px INTEGER,
  height_px INTEGER,
  -- Image URLs (stored in Supabase Storage)
  image_url TEXT,
  thumbnail_url TEXT,
  -- AR target file
  ar_target_url TEXT,
  -- Stats
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table (buyer inquiries)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
  from_name VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'unread', -- unread, read, replied
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Artwork views tracking
CREATE TABLE IF NOT EXISTS artwork_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  viewer_ip VARCHAR(50),
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_artists_user_id ON artists(user_id);
CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug);
CREATE INDEX IF NOT EXISTS idx_artworks_artist_id ON artworks(artist_id);
CREATE INDEX IF NOT EXISTS idx_messages_artist_id ON messages(artist_id);
CREATE INDEX IF NOT EXISTS idx_artwork_views_artwork_id ON artwork_views(artwork_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_views ENABLE ROW LEVEL SECURITY;

-- Artists policies
CREATE POLICY "Artists can view their own profile" ON artists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Artists can update their own profile" ON artists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active artist profiles" ON artists
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create artist profile" ON artists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Artworks policies
CREATE POLICY "Artists can manage their own artworks" ON artworks
  FOR ALL USING (
    artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can view active artworks" ON artworks
  FOR SELECT USING (is_active = true);

-- Messages policies
CREATE POLICY "Artists can view their own messages" ON messages
  FOR SELECT USING (
    artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
  );

CREATE POLICY "Artists can update their own messages" ON messages
  FOR UPDATE USING (
    artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can send messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Support tickets policies
CREATE POLICY "Artists can manage their own support tickets" ON support_tickets
  FOR ALL USING (
    artist_id IN (SELECT id FROM artists WHERE user_id = auth.uid())
  );

-- Artwork views policies (anyone can insert, only artist can view their stats)
CREATE POLICY "Anyone can record artwork views" ON artwork_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Artists can view their artwork stats" ON artwork_views
  FOR SELECT USING (
    artwork_id IN (
      SELECT a.id FROM artworks a
      JOIN artists ar ON a.artist_id = ar.id
      WHERE ar.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artworks_updated_at
  BEFORE UPDATE ON artworks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate slug from gallery name
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Function to increment artwork view count
CREATE OR REPLACE FUNCTION increment_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE artworks SET view_count = view_count + 1 WHERE id = NEW.artwork_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_artwork_views
  AFTER INSERT ON artwork_views
  FOR EACH ROW EXECUTE FUNCTION increment_view_count();

-- HiveMind AR - Fix Public Gallery Access
-- Run this IMMEDIATELY in Supabase SQL Editor
-- The admin security update accidentally blocked public gallery viewing

-- =====================================================
-- FIX: Allow public access to view artist profiles
-- =====================================================

-- Add policy for anonymous/public users to view active profiles
-- This is needed for gallery pages to work
CREATE POLICY "Public can view active profiles for galleries"
    ON profiles FOR SELECT
    USING (is_active = TRUE);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test that public can see profiles
SELECT id, gallery_slug, full_name, is_active
FROM profiles
WHERE is_active = TRUE
LIMIT 5;

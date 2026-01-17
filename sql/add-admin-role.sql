-- HiveMind AR - Add Admin Role Security
-- Run this in Supabase SQL Editor
-- Adds is_admin field and RLS policies to protect admin pages

-- =====================================================
-- 1. ADD ADMIN FLAG TO PROFILES
-- =====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.is_admin IS 'Whether this user has admin access';

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;


-- =====================================================
-- 2. SET YOURSELF AS ADMIN
-- =====================================================
-- Replace 'your-email@example.com' with your actual email

UPDATE profiles
SET is_admin = TRUE
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- Or if you know your user ID, use this instead:
-- UPDATE profiles SET is_admin = TRUE WHERE id = 'your-user-uuid-here';


-- =====================================================
-- 3. CREATE ADMIN CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin() IS 'Returns true if the current user is an admin';


-- =====================================================
-- 4. RLS POLICIES FOR ADMIN-ONLY ACCESS
-- =====================================================

-- Profiles: Users can read their own, admins can read all
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

-- Subscriptions: Users can read their own, admins can read all
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;

CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
    ON subscriptions FOR SELECT
    USING (is_admin());

-- Artworks: Users can read their own, admins can read all
DROP POLICY IF EXISTS "Users can view own artworks" ON artworks;
DROP POLICY IF EXISTS "Admins can view all artworks" ON artworks;
DROP POLICY IF EXISTS "Public can view public artworks" ON artworks;

CREATE POLICY "Users can view own artworks"
    ON artworks FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all artworks"
    ON artworks FOR SELECT
    USING (is_admin());

CREATE POLICY "Public can view public artworks"
    ON artworks FOR SELECT
    USING (is_public = TRUE);


-- =====================================================
-- 5. VERIFICATION
-- =====================================================

-- Check that is_admin column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin';

-- List all admins
SELECT id, email, is_admin
FROM profiles
JOIN auth.users ON profiles.id = auth.users.id
WHERE is_admin = TRUE;

-- Test the is_admin function (should return true/false for current user)
-- SELECT is_admin();

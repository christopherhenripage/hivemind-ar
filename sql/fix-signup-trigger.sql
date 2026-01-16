-- Fix Signup Trigger
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- =====================================================
-- 1. ENSURE FREE PLAN EXISTS
-- =====================================================

-- Make sure the free plan exists and is active
INSERT INTO subscription_plans (name, slug, price_monthly, artwork_limit, features, is_active)
VALUES (
    'Free',
    'free',
    0,
    5,
    '["5 artworks", "AR viewing for collectors", "Basic gallery page", "View count analytics", "Community support"]',
    TRUE
)
ON CONFLICT (slug) DO UPDATE SET
    is_active = TRUE,
    artwork_limit = 5;

-- =====================================================
-- 2. CREATE/REPLACE THE SIGNUP TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    -- Get the free plan ID
    SELECT id INTO free_plan_id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;

    -- If no free plan found, create one
    IF free_plan_id IS NULL THEN
        INSERT INTO public.subscription_plans (name, slug, price_monthly, artwork_limit, is_active)
        VALUES ('Free', 'free', 0, 5, TRUE)
        RETURNING id INTO free_plan_id;
    END IF;

    -- Create profile for new user
    INSERT INTO public.profiles (id, email, full_name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create subscription for new user (default to free plan)
    INSERT INTO public.subscriptions (user_id, plan_id, status, created_at)
    VALUES (
        NEW.id,
        free_plan_id,
        'active',
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. CREATE/REPLACE THE TRIGGER
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 4. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Ensure the trigger function can access the tables
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT ALL ON public.subscriptions TO postgres, service_role;
GRANT ALL ON public.subscription_plans TO postgres, service_role;

-- =====================================================
-- 5. VERIFY
-- =====================================================

-- Check if free plan exists
SELECT id, name, slug, is_active FROM subscription_plans WHERE slug = 'free';

-- Check if trigger exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

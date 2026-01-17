// Admin authentication helper
// Used by all admin pages to verify admin access

import { supabase } from './supabase.js';

/**
 * Check if current user is authenticated and has admin privileges
 * Redirects to login if not authenticated, or to subscriber dashboard if not admin
 * @returns {Promise<Object|null>} User object if admin, null otherwise
 */
export async function checkAdminAuth() {
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = '/pages/auth/login.html';
        return null;
    }

    // Check if user has admin role
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error checking admin status:', error);
        window.location.href = '/pages/subscriber/dashboard.html';
        return null;
    }

    if (!profile?.is_admin) {
        // Not an admin - redirect to subscriber dashboard
        console.warn('Access denied: User is not an admin');
        window.location.href = '/pages/subscriber/dashboard.html';
        return null;
    }

    return user;
}

/**
 * Check admin status without redirecting
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isAdmin() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    return profile?.is_admin === true;
}

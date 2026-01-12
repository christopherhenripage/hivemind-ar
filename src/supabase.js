// Supabase Client Module
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation
let supabase = null;
let initError = null;

function validateEnvVars() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Missing environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local';
  }

  if (supabaseUrl.includes('YOURPROJECT') || supabaseUrl.includes('YOUR_PROJECT')) {
    return 'VITE_SUPABASE_URL contains placeholder. Get your project URL from Supabase Dashboard > Settings > API';
  }

  if (supabaseAnonKey === 'YOUR_ANON_KEY' || supabaseAnonKey.includes('YOUR_')) {
    return 'VITE_SUPABASE_ANON_KEY contains placeholder. Get your anon key from Supabase Dashboard > Settings > API';
  }

  // Supabase anon keys are JWTs and must start with "eyJ"
  if (!supabaseAnonKey.startsWith('eyJ')) {
    console.error('[Supabase] Invalid key format. Current key starts with:', supabaseAnonKey.substring(0, 15) + '...');
    return 'Invalid API key format. Supabase anon keys are JWTs starting with "eyJ". ' +
           'Go to Supabase Dashboard > Settings > API and copy the "anon public" key.';
  }

  if (!supabaseUrl.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
    return 'Invalid URL format. Expected https://<project-ref>.supabase.co';
  }

  return null;
}

const validationError = validateEnvVars();
if (validationError) {
  initError = validationError;
  console.error('[Supabase]', initError);
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase] Client initialized with project:', supabaseUrl.replace('https://', '').replace('.supabase.co', ''));
  } catch (err) {
    initError = `Failed to initialize Supabase client: ${err.message}`;
    console.error('[Supabase]', initError);
  }
}

/**
 * Check if Supabase is properly configured and connected
 * @returns {Promise<{connected: boolean, error: string|null}>}
 */
export async function checkConnection() {
  if (initError) {
    return { connected: false, error: initError };
  }

  try {
    // Simple query to verify connection
    const { error } = await supabase.from('leads').select('id').limit(1);
    if (error) {
      let errorMsg = error.message;
      // Provide actionable advice for common errors
      if (error.message.includes('Invalid API key') || error.code === 'PGRST301') {
        errorMsg = 'Invalid API key. The URL and anon key must be from the SAME Supabase project. ' +
                   'Check Supabase Dashboard > Settings > API.';
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        errorMsg = 'Table "leads" not found. Create it in Supabase Dashboard > Table Editor.';
      }
      console.error('[Supabase] Connection test failed:', error.message);
      return { connected: false, error: errorMsg };
    }
    console.log('[Supabase] Connection verified - leads table accessible');
    return { connected: true, error: null };
  } catch (err) {
    console.error('[Supabase] Connection test error:', err.message);
    return { connected: false, error: err.message };
  }
}

/**
 * Get the Supabase client instance
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
export function getClient() {
  return supabase;
}

/**
 * Check if client is initialized
 * @returns {boolean}
 */
export function isInitialized() {
  return supabase !== null;
}

/**
 * Get initialization error if any
 * @returns {string|null}
 */
export function getInitError() {
  return initError;
}

export { supabase };

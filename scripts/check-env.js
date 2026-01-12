#!/usr/bin/env node
/**
 * Supabase Environment Diagnostic Script ("npm run doctor")
 * Checks .env.local, validates format, tests connectivity
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = process.cwd();
const ENV_FILE = resolve(ROOT, '.env.local');
const ENV_SAVE = resolve(ROOT, '.env.local.save');

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║       HiveMind AR - Environment Doctor           ║');
console.log('╚══════════════════════════════════════════════════╝\n');

console.log('Working directory:', ROOT);
let hasErrors = false;

// Step 1: Check .env.local exists
console.log('\n[1/4] Checking .env.local...');
if (!existsSync(ENV_FILE)) {
  if (existsSync(ENV_SAVE)) {
    console.log('  .env.local missing, but .env.local.save exists');
    console.log('  Run: cp .env.local.save .env.local');
  } else {
    console.log('  ERROR: .env.local does not exist');
    console.log('  Create it with:');
    console.log('    VITE_SUPABASE_URL=https://YOUR_REF.supabase.co');
    console.log('    VITE_SUPABASE_ANON_KEY=eyJ...');
  }
  hasErrors = true;
} else {
  console.log('  OK: .env.local exists');
}

if (!existsSync(ENV_FILE)) {
  console.log('\n❌ Cannot continue without .env.local');
  process.exit(1);
}

// Step 2: Parse and validate .env.local
console.log('\n[2/4] Validating environment variables...');
const content = readFileSync(ENV_FILE, 'utf-8');
const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

const env = {};
for (const line of lines) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let value = match[2].trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
}

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

// Validate URL
if (!url) {
  console.log('  ERROR: VITE_SUPABASE_URL not set');
  hasErrors = true;
} else if (url.includes('YOURPROJECT') || url.includes('YOUR_PROJECT')) {
  console.log('  ERROR: VITE_SUPABASE_URL has placeholder value');
  hasErrors = true;
} else if (!url.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
  console.log('  WARNING: URL format unusual:', url);
} else {
  const ref = url.replace('https://', '').replace('.supabase.co', '');
  console.log('  VITE_SUPABASE_URL: OK (project: ' + ref + ')');
}

// Validate Key
if (!key) {
  console.log('  ERROR: VITE_SUPABASE_ANON_KEY not set');
  hasErrors = true;
} else if (key === 'YOUR_ANON_KEY' || key.includes('YOUR_')) {
  console.log('  ERROR: VITE_SUPABASE_ANON_KEY has placeholder value');
  hasErrors = true;
} else if (!key.startsWith('eyJ')) {
  console.log('  ERROR: VITE_SUPABASE_ANON_KEY has invalid format');
  console.log('         Current value starts with: ' + key.substring(0, 20) + '...');
  console.log('         Supabase anon keys are JWTs starting with "eyJ"');
  console.log('');
  console.log('  TO FIX:');
  console.log('    1. Go to: https://supabase.com/dashboard/project/' + (url ? url.replace('https://', '').replace('.supabase.co', '') : 'YOUR_PROJECT') + '/settings/api');
  console.log('    2. Copy the "anon public" key (starts with eyJ...)');
  console.log('    3. Paste it in .env.local as VITE_SUPABASE_ANON_KEY=eyJ...');
  hasErrors = true;
} else {
  console.log('  VITE_SUPABASE_ANON_KEY: OK (starts with eyJ, length: ' + key.length + ')');
}

// Step 3: Test Supabase connection
console.log('\n[3/4] Testing Supabase connectivity...');

if (!hasErrors && url && key) {
  try {
    const response = await fetch(`${url}/rest/v1/leads?select=id&limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('  OK: Connected to Supabase');
      console.log('  OK: leads table accessible (' + data.length + ' rows returned)');
    } else {
      const text = await response.text();
      console.log('  ERROR: API returned status ' + response.status);
      hasErrors = true;

      if (response.status === 401) {
        console.log('         Cause: Invalid API key or URL/key mismatch');
        console.log('         The URL and key MUST be from the same Supabase project');
      } else if (response.status === 404) {
        console.log('         Cause: leads table may not exist');
      }

      try {
        const json = JSON.parse(text);
        if (json.message) console.log('         Message:', json.message);
      } catch {
        console.log('         Response:', text.substring(0, 100));
      }
    }
  } catch (err) {
    console.log('  ERROR: Connection failed - ' + err.message);
    hasErrors = true;
  }
} else {
  console.log('  SKIPPED: Fix environment variable errors first');
}

// Step 4: Print dev server URL
console.log('\n[4/4] Development URLs...');
console.log('  Run: npm run dev');
console.log('  Then open:');
console.log('    http://localhost:5173/pages/subscriber-admin/mini-crm.html');
console.log('    http://localhost:5173/pages/sales-agent/mini-crm.html');

// Summary
console.log('\n' + '═'.repeat(52));
if (hasErrors) {
  console.log('❌ ERRORS FOUND - Fix the issues above');
  process.exit(1);
} else {
  console.log('✅ All checks passed - Environment is correctly configured');
  process.exit(0);
}

/**
 * Airwallex Checkout Session Creator
 *
 * This Edge Function creates a payment/checkout session with Airwallex
 * for subscription purchases and upgrades.
 *
 * SETUP REQUIRED:
 * 1. Add AIRWALLEX_API_KEY to your Supabase secrets
 * 2. Add AIRWALLEX_CLIENT_ID to your Supabase secrets
 * 3. Set AIRWALLEX_ENV to 'demo' or 'prod'
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - restrict to production domain
const ALLOWED_ORIGINS = [
  "https://hivemind-ar.vercel.app",
  "http://localhost:5173", // Local development
  "http://localhost:3000"  // Alternative local dev port
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Subscription plan details
const PLANS = {
  artist: {
    name: "Artist",
    price: 1200, // cents
    currency: "USD",
    interval: "month",
    artworkLimit: 15
  },
  established: {
    name: "Established",
    price: 1900,
    currency: "USD",
    interval: "month",
    artworkLimit: 50
  },
  professional: {
    name: "Professional",
    price: 2900,
    currency: "USD",
    interval: "month",
    artworkLimit: -1 // unlimited
  }
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Initialize Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const { planId, successUrl, cancelUrl } = await req.json();

    if (!planId || !PLANS[planId as keyof typeof PLANS]) {
      throw new Error("Invalid plan ID");
    }

    // Validate URLs if provided - must be valid and from allowed origins
    const validateUrl = (url: string | undefined): boolean => {
      if (!url) return true; // Optional, will use defaults
      try {
        const parsed = new URL(url);
        return ALLOWED_ORIGINS.some(origin => url.startsWith(origin));
      } catch {
        return false;
      }
    };

    if (!validateUrl(successUrl) || !validateUrl(cancelUrl)) {
      throw new Error("Invalid redirect URL");
    }

    const plan = PLANS[planId as keyof typeof PLANS];

    // Get Airwallex credentials
    const apiKey = Deno.env.get("AIRWALLEX_API_KEY");
    const clientId = Deno.env.get("AIRWALLEX_CLIENT_ID");
    const env = Deno.env.get("AIRWALLEX_ENV") || "demo";

    if (!apiKey || !clientId) {
      throw new Error("Airwallex credentials not configured");
    }

    const baseUrl = env === "prod"
      ? "https://api.airwallex.com"
      : "https://api-demo.airwallex.com";

    // Step 1: Get authentication token
    const authResponse = await fetch(`${baseUrl}/api/v1/authentication/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-api-key": apiKey
      }
    });

    if (!authResponse.ok) {
      const authError = await authResponse.text();
      console.error("Airwallex auth failed:", authResponse.status, authError);
      throw new Error(`Airwallex auth failed: ${authResponse.status}`);
    }

    const { token } = await authResponse.json();

    // Step 2: Create payment intent
    const paymentIntentResponse = await fetch(`${baseUrl}/api/v1/pa/payment_intents/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: plan.price / 100, // Airwallex expects dollars, not cents
        currency: plan.currency,
        merchant_order_id: `sub_${user.id}_${Date.now()}`,
        order: {
          type: "subscription",
          products: [{
            name: `HiveMind AR ${plan.name} Plan`,
            quantity: 1,
            unit_price: plan.price / 100,
            type: "subscription"
          }]
        },
        metadata: {
          userId: user.id,
          planId: planId,
          email: user.email
        },
        return_url: successUrl || `${req.headers.get("origin")}/pages/subscriber/dashboard.html?payment=success`,
        cancel_url: cancelUrl || `${req.headers.get("origin")}/pages/subscriber/upgrade.html?payment=cancelled`
      })
    });

    if (!paymentIntentResponse.ok) {
      const intentError = await paymentIntentResponse.text();
      console.error("Payment intent failed:", paymentIntentResponse.status, intentError);
      throw new Error(`Payment intent failed: ${paymentIntentResponse.status}`);
    }

    const paymentIntent = await paymentIntentResponse.json();

    // Step 3: Store pending payment in database
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseService.from("payments").insert({
      user_id: user.id,
      airwallex_payment_id: paymentIntent.id,
      amount: plan.price,
      currency: plan.currency,
      plan_id: planId,
      status: "pending"
    });

    // Return client secret for frontend to complete payment
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        env: env
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    // Map internal errors to safe client-facing messages
    const safeErrors: Record<string, { message: string; status: number }> = {
      "No authorization header": { message: "Authorization required", status: 401 },
      "Unauthorized": { message: "Unauthorized", status: 401 },
      "Invalid plan ID": { message: "Invalid plan ID", status: 400 },
      "Invalid redirect URL": { message: "Invalid redirect URL", status: 400 },
      "Airwallex credentials not configured": { message: "Payment system unavailable", status: 503 }
    };

    const safeError = safeErrors[error.message] || { message: error.message, status: 500 }; // Temporarily show actual error

    return new Response(
      JSON.stringify({ error: safeError.message }),
      {
        status: safeError.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

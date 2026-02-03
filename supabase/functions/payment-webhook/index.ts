/**
 * Airwallex Payment Webhook Handler
 *
 * This Edge Function receives webhook events from Airwallex when:
 * - Payments are successful
 * - Payments fail
 * - Subscriptions are created/updated/cancelled
 * - Refunds are processed
 *
 * SETUP REQUIRED:
 * 1. Add AIRWALLEX_WEBHOOK_SECRET to your Supabase secrets
 * 2. Configure webhook URL in Airwallex dashboard: https://your-project.supabase.co/functions/v1/payment-webhook
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - webhooks come from Airwallex servers
const ALLOWED_ORIGINS = [
  "https://hivemind-ar.vercel.app",
  "http://localhost:5173"
];

function getCorsHeaders(origin: string | null) {
  // For webhooks, we accept requests without origin (server-to-server)
  // but restrict browser-based requests to allowed origins
  const allowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin)
    ? (origin || ALLOWED_ORIGINS[0])
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-timestamp, x-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Verify webhook signature from Airwallex using HMAC-SHA256
// See: https://www.airwallex.com/docs/api#/Webhooks/Signature_Verification
async function verifyWebhookSignature(
  payload: string,
  timestamp: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !timestamp || !secret) {
    return false;
  }

  // Check timestamp is within 5 minutes to prevent replay attacks
  const timestampMs = parseInt(timestamp, 10) * 1000;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (isNaN(timestampMs) || Math.abs(now - timestampMs) > fiveMinutes) {
    return false;
  }

  // Airwallex signature format: timestamp.payload
  const signedPayload = `${timestamp}.${payload}`;

  // Compute HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );

  // Convert to hex string
  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (computedSignature.length !== signature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < computedSignature.length; i++) {
    result |= computedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }

  return result === 0;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("AIRWALLEX_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("AIRWALLEX_WEBHOOK_SECRET not configured");
    }

    // Get signature from headers
    const signature = req.headers.get("x-signature") || "";
    const timestamp = req.headers.get("x-timestamp") || "";

    // Get raw body for signature verification
    const body = await req.text();

    // Verify signature
    const isValid = await verifyWebhookSignature(body, timestamp, signature, webhookSecret);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = JSON.parse(body);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.name) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(supabase, event.data);
        break;

      case "payment_intent.failed":
        await handlePaymentFailed(supabase, event.data);
        break;

      case "subscription.created":
        await handleSubscriptionCreated(supabase, event.data);
        break;

      case "subscription.updated":
        await handleSubscriptionUpdated(supabase, event.data);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCancelled(supabase, event.data);
        break;

      case "refund.succeeded":
        await handleRefundSuccess(supabase, event.data);
        break;

      default:
        // Unhandled event type - silently acknowledge
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    // Log generic error without sensitive details
    console.error("Webhook processing failed");
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Plan configuration - matches create-checkout
const PLAN_ARTWORK_LIMITS: Record<string, number> = {
  free: 3,
  artist: 15,
  established: 50,
  professional: -1 // unlimited
};

// Handler functions

async function handlePaymentSuccess(supabase: any, data: any) {
  // 1. Get the payment record to find user and plan
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("user_id, plan_id")
    .eq("airwallex_payment_id", data.id)
    .single();

  if (fetchError || !payment) {
    throw new Error("Payment record not found");
  }

  // 2. Update payment status
  const { error: updateError } = await supabase
    .from("payments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      metadata: { airwallex_response: { status: data.status } }
    })
    .eq("airwallex_payment_id", data.id);

  if (updateError) {
    throw updateError;
  }

  // 3. Activate or update the user's subscription
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", payment.user_id)
    .single();

  if (existingSub) {
    // Update existing subscription
    await supabase
      .from("subscriptions")
      .update({
        plan_id: payment.plan_id,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancelled_at: null,
        cancel_at_period_end: false
      })
      .eq("user_id", payment.user_id);
  } else {
    // Create new subscription
    await supabase
      .from("subscriptions")
      .insert({
        user_id: payment.user_id,
        plan_id: payment.plan_id,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString()
      });
  }

  // 4. Update user's artwork limit in profile
  const artworkLimit = PLAN_ARTWORK_LIMITS[payment.plan_id] ?? 3;
  await supabase
    .from("profiles")
    .update({ artwork_limit: artworkLimit })
    .eq("id", payment.user_id);

  // 5. Record in payment history
  await supabase
    .from("payment_history")
    .insert({
      user_id: payment.user_id,
      amount: data.amount ? Math.round(data.amount * 100) : null,
      currency: data.currency || "USD",
      status: "completed",
      payment_type: "subscription",
      metadata: { airwallex_payment_id: data.id, plan_id: payment.plan_id }
    });
}

async function handlePaymentFailed(supabase: any, data: any) {
  // Update payment status with failure reason
  const { error } = await supabase
    .from("payments")
    .update({
      status: "failed",
      failure_reason: data.failure_reason || data.last_payment_attempt?.failure_reason || "Payment declined"
    })
    .eq("airwallex_payment_id", data.id);

  if (error) {
    throw error;
  }

  // Get payment details for history
  const { data: payment } = await supabase
    .from("payments")
    .select("user_id, amount, currency, plan_id")
    .eq("airwallex_payment_id", data.id)
    .single();

  if (payment) {
    await supabase
      .from("payment_history")
      .insert({
        user_id: payment.user_id,
        amount: payment.amount,
        currency: payment.currency,
        status: "failed",
        payment_type: "subscription",
        metadata: {
          airwallex_payment_id: data.id,
          plan_id: payment.plan_id,
          failure_reason: data.failure_reason
        }
      });
  }
}

async function handleSubscriptionCreated(supabase: any, data: any) {
  // Extract user ID from metadata
  const userId = data.metadata?.userId;
  if (!userId) {
    throw new Error("No user ID in subscription metadata");
  }

  const planId = data.metadata?.planId || "artist";
  const now = new Date();
  const periodEnd = new Date(data.current_period_end || now.setMonth(now.getMonth() + 1));

  // Create or update subscription record
  await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      plan_id: planId,
      status: "active",
      airwallex_subscription_id: data.id,
      current_period_start: data.current_period_start || new Date().toISOString(),
      current_period_end: periodEnd.toISOString()
    }, {
      onConflict: "user_id"
    });

  // Update artwork limit
  const artworkLimit = PLAN_ARTWORK_LIMITS[planId] ?? 3;
  await supabase
    .from("profiles")
    .update({ artwork_limit: artworkLimit })
    .eq("id", userId);
}

async function handleSubscriptionUpdated(supabase: any, data: any) {
  // Find subscription by Airwallex ID or user metadata
  const airwallexSubId = data.id;
  const userId = data.metadata?.userId;

  const query = supabase.from("subscriptions");

  if (airwallexSubId) {
    // Try to find by Airwallex subscription ID first
    const { data: sub } = await query
      .select("user_id, plan_id")
      .eq("airwallex_subscription_id", airwallexSubId)
      .single();

    if (sub) {
      const newPlanId = data.metadata?.planId || sub.plan_id;

      await supabase
        .from("subscriptions")
        .update({
          plan_id: newPlanId,
          status: data.status === "cancelled" ? "cancelled" : "active",
          current_period_end: data.current_period_end || undefined
        })
        .eq("airwallex_subscription_id", airwallexSubId);

      // Update artwork limit if plan changed
      if (newPlanId !== sub.plan_id) {
        const artworkLimit = PLAN_ARTWORK_LIMITS[newPlanId] ?? 3;
        await supabase
          .from("profiles")
          .update({ artwork_limit: artworkLimit })
          .eq("id", sub.user_id);
      }
    }
  } else if (userId) {
    // Fall back to user ID from metadata
    const newPlanId = data.metadata?.planId;
    if (newPlanId) {
      await supabase
        .from("subscriptions")
        .update({
          plan_id: newPlanId,
          current_period_end: data.current_period_end || undefined
        })
        .eq("user_id", userId);

      const artworkLimit = PLAN_ARTWORK_LIMITS[newPlanId] ?? 3;
      await supabase
        .from("profiles")
        .update({ artwork_limit: artworkLimit })
        .eq("id", userId);
    }
  }
}

async function handleSubscriptionCancelled(supabase: any, data: any) {
  const airwallexSubId = data.id;
  const userId = data.metadata?.userId;

  // Find and update the subscription
  let targetUserId = userId;

  if (airwallexSubId) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("airwallex_subscription_id", airwallexSubId)
      .single();

    if (sub) {
      targetUserId = sub.user_id;
    }
  }

  if (!targetUserId) {
    throw new Error("Cannot identify user for cancelled subscription");
  }

  // Mark subscription as cancelled but don't immediately downgrade
  // The user keeps access until current_period_end
  await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_at_period_end: true
    })
    .eq("user_id", targetUserId);

  // Note: A scheduled job should check for expired subscriptions
  // and downgrade users to free tier when current_period_end passes
}

async function handleRefundSuccess(supabase: any, data: any) {
  // Find the original payment
  const originalPaymentId = data.payment_intent_id || data.metadata?.original_payment_id;

  if (originalPaymentId) {
    // Update original payment status
    const { data: payment } = await supabase
      .from("payments")
      .select("user_id, amount, currency, plan_id")
      .eq("airwallex_payment_id", originalPaymentId)
      .single();

    if (payment) {
      await supabase
        .from("payments")
        .update({
          status: "refunded",
          refunded_at: new Date().toISOString()
        })
        .eq("airwallex_payment_id", originalPaymentId);

      // Record refund in payment history
      await supabase
        .from("payment_history")
        .insert({
          user_id: payment.user_id,
          amount: data.amount ? Math.round(data.amount * 100) : payment.amount,
          currency: payment.currency,
          status: "completed",
          payment_type: "refund",
          metadata: {
            refund_id: data.id,
            original_payment_id: originalPaymentId
          }
        });

      // Cancel subscription and downgrade to free
      await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          plan_id: "free",
          cancelled_at: new Date().toISOString()
        })
        .eq("user_id", payment.user_id);

      // Reset artwork limit to free tier
      await supabase
        .from("profiles")
        .update({ artwork_limit: PLAN_ARTWORK_LIMITS.free })
        .eq("id", payment.user_id);
    }
  }
}

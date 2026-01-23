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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-timestamp, x-signature",
};

// Verify webhook signature from Airwallex
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  // TODO: Implement Airwallex signature verification
  // See: https://www.airwallex.com/docs/api#/Webhooks/Signature_Verification
  // This typically involves HMAC-SHA256 verification

  // Placeholder - implement actual verification
  console.log("Webhook signature verification - implement with actual Airwallex logic");
  return true;
}

serve(async (req) => {
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
    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
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
        console.log(`Unhandled event type: ${event.name}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Handler functions - implement business logic here

async function handlePaymentSuccess(supabase: any, data: any) {
  console.log("Payment succeeded:", data.id);

  // TODO: Implement payment success logic
  // - Update payment record in database
  // - Activate subscription if applicable
  // - Send confirmation email
  // - Update user's subscription status

  const { error } = await supabase
    .from("payments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString()
    })
    .eq("airwallex_payment_id", data.id);

  if (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
}

async function handlePaymentFailed(supabase: any, data: any) {
  console.log("Payment failed:", data.id);

  // TODO: Implement payment failure logic
  // - Update payment record
  // - Notify user
  // - Log failure reason

  const { error } = await supabase
    .from("payments")
    .update({
      status: "failed",
      failure_reason: data.failure_reason || "Unknown error"
    })
    .eq("airwallex_payment_id", data.id);

  if (error) {
    console.error("Error updating failed payment:", error);
    throw error;
  }
}

async function handleSubscriptionCreated(supabase: any, data: any) {
  console.log("Subscription created:", data.id);

  // TODO: Implement subscription creation logic
  // - Create subscription record
  // - Update user profile with subscription tier
  // - Set artwork limits based on plan
}

async function handleSubscriptionUpdated(supabase: any, data: any) {
  console.log("Subscription updated:", data.id);

  // TODO: Implement subscription update logic
  // - Update subscription record
  // - Handle plan changes (upgrade/downgrade)
  // - Adjust artwork limits
}

async function handleSubscriptionCancelled(supabase: any, data: any) {
  console.log("Subscription cancelled:", data.id);

  // TODO: Implement subscription cancellation logic
  // - Update subscription status
  // - Downgrade user to free tier
  // - Retain data but limit access
}

async function handleRefundSuccess(supabase: any, data: any) {
  console.log("Refund processed:", data.id);

  // TODO: Implement refund logic
  // - Update payment record
  // - Adjust subscription if needed
  // - Notify user
}

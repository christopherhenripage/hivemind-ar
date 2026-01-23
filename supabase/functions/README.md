# HiveMind AR - Supabase Edge Functions

This folder contains Edge Functions for handling Airwallex payment integration.

## Functions

### `create-checkout`
Creates an Airwallex payment session for subscription purchases.

**Endpoint:** `POST /functions/v1/create-checkout`

**Request Body:**
```json
{
  "planId": "artist" | "established" | "professional",
  "successUrl": "https://...",  // optional
  "cancelUrl": "https://..."    // optional
}
```

**Response:**
```json
{
  "clientSecret": "...",
  "paymentIntentId": "...",
  "env": "demo" | "prod"
}
```

### `payment-webhook`
Handles Airwallex webhook events for payment status updates.

**Endpoint:** `POST /functions/v1/payment-webhook`

Handles events:
- `payment_intent.succeeded`
- `payment_intent.failed`
- `subscription.created`
- `subscription.updated`
- `subscription.cancelled`
- `refund.succeeded`

## Setup

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link to your project
```bash
supabase link --project-ref jxzkqccqpodvgtvgwuzq
```

### 4. Set secrets
```bash
# Airwallex credentials
supabase secrets set AIRWALLEX_API_KEY=your_api_key
supabase secrets set AIRWALLEX_CLIENT_ID=your_client_id
supabase secrets set AIRWALLEX_WEBHOOK_SECRET=your_webhook_secret
supabase secrets set AIRWALLEX_ENV=demo  # or 'prod' for production
```

### 5. Deploy functions
```bash
supabase functions deploy create-checkout
supabase functions deploy payment-webhook
```

### 6. Configure webhook in Airwallex
1. Go to Airwallex Dashboard > Developer > Webhooks
2. Add endpoint: `https://jxzkqccqpodvgtvgwuzq.supabase.co/functions/v1/payment-webhook`
3. Select events to subscribe to
4. Copy the signing secret and set it as `AIRWALLEX_WEBHOOK_SECRET`

## Database Schema

Create this table for tracking payments:

```sql
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  airwallex_payment_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  plan_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  failure_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update (from Edge Functions)
CREATE POLICY "Service role can manage payments" ON payments
  FOR ALL USING (auth.role() = 'service_role');
```

## Local Development

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve --env-file .env.local
```

## Testing

Use Airwallex's demo environment for testing:
- Test card: 4242 4242 4242 4242
- Any future expiry date
- Any 3-digit CVC

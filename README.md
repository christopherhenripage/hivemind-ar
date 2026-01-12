# HiveMind AR

A role-based augmented reality platform with separate dashboards for Super Admin, Subscriber Admin, Sales Agent, and Client roles.

## Installation

```bash
npm install
```

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"
```

### How to Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your project (or create a new one)
3. Go to **Settings** > **API**
4. Copy the **Project URL** (this is your `VITE_SUPABASE_URL`)
5. Copy the **anon public** key (this is your `VITE_SUPABASE_ANON_KEY`)

### Database Setup

Ensure you have a `leads` table in your Supabase database with the following schema:

```sql
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'Hot',
  source TEXT DEFAULT 'Website',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (recommended)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anonymous users (adjust as needed)
CREATE POLICY "Allow all operations" ON leads FOR ALL USING (true);
```

### Vercel Deployment

To set environment variables in Vercel:

1. Go to your project in the [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on **Settings** > **Environment Variables**
3. Add the following variables:
   - Name: `VITE_SUPABASE_URL` | Value: your Supabase project URL
   - Name: `VITE_SUPABASE_ANON_KEY` | Value: your Supabase anon key
4. Select the environments where these should apply (Production, Preview, Development)
5. Click **Save**
6. Redeploy your project for changes to take effect

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Roles

- **Super Admin**: Full system access
- **Subscriber Admin**: Team and subscription management
- **Sales Agent**: Client and order management
- **Client**: Order placement and AR experience viewing

## Login

Use any username/password and select a role to access the dashboard.

## Mini CRM Features

The Mini CRM module provides lead management functionality:

- **Add Lead**: Create new leads with name, email, phone, status, and source
- **Edit Lead**: Update existing lead information
- **Delete Lead**: Remove leads from the database
- **Status Tracking**: Categorize leads as Hot, Warm, or Cold
- **Source Tracking**: Track lead sources (Website, Referral, AR Demo, Social Media)
- **Real-time Updates**: Table refreshes automatically after each operation

### How to Confirm It Works

1. **Start the dev server**: Run `npm run dev` and open the Mini CRM page
2. **Check connection**: Look for "Supabase: Connected" in green at the top-right of the header
3. **Add a lead**: Click "+ Add Lead", fill in the form, click "Add Lead"
4. **Verify in Supabase**: Go to your Supabase dashboard > Table Editor > leads table
5. **Test edit/delete**: Use the Edit and Delete buttons on any lead row

### Troubleshooting

- **"Supabase: Error - Missing environment variables"**: Create `.env.local` with the required keys
- **"Supabase: Error - relation 'leads' does not exist"**: Run the SQL above to create the leads table
- **Toast shows error**: Check browser console for detailed error messages

# SYNQ Karute -- Setup Guide

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `synq-karute`
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest to Japan (e.g., `Northeast Asia (Tokyo)`)
4. Click **"Create new project"** and wait ~2 minutes for it to provision

## Step 2: Get Your Supabase Credentials

1. In your project dashboard, go to **Settings > API**
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
3. These have been added to your `.env.local` file

## Step 3: Run the Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click **"Run"** -- all tables, indexes, and RLS policies will be created

## Step 4: Create the Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click **"New bucket"**
3. Set:
   - **Name**: `recordings`
   - **Public**: OFF (private)
   - **File size limit**: `100 MB`
   - **Allowed MIME types**: `audio/webm, audio/mp4, audio/wav, audio/ogg`
4. Click **"Create bucket"**

## Step 5: Create Your Staff Account

1. In Supabase dashboard, go to **Authentication > Users**
2. Click **"Add user" > "Create new user"**
3. Enter your email and password
4. Copy the user's **UUID** from the users table
5. Go to **SQL Editor** and run:

```sql
-- Create your organization
INSERT INTO organizations (name, type) VALUES ('La Estro 代官山', 'salon');

-- Create your staff record (replace the UUIDs)
INSERT INTO staff (org_id, user_id, name, role, email)
VALUES (
  (SELECT id FROM organizations LIMIT 1),
  'YOUR_AUTH_USER_UUID_HERE',
  'Your Name',
  'owner',
  'your@email.com'
);
```

## Step 6: Add API Keys to .env.local

Your `.env.local` file needs these values filled in. Run the setup command below.

## Step 7: Start the Dev Server

```bash
cd synq-karute
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 8: Deploy to Vercel

```bash
npx vercel deploy
```

Add the same environment variables in the Vercel dashboard.

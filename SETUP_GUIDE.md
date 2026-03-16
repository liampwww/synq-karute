# SYNQ Karute — Setup Guide

Follow these steps exactly. Do them in order.

---

## Step 1: Get your Supabase credentials

### 1a. Open Supabase
1. Go to **https://supabase.com/dashboard** in your browser
2. Log in if needed
3. Click on your **synq-karute** project (or whatever you named it)

### 1b. Go to Project Settings
1. In the **left sidebar**, look at the bottom
2. Click the **gear icon** (⚙️) — it says "Project Settings" when you hover
3. You should now see a menu: General, API, Database, etc.

### 1c. Open the API page
1. In that settings menu, click **"API"**
2. You'll see two sections: **Project URL** and **Project API keys**

### 1d. Copy the Project URL
1. Under **Project URL**, you'll see something like: `https://abcdefghijk.supabase.co`
2. Click the **copy icon** (📋) next to it, or select the whole URL and copy it
3. **Keep this somewhere** — you'll paste it in Step 2

### 1e. Copy the anon public key
1. Under **Project API keys**, you'll see two keys: `anon` and `service_role`
2. Find the row that says **"anon"** and **"public"**
3. Click the **copy icon** next to that key (it's a long string starting with `eyJ...`)
4. **Keep this somewhere** — you'll paste it in Step 2

---

## Step 2: Put the credentials in your project

### 2a. Open the env file
1. In Cursor, open the **file explorer** on the left
2. Go to: `synq-karute` folder → `.env.local` file
3. Double-click to open it

### 2b. Replace the placeholders
Your file currently has:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Replace those two lines** with your actual values. It should look like this (but with YOUR values):

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5OTk5OTksImV4cCI6MjAxNTU3NTk5OX0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important:**
- The URL must start with `https://` and end with `.supabase.co`
- The key is one long line (no spaces, no line breaks)
- Don't add quotes around the values

### 2c. Save the file
- Press **Cmd+S** (Mac) or **Ctrl+S** (Windows) to save

---

## Step 3: Restart the app

1. Go to the terminal where `npm run dev` is running
2. Press **Ctrl+C** to stop it
3. Run again: `npm run dev`
4. Open **http://localhost:3000** in your browser

---

## If you still get errors

**"Invalid supabaseUrl"** — Your URL is wrong. Check:
- It starts with `https://`
- It ends with `.supabase.co`
- There are no extra spaces before or after
- You saved the file and restarted the dev server

**"Invalid API key"** — Your anon key is wrong. Check:
- You copied the **anon** key, not the service_role key
- The whole key was copied (it's very long)
- No spaces or line breaks in the middle

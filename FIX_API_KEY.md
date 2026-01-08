# 🔑 Fix: Invalid Supabase API Key

## The Problem

Your Supabase API key is invalid. This is why you're getting `CHANNEL_ERROR`.

## The Solution

### Get Your Current API Keys

1. **Go to your Supabase project:**
   https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/settings/api

2. **Copy these two values:**

   **Project URL:**
   ```
   (should be: https://odvyblvoyemyhdfcdxro.supabase.co)
   ```

   **Anon/Public Key:** (Click "Reveal" if hidden)
   ```
   (starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)
   ```

### Update Your .env.local

1. **Open the file:**
   ```bash
   nano apps/web/.env.local
   # or use your preferred editor
   ```

2. **Update these lines** with the values from Supabase dashboard:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://odvyblvoyemyhdfcdxro.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste your anon key here>
   ```

3. **Save the file**

### Restart Your Web Server

```bash
# Stop the current server (Ctrl+C if running)
cd apps/web
bun run dev
```

### Test Again

After restarting, open:
```
http://localhost:3000/test-realtime
```

Should now show: ✅ SUBSCRIBED

---

## Why This Happened

Possible reasons:
- API key was rotated in Supabase dashboard
- Project was recreated
- Key was copied with extra characters/spaces
- Project settings were changed

---

## Quick Check

If you want to verify your new key works before updating .env:

```bash
# Replace YOUR_NEW_KEY with the key from dashboard
curl "https://odvyblvoyemyhdfcdxro.supabase.co/rest/v1/" \
  -H "apikey: YOUR_NEW_KEY"
```

**Good response:** Shows API info or table list  
**Bad response:** "Invalid API key"

---

## After Fixing

Once you have the correct key and restart the server:

1. ✅ Test page will show "SUBSCRIBED"
2. ✅ Realtime will start working
3. ✅ Updates will sync across tabs

Let me know when you've updated the key and I'll help verify!

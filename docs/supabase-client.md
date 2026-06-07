# Supabase Client Integration

## Overview
This document explains how the Supabase client is configured in the G7 BLUE CRM.

## Required Environment Variables
You must create a `.env.local` file at the root of the project with the following keys:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Security Notes
- **Publishable Key**: Supabase now shows a Publishable Key instead of an anon key.
- **Never commit `.env.local`**: It contains sensitive keys and is excluded via `.gitignore`.
- **Never expose the service role key**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security (RLS) rules and must only be used server-side.
- **No Connection Strings**: Do not use database connection strings for this setup.

## How to test `/api/health/db`
Ensure your local dev server is running (`pnpm dev`) and your `.env.local` is correctly configured. 
Navigate to: [http://localhost:3000/api/health/db](http://localhost:3000/api/health/db)

You should see a JSON response:
```json
{
  "ok": true,
  "database": "supabase",
  "timestamp": "..."
}
```

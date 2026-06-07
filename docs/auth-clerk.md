# Clerk Authentication Foundation

## Overview
G7 BLUE CRM uses [Clerk](https://clerk.com/) for modern, secure authentication. The integration has been specifically designed to safeguard the local environment and protect against unauthorized access while preserving the original styling of the application.

## Environment Variables
The following environment variables are required in `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

**Where to get these keys:**
1. Log into the Clerk Dashboard.
2. Select your application instance.
3. Navigate to **API Keys** in the sidebar.
4. Copy the "Publishable key" and "Secret key".

## Security Rules
> [!WARNING]
> **Never commit `.env.local`** to Git. It contains sensitive secrets.

> [!CAUTION]
> **Supabase Service Role Bypass:**
> The `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security (RLS) rules in the database. Because of this, it MUST stay strictly server-side.

> [!IMPORTANT]
> **Server Action Authentication:**
> Before using the Supabase admin client within any future Next.js Server Actions or API routes, you MUST explicitly verify the user's authentication state using Clerk's `auth()` function.

## Protected Routes
The application uses Next.js middleware (`src/proxy.ts` due to local project routing requirements) and `@clerk/nextjs/server` to protect paths.

Currently, the following route patterns require authentication:
- `/dashboard(.*)`
- `/customers(.*)`
- `/quotations(.*)`
- `/invoices(.*)`
- `/projects(.*)`
- `/suppliers(.*)`
- `/payments(.*)`
- `/settings(.*)`
- `/api(.*)` *(Except `/api/health/db` for database connectivity testing)*

Unauthenticated users accessing these routes will be automatically redirected to `/sign-in`.

## Legacy /login Route
The legacy `/login` route has been preserved as a server-side redirect (`redirect("/sign-in")`). This approach was chosen to ensure any existing hardcoded links, external references, or bookmarks do not break, while consolidating the UI to a single robust authentication system via Clerk.

## MCP Usage
The Clerk MCP was consulted strictly in a read-only capacity. No resources were mutated, and no keys or tokens were logged or exposed during configuration.

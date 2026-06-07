# Core Security Foundation

This document explains the foundation for integrating Clerk authentication with our Supabase PostgreSQL database.

## Auth Architecture
- We use **Clerk** for authentication, not Supabase Auth.
- We completely bypass the Supabase Auth system (`auth.users`).
- There is no `profiles` table. User data and roles are stored in the `app_users` table, which is keyed directly to the Clerk User ID.

## The `app_users` Table
The `app_users` table maps Clerk users to the application's RBAC system.
- `clerk_user_id`: A text column that stores the Clerk user ID (e.g. `user_2...`).
- `role`: Defines the user's role in the application (`admin`, `manager`, `sales`, `operations`, `accountant`, `viewer`).
- RLS is enabled on this table, but there are no broad public policies. Access to `app_users` is performed server-side only using the Supabase Admin Client.

## Audit Trails
To maintain an audit trail without relying on Supabase `auth.users`:
- Every major business table has `created_by` and `updated_by` text columns.
- These columns store the Clerk `userId` directly as a string. No foreign keys are used.
- The `audit_logs` table also records the Clerk `userId` directly in its `user_id` text column.

# Customers CRUD Documentation

## Current contract

The Customers module provides authenticated customer search, paginated list, detail, create, update, and soft-delete behavior. Server actions and queries are authoritative; client components receive purpose-specific DTOs rather than raw database rows.

## Read boundaries

- **Picker query:** `getCustomers()` returns `id`, `company`, `contact`, and `status` for customer selection.
- **Paginated list query:** `getCustomersList()` returns `id`, `customerNumber`, `company`, `contact`, `phone`, `email`, `city`, `status`, `servicesCount`, `quotationsCount`, and `totalQuotedAmount`. Search, status filtering, pagination, and list metrics are computed on the server.
- **Detail query:** `getCustomerById()` supplies the detail contract, including core customer data, timestamps, soft-delete/audit fields, and official billing/contact fields. Detail-only fields are not part of the list or picker DTOs.

The customer model includes core contact fields and, where applicable, official/commercial fields such as `customer_type`, `legal_name`, `commercial_registration_number`, `vat_number`, national-address fields, `billing_email`, finance-contact fields, `payment_terms`, and `po_required`. These fields support detail and billing workflows; their presence in the database does not imply list exposure.

## Create and update behavior

- **Create:** `createCustomer` requires `customers:write`, validates the request with the customer schema, and calls the atomic customer RPC with a required `mutation_key`. The server derives actor/audit fields and returns a replay-safe result.
- **Update:** `updateCustomer` requires `customers:write`, validates the partial request, and updates only permitted fields for the selected customer.
- **Soft delete:** `softDeleteCustomer` requires `customers:write` and sets `is_deleted`, `deleted_at`, and `updated_by`; it does not hard-delete the customer.

All write paths return safe user-facing errors. Provider and database failures are handled server-side and do not authorize a mutation.

## Validation and data authority

Create validation requires the core company/contact/phone/email/city fields and a valid status (`active`, `inactive`, or `lead`). Official billing and address fields are validated when supplied. Client-supplied list metrics such as `projects_count` and `revenue` are not update authority; list metrics come from server queries.

## Authorization and audit

- Protected actions call `requirePermission("customers:write")` before mutation.
- The Supabase service-role client is server-only and is used only from server-side paths.
- Authenticated actor attribution is written to the existing audit columns; authorization is never delegated to client visibility.
- Missing authentication, inactive users, permission failures, and dependency failures remain fail-closed with safe errors.

## Scope boundary

This document describes the current customer contracts. It does not change database schema, production deployment status, or the separate quotation, billing, payment, and governance contracts.

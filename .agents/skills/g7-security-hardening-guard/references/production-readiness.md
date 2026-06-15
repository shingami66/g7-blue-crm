# Production Readiness Security Gate

Use this reference before deployment or before using real client/company data. If blockers exist, return `Verdict: Not Ready`.

## Blocking Checks

- No DEV_ONLY RLS remains on real-data paths.
- All public tables are reviewed.
- anon/publishable key cannot read or mutate sensitive CRM, financial, settings, bank, role, or permission data.
- RBAC coverage is confirmed for sensitive workflows.
- All write actions are protected by server-side auth and permissions.
- `service_role` is server-only and absent from client bundles and `NEXT_PUBLIC` variables.
- Secrets are not committed and are not present in screenshots, logs, docs, Docker images, or generated artifacts.
- Clerk/Svix webhook signatures are verified before processing.
- Build passes.

## Deployment Controls

- Define a security headers and CSP plan before production exposure.
- Add rate limits for risky operations such as login-adjacent endpoints, webhooks, document generation, payment recording, settings changes, exports, and future AI calls.
- Ensure logs do not expose PII, secrets, bank data, tokens, raw webhook secrets, or full financial payloads.
- Ensure audit logging exists or is planned for sensitive operations: settings changes, role/permission changes, quotation approvals, invoice issue/void, payment record/update/delete, and webhook sync.
- Document backup and recovery expectations before real data.
- Review dependency audit results and address known high-risk issues.
- Do not claim production-ready if blockers exist.

## Manual Verification Checklist

- Verify a Viewer cannot create, update, approve, void, or record payment through UI or direct request.
- Verify Sales cannot approve quotations unless explicitly approved.
- Verify Accountant/Admin boundaries for invoices and payments.
- Verify Clerk webhook rejects invalid signatures.
- Verify anon/publishable key cannot access sensitive tables directly.
- Verify real-data deployment does not depend on DEV_ONLY RLS.
- Verify production environment variables are set without exposing secrets.

## Review Questions

- Would direct Supabase access with the public key expose data that UI hides?
- Are failures observable without leaking sensitive data?
- Is there a tested restore path or at least a documented recovery plan?
- Are all blockers fixed before importing or entering real client/company data?

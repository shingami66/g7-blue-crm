# AI And LLM Security Gate

Use this reference before adding, testing, or shipping any AI/LLM feature in G7 BLUE CRM. If controls are missing, return `Verdict: Blocked Until Safer`.

## Prompt And Data Safety

- Treat prompt injection as expected, especially from user-entered CRM notes, customer messages, document text, invoice descriptions, uploaded files, and web content.
- Keep system instructions separate from user content.
- Delimit user content when sending it to an LLM.
- Do not send secrets, service_role keys, webhook secrets, API keys, or unnecessary private data to an LLM.
- Minimize CRM, financial, bank, role, and permission data sent to an LLM.
- Redact sensitive data unless it is strictly required and explicitly approved.

## Output And Tool Safety

- Treat LLM output as untrusted.
- Validate and authorize LLM output before any database write.
- Do not allow autonomous DB writes without human confirmation and server-side permission checks.
- Keep tool access least privilege and scoped to the user, role, and task.
- Do not let the model choose privileged IDs, roles, payment states, invoice balances, settings changes, or SQL.
- Never expose raw prompts containing secrets or private data in logs.

## Abuse Controls

- Add rate and cost limits before exposing AI features.
- Consider quotas by user, role, tenant/context, and operation type.
- Log AI actions safely enough for audit without storing sensitive raw prompts unless explicitly approved.
- Provide a human review path for financial, customer-facing, or settings-changing AI output.
- Do not ship an AI feature without explicit approval.

## Review Questions

- What user-controlled content can reach the model?
- What private data is included, and can it be redacted or omitted?
- Can model output trigger tools, Server Actions, SQL, or database writes?
- Which permission check gates each AI-assisted action?
- What stops cost abuse, repeated generation, or automated scraping of CRM data?
- Has the user explicitly approved shipping this AI feature?

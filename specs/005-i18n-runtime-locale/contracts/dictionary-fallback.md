# Contract: Dictionary Lookup and Fallback

## Supported Locales

- English (`en`) — safe default and source-label fallback.
- Arabic (`ar`) — RTL runtime UI locale.

## Lookup Outcome

For each visible UI label:

1. Use a usable value from the active-locale dictionary.
2. If missing/unusable, use the English source label.
3. If no usable English source exists, use a readable generic fallback appropriate to the element.
4. Never render the raw translation key.

## Usable Value

A usable value is non-empty user-facing copy appropriate to the control or content. Whitespace, a missing value, or a raw key echoed as its value is not usable.

## Generic Fallback Categories

Generic fallback copy must remain understandable and accessible, such as an unavailable label, action, field, or message. It must not invent business meaning, status, financial terminology, permission, or compliance wording.

## Defect Signal

Missing translations are quality defects. Safe defect metadata may include:

- dictionary namespace;
- translation key;
- route/surface category;
- active locale;
- fallback tier used.

It must not include user-entered content, customer details, financial values, document contents, credentials, tokens, or raw database errors.

## Behavior Invariants

- Fallback changes wording only.
- Controls remain governed by existing RBAC and workflow rules.
- Values, calculations, statuses, records, and submissions are unchanged.
- User-entered business data is never translated.
- Western digits and bidi-safe value rendering remain in force.
- Document/PDF dictionaries and snapshot locale remain independent.

# R01 Quotation Percentage Discount Contract

## Scope

R01 adds a quotation-level percentage mode alongside the existing fixed-SAR discount. The header `quotations.discount` remains the authoritative resolved SAR amount. Percentage terms are stored as `discount_type = 'percentage'` and integer `discount_percentage_bps`; fixed-SAR rows use `discount_type = 'fixed_sar'` and a null rate. Existing quotation amounts remain unchanged and are not reinterpreted.

This slice does not add item-level discounts, stacking, coupons, promotions, customer discount policies, non-SAR calculation, VAT/ZATCA behavior, or a second allocation engine.

## Percentage base and resolution

The eligible pre-VAT base is expressed in integer halalas. It includes priced Authority Line roots and selected Optional Add-ons attached to those roots. Included Components and unselected Optional Add-ons do not contribute independently.

The entered rate has at most two decimal percentage places and is represented in basis points (`0.01% = 1`, `5% = 500`, `7.5% = 750`, `12.25% = 1225`, `100% = 10000`). Values from 0% through 100% are valid; negative values, values above 100%, and excess precision are rejected.

The database resolves one header amount using exact numeric arithmetic:

```text
resolved_discount_halalas = round(eligible_base_halalas * discount_percentage_bps / 10000)
```

Nonnegative exact half-halala values round upward. The percentage is rounded once at the quotation header. The server/database is authoritative; browser preview uses the same integer-halalas and basis-point rule as advisory feedback.

## Financial authority and lifecycle

After resolving a percentage amount, the existing W2C deterministic allocator remains authoritative. It allocates the resolved header amount by the existing proportional largest-remainder contract, persists line allocations, and approval validates persisted totals. No percentage-specific allocator is added.

Creation mutation identity includes mode, rate, and commercial lines for percentage requests, and exact percentage retries replay the same quotation. Fixed-SAR identity retains the historic canonical payload shape so older fixed retries remain compatible.

Draft edits atomically persist mode, rate, resolved amount, totals, and reconciled allocations. Switching modes clears inactive rate/amount input. Approval verifies the persisted percentage and current eligible base resolve to the stored header amount; it fails closed without silently repairing records.

Quotation revisions and Commercial Amendment successors initially copy mode, rate, resolved amount, and persisted allocations from the source. A successor Draft recalculates only when its proposed rate or eligible commercial lines change. Amendment no-op detection compares mode and rate as well as monetary totals, so a rate-only change remains material even when it rounds to the same SAR amount.

Approved historical quotations remain immutable. ABS copies the approved resolved amount and stored allocations without percentage calculation. Billing continues to consume the existing approved monetary ceiling and has no percentage calculation.

## Presentation

For percentage terms, the approved/read-only quotation detail and customer PDF show both the entered percentage and resolved SAR amount. Fixed-SAR presentation remains the existing monetary display. The ordinary quotation form and Commercial Amendment workspace expose Fixed amount / Percentage, use localized EN/AR labels, and show an advisory resolved amount in percentage mode.

## Verification and publication record

- Repository baseline: `ec1cbf029b1d0b23ebeb041151a1cac36070d5c3`.
- DEV project: `dpddrqjzqohexixgdqiq` only.
- DEV migration identity: `20261008092957_r01_percentage_discount`; repository source matches the applied identity.
- DEV schema/function/security and generated-type reconciliation: complete; existing fixed-SAR monetary amounts remain unchanged.
- Focused quotation regression: 171/171 passed; EN/AR dictionary and document-locale tests: 31/31 passed; TypeScript, scoped ESLint, production build, and `git diff --check` are recorded in the R01-BC closeout.
- Repository publication: bounded implementation and current-state documentation are published on `main`; publication SHA is recorded in the R01-BC closeout.
- **Owner acceptance — 10 October 2026:** Mozfer explicitly accepted the bounded capability after the completed DEV sequence: fixed and percentage quotation modes; 12.25% persisted as 1225 bps; resolved SAR header authority and deterministic W2C allocation reconciliation; Fixed ↔ Percentage Draft transitions; normal UI approval; approved-detail dual display; EN/AR/RTL detail and PDF; mobile detail/form behavior and repaired mobile PDF preview; approved ABS/billing authority; Commercial Amendment inheritance; a material, non-no-op rate-only change from 12.25% to 10.00%; and predecessor immutability. This acceptance does not add line-item percentage discounts or widen the R01 contract.
- W11 remains NO-GO until all required gates and separate Owner acceptance are complete.

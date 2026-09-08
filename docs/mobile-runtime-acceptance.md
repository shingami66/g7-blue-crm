# G7 BLUE CRM — Mobile Runtime Acceptance & Responsive Closeout

**Date:** 9 September 2026  
**Status:** OWNER-ACCEPTED (BOUNDED RESPONSIVE SURFACES)  
**Accepted Head Baseline:** `2a0ba1d839e0ff8e2304ba6656c12f953bda111d`  
**Classification:** Operational UX & Responsive Acceptance Record (DEV/TEST ONLY — NO PRODUCTION OR DEPLOYMENT CLAIM)

---

## 1. Remote Mobile Test Method & Transport Classification

During handheld mobile testing of the G7 BLUE CRM, testing through a temporary Cloudflare Quick Tunnel under Next.js development mode (`next dev`) revealed a distinct transport-layer issue:
- Localhost desktop and mobile device emulation interactivity was healthy and responsive.
- Remote handheld devices loading through the temporary Cloudflare Quick Tunnel rendered pages, but client-side interactions could appear unresponsive or delayed.
- Browser console and network traces revealed intermittent WebSocket disconnects and Server-Sent Events / Hot Module Replacement (HMR) reconnection loops over the tunnel transport.
- **Classification:** This behavior was formally diagnosed and classified as a **development-runtime / HMR-over-tunnel transport limitation**. It was conclusively determined **NOT** to be an application authentication failure, RBAC defect, or product interaction bug.

### Accepted Remote Mobile Smoke Procedure

To guarantee clean, deterministic runtime behavior without development-mode HMR transport overhead, the canonical remote mobile testing method is established as:

1. **Build and start production server locally:**
   ```bash
   npm run build
   npm run start
   ```
2. **Expose test transport in a separate terminal:**
   ```bash
   cloudflared tunnel --protocol http2 --url http://localhost:3000
   ```

### Operational & Transport Boundaries
- **Temporary Test Transport Only:** Quick Tunnel URLs (`*.trycloudflare.com`) are ephemeral, session-bound test proxies.
- **No Stable Environment Claim:** Ephemeral tunnel URLs must never be persisted, documented as stable environments, or treated as staging/production URLs.
- **NOT a Production Deployment:** This setup provides mobile physical device testing access only. No uptime, production-readiness, security certification, or deployment SLA is made.

---

## 2. Navigation Feedback Architecture & Interaction Model

To eliminate mobile navigation uncertainty on handheld devices with varying network latencies, a three-stage progressive navigation feedback model was delivered:

1. **Immediate Source Feedback (~150 ms):** `PendingLink` applies active pressed/pending visual feedback on the originating link or card if navigation is not instantaneous.
2. **Subtle Pending Halo (~160 ms):** `NavigationFeedbackProvider` activates a non-blocking, ambient G7 Pending Halo progress indicator across the top of the viewport for sustained transitions.
3. **Destination-Shaped Route Skeletons:** Longer page navigations transition to route-specific loading skeletons that mirror the destination layout, preventing jarring layout shifts.

### Engineering & Accessibility Principles
- **Canonical Design Tokens:** Pending Halo and focus styling derive strictly from canonical G7 design system CSS tokens (e.g., `color-mix(in srgb, var(--color-primary) <percentage>, transparent)`), avoiding hardcoded hex or ad-hoc RGBA values.
- **Non-Blocking Interaction:** The halo is purely non-blocking and visual; it does not trap focus, block touches, hijack router navigation, or alter native click semantics.
- **Reduced-Motion Respect:** Full support for `prefers-reduced-motion: reduce`, dampening or replacing pulse animations with static indicator states.
- **Callback Lifecycle Stability (Commit `309396c`):** Corrected `NavigationFeedbackProvider` callback identity so that changes to internal halo visibility do not unmount or retrigger `PendingLinkHint` cleanup effects, eliminating halo flicker or timer reset cycles during ongoing page transitions.

---

## 3. Owner Mobile Acceptance Record

The Owner (Mozfer) physically exercised and accepted the bounded responsive and mobile operational surfaces on physical handheld devices across English (EN) and Arabic (AR/RTL):

| Surface / Workflow | Tested Views | Physical Acceptance Result | Notes |
|---|---|---|---|
| **Expenses Employee Self-Service** | `/expenses` | `PASS` (EN/AR/RTL) | Card layout, status badges, claim submission, own/broad view separation. |
| **Receipt Camera Capture** | `/expenses` | `PASS` (Mobile Camera) | Camera-first handheld capture, file gallery fallback, thumbnail preview. |
| **Customers List** | `/customers` | `PASS` (EN/AR/RTL) | Responsive list projection, card layout, customer navigation. |
| **Quotations List** | `/quotations` | `PASS` (EN/AR/RTL) | Mobile card layout, status indicators, SAR totals formatting. |
| **Invoices List** | `/invoices` | `PASS` (EN/AR/RTL) | Mobile card layout exposing invoice number, issue date, status, customer, invoice type, document label, amount, View action, and Print/PDF action. |
| **Services List** | `/services` | `PASS` (EN/AR/RTL) | Service cards, status badges, event dates, customer links. |
| **Suppliers List & Filter Region** | `/suppliers` | `PASS` (EN/AR/RTL) | Filter controls wrapping, touch targets, supplier cards. |
| **Payments List** | `/payments` | `PASS` (EN/AR/RTL) | Payment cards, method badges, SAR currency alignment. |
| **Supplier Quotation History** | `/suppliers/[id]/quotations` | `PASS` (EN/AR/RTL) | Quotation cards, supplier links, package requirement linkage. |
| **Quotation Detail** | `/quotations/[id]` | `PASS` (EN/AR/RTL) | Commercial hierarchy cards, line items, totals summary. |
| **Supplier Quotation Detail & Requirements**| `/suppliers/[id]/quotations/[quotationId]` | `PASS` (EN/AR/RTL) | Detailed line pricing cards, procurement requirement cards. |
| **Mobile Navigation Feedback** | System-wide | `PASS` (EN/AR/RTL) | `PendingLink` touch response, Pending Halo activation, zero flicker. |
| **Mobile Loading Skeletons** | System-wide | `PASS` (EN/AR/RTL) | Destination-shaped shimmer skeletons matching final layouts. |

*Note: Acceptance is strictly bounded to the physical surfaces listed above. Surfaces not explicitly exercised are not claimed.*

---

## 4. Responsive Implementation Boundary

The delivered responsive improvements adhere strictly to G7 architectural boundaries:
- **Dual Presentation Pattern:** On narrow handheld viewports (`< 768px`), complex desktop tables switch to structured, touch-friendly mobile card compositions (`md:hidden` / `hidden md:block`).
- **Desktop Preservation:** Desktop tabular layouts, column alignments, and sorting headers remain completely intact and untouched.
- **Zero Semantics Widening:** The responsive remediation changed only visual presentation. No business logic, financial rounding, search queries, pagination offsets, authentication, RBAC boundaries, or database schemas were altered or widened.
- **Bilingual & BiDi Integrity:** All mobile cards preserve bidi-safe numerical formatting, monospace document identifiers (`EXP-`, `INV-`, `QUO-`, `SR-`, `PO-`), and natural RTL alignment for Arabic metadata.

---

## 5. Accepted Baseline HEAD

The accepted repository state for this documentation reconciliation begins from canonical baseline:
```
2a0ba1d839e0ff8e2304ba6656c12f953bda111d
fix(invoices): align mobile list with operational cards
```
All preceding delivery commits (`ca26b06` through `2a0ba1d`) are preserved in published repository history.

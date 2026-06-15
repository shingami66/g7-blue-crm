# G7 BLUE CRM - Frontend Audit Report

## 1. Project Structure
The frontend is built with Next.js 16 (App Router) and structured systematically inside the `src` directory.

- **`src/app/`**: Contains the routing structure.
  - `page.tsx`: Root redirect to `/dashboard`.
  - `layout.tsx`: Root HTML layout with global metadata.
  - `globals.css`: Global design tokens, Tailwind directives, and print media queries.
  - **`login/`**: Unauthenticated login route.
  - **`(dashboard)/`**: Route group for the authenticated application wrapper.
    - `layout.tsx`: Layout implementing the Sidebar and Topbar.
    - `dashboard/`: Executive dashboard overview.
    - `customers/`: Customer management interface.
    - `quotations/`: Quotations list and detail views.
    - `invoices/`: Billing documents. Official tax invoice behavior remains future/deferred.
    - `payments/`: Payment tracking.
    - `projects/`: Project command center.
    - `suppliers/`: Supplier network.
    - `settings/`: Company settings.
- **`src/components/`**: Modular UI components.
  - **`layout/`**: Structural elements (`Sidebar.tsx`, `Topbar.tsx`).
  - **`ui/`**: Reusable design system components (`DataTable.tsx`, `FilterBar.tsx`, `KpiCard.tsx`, `PageHeader.tsx`, `StatusBadge.tsx`).
- **`src/lib/`**: Core libraries and utilities.
  - **`data/`**: Static mock data simulating a database (`customers.ts`, `invoices.ts`, `payments.ts`, `projects.ts`, `quotations.ts`, `settings.ts`, `suppliers.ts`).

---

## 2. Pages Inventory

| Page Path | File Location | Purpose | Data Source | Key Components | Interactivity |
|-----------|---------------|---------|-------------|----------------|---------------|
| `/` | `src/app/page.tsx` | Root redirect | None | None | Redirects to `/dashboard` |
| `/login` | `src/app/login/page.tsx` | Authentication | None | None | Form submission simulation (`useState`) |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | High-level business overview | Static constants | `KpiCard`, `StatusBadge` | Navigation links |
| `/customers` | `src/app/(dashboard)/customers/page.tsx` | Manage clients | `customersData` | `PageHeader`, `FilterBar`, `DataTable`, `StatusBadge` | Side-panel detail view on row click |
| `/quotations` | `src/app/(dashboard)/quotations/page.tsx` | List quotations | `quotationsData` | `PageHeader`, `FilterBar`, `DataTable`, `StatusBadge` | Row click to detail page |
| `/quotations/[id]` | `src/app/(dashboard)/quotations/[id]/page.tsx` | Quotation details | `quotationsData` | `StatusBadge` | Navigation back/PDF/Edit |
| `/quotations/[id]/pdf` | `src/app/(dashboard)/quotations/[id]/pdf/page.tsx` | Print-ready A4 Quotation | `quotationsData` | None | `window.print()` trigger |
| `/invoices` | `src/app/(dashboard)/invoices/page.tsx` | Manage invoices | `invoicesData` | `PageHeader`, `KpiCard`, `StatusBadge` | Side-panel detail view on row click |
| `/invoices/[id]/pdf` | `src/app/(dashboard)/invoices/[id]/pdf/page.tsx` | Print-ready A4 commercial invoice preview; not a ZATCA/FATOORA tax invoice | `invoicesData` | None | `window.print()` trigger |
| `/payments` | `src/app/(dashboard)/payments/page.tsx` | Track incoming payments | `paymentsData` | `PageHeader`, `FilterBar`, `DataTable`, `StatusBadge`, `KpiCard` | Filtering dropdowns (visual only) |
| `/projects` | `src/app/(dashboard)/projects/page.tsx` | Command center for events | `projectsData` | `PageHeader`, `StatusBadge` | Split-screen detail view with task toggles |
| `/suppliers` | `src/app/(dashboard)/suppliers/page.tsx` | Vendor management | `suppliersData` | `PageHeader`, `FilterBar`, `StatusBadge` | Split-screen detail view on row click |
| `/settings` | `src/app/(dashboard)/settings/page.tsx` | System preferences | `settingsData` | `PageHeader` | Form inputs, visual layout only |

---

## 3. Components Inventory

### Layout Components

#### `Sidebar` (`src/components/layout/Sidebar.tsx`)
- **Props**: None
- **Expects**: Reads route via `usePathname()` to highlight the active menu.
- **Dependencies**: `lucide-react`, `next/link`, `next/navigation`, `useState`.
- **Scope**: Reusable layout container. Includes mobile hamburger toggle state.

#### `Topbar` (`src/components/layout/Topbar.tsx`)
- **Props**: None
- **Expects**: Global user session context (currently unlinked).
- **Dependencies**: `lucide-react`.
- **Scope**: Reusable layout container.

### UI Components

#### `DataTable` (`src/components/ui/DataTable.tsx`)
- **Props**: `columns: string[]`, `children: ReactNode`
- **Expects**: Array of header labels and `<tr>` elements as children.
- **Dependencies**: React.
- **Scope**: Highly reusable standard table wrapper.

#### `FilterBar` (`src/components/ui/FilterBar.tsx`)
- **Props**: `children: ReactNode`
- **Expects**: Form elements (selects, inputs) to be passed as children.
- **Dependencies**: React.
- **Scope**: Reusable styling wrapper for filter controls.

#### `KpiCard` (`src/components/ui/KpiCard.tsx`)
- **Props**: `label: string`, `value: string`, `trend?: "up" | "down" | "flat" | "warning"`, `trendLabel?: string`, `icon: LucideIcon`
- **Expects**: Metric data and trend direction.
- **Dependencies**: `lucide-react`.
- **Scope**: Reusable dashboard metric card.

#### `PageHeader` (`src/components/ui/PageHeader.tsx`)
- **Props**: `title: string`, `subtitle?: string`, `children?: ReactNode`
- **Expects**: Title strings and optional action buttons as children.
- **Dependencies**: React.
- **Scope**: Standardized page title header.

#### `StatusBadge` (`src/components/ui/StatusBadge.tsx`)
- **Props**: `variant: StatusVariant`, `children: ReactNode`
- **Expects**: Defined string literal variants (e.g., `draft`, `paid`, `active`) mapped to Tailwind utility classes.
- **Dependencies**: React.
- **Scope**: Reusable badge for visual status indicators.

---

## 4. Data Layer Analysis
The application entirely depends on mock static files simulating API responses.
- **`customers.ts`**: Array of customer objects with company name, contact, revenue.
- **`invoices.ts`**: Demo invoices referencing quotation IDs and line items. Official VAT/ZATCA behavior is not implemented.
- **`payments.ts`**: Financial records tracking payment method and invoice references.
- **`projects.ts`**: Complex objects containing execution tasks, checklists, budget, and timeline.
- **`quotations.ts`**: Line item definitions with categories, unit prices, and quantities.
- **`settings.ts`**: Legacy static fallback for company profile, CR, finance rules, and banking details. Live Company Settings and future document snapshots should replace this for legal/tax document output.
- **`suppliers.ts`**: Third-party vendor database with service types and compliance ratings.

---

## 5. Type System Analysis
- **TypeScript Configuration**: Enabled and strictly typed.
- **Component Props**: Interfaces are defined inline within components (e.g., `{ variant: StatusVariant, children: ReactNode }`).
- **Data Types**: The data layer heavily relies on implicit type inference from the mock data arrays. Complex types (e.g., `StatusVariant` in `StatusBadge`) are defined explicitly.
- **Route Params**: `[id]` paths retrieve generic `string` parameters from `useParams()`.
- **Missing Explicit Definitions**: There are no dedicated global `/types` files or interfaces defining core entities (like `Invoice`, `Customer`, `Project`), requiring implicit type assertions in some components.

---

## 6. State Management Analysis
- **Local State**: Managed entirely via React `useState`.
  - **Detail Panels**: Pages like `/customers`, `/projects`, and `/invoices` use `selected[Entity]` string states to toggle split-pane or side-panel views.
  - **Mobile Menus**: `Sidebar.tsx` uses `mobileOpen` boolean state.
  - **Forms**: The login page uses a `loading` state to simulate a delay.
- **Global State**: No Context API, Redux, or Zustand is implemented.
- **URL State**: Dynamic routes (`/quotations/[id]`) drive detailed view states utilizing the Next.js App Router parameters.

---

## 7. PDF/Print System Analysis
The print system uses standard CSS `@media print` queries combined with HTML/CSS layouts simulating physical paper.
- **Pages**: `/quotations/[id]/pdf` and `/invoices/[id]/pdf`.
- **Wrapper**: Uses `.a4-page` CSS class which sets exact dimensions (`210mm x 297mm`) and shadows for web preview.
- **Trigger**: Implements `window.print()` via a floating 'Print PDF' button which is hidden via `.no-print` class during the actual print cycle.
- **Tax/ZATCA status**: Current print output must not claim official Tax Invoice, VAT 15%, ZATCA compliance, or FATOORA Phase 2 integration while Company Settings is `not_registered`. Official tax invoice behavior is deferred until VAT registration is confirmed, CS-B document snapshots exist, and accountant/ZATCA review is complete.

---

## 8. API/Backend Readiness
- **Current State**: Frontend-only mock implementation. No REST or GraphQL endpoints are configured.
- **Readiness**: The UI is highly decoupled from the data. The data layer `lib/data/` acts as an excellent abstraction boundary. Fetching logic inside `useEffect` or React Server Components could easily replace the static imports.
- **Required Backend Work**: Database schema alignment with current mock data models, authentication (JWT/NextAuth), REST endpoints for CRUD operations, and server-side PDF generation (e.g., Puppeteer/Playwright if HTML printing is insufficient).

---

## 9. Dependency Analysis
From `package.json`:
- **Core**: `next (16.2.7)`, `react (19.2.4)`, `react-dom (19.2.4)`
- **Styling**: `tailwindcss (^4)`, `@tailwindcss/postcss`
- **Icons**: `lucide-react (^1.17.0)`
- **Dev Tooling**: `typescript (^5)`, `eslint`

This is a very lean, modern dependency tree avoiding heavy component libraries in favor of custom UI elements.

---

## 10. Known Issues / Missing Features
- **Missing Filtering Logic**: Filter bars, search inputs, and dropdowns on list pages are visually present but not functionally wired to filter the state.
- **Type Definitions**: Implicit typing for entities. Requires dedicated `.d.ts` or model interfaces for production scale.
- **Authentication**: The login page simulates logging in but does not enforce a real session cookie; navigating directly to `/dashboard` works.
- **PDF Responsiveness**: The A4 pages are strict on width, meaning they might require horizontal scrolling on narrow viewports before printing.
- **Dynamic Routing Missing Handling**: Visiting an invalid `[id]` returns a generic fallback string instead of a `notFound()` component.

---

## 11. Summary Table

| Metric | Status / Count |
|--------|----------------|
| **Next.js Version** | 16.2.7 (App Router) |
| **Styling Strategy** | Tailwind CSS v4 + Material 3 Global Tokens |
| **Total Pages** | 12 |
| **Total Components** | 7 Reusable UI + 2 Layout |
| **Mock Entities** | 7 (Customers, Invoices, Payments, Projects, Quotes, Settings, Suppliers) |
| **State Pattern** | Local `useState` (Side panels, mobile menus) |
| **PDF Generation** | Native Browser Print (`@media print`) |
| **Backend Status** | Static Stub / Unconnected |
| **Overall Health** | Excellent (Clean abstractions, scalable component architecture) |

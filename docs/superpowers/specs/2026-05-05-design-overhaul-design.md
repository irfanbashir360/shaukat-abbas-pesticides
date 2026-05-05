# App-Wide Design Overhaul & Missing Features

**Date:** 2026-05-05

## Summary

Redesign the entire app with a Dark Executive theme, establish a shared widget library so all pages look and behave consistently, add a live dashboard with a 30-day sales chart, add client-side search/filter to all list pages, and add a print export to every list page. Desktop-only. No mobile/responsive work.

---

## 1. Design System

One CSS token layer in `frontend/src/index.css`. No colour or spacing values appear in component files — everything references tokens.

### Colour Palette

| Token | Value | Role |
|---|---|---|
| `--bg-base` | `#0f172a` | Page / app background |
| `--bg-card` | `#1e293b` | Cards, panels, sidebar |
| `--bg-hover` | `#263348` | Table row hover, nav hover |
| `--text-primary` | `#f8fafc` | Headings, values |
| `--text-muted` | `#64748b` | Labels, subtitles, placeholders |
| `--accent` | `#3b82f6` | Buttons, active nav bar, chart line |
| `--accent-hover` | `#2563eb` | Button hover |
| `--danger` | `#f87171` | Overdue rows, creditor totals, alerts |
| `--warning` | `#fb923c` | Low stock, debtor balances |
| `--success` | `#4ade80` | Settled/paid status |
| `--border` | `#2d3f55` | Table dividers, card borders |

### Typography

System font stack: `-apple-system, 'Segoe UI', Roboto, sans-serif`

| Use | Size | Weight |
|---|---|---|
| Muted label | 11px | 600, uppercase, 0.08em tracking |
| Body / table row | 13px | 400 |
| Subheading | 16px | 600 |
| Hero number (StatCard) | 24px | 800 |
| Page title | 22px | 700 |

### Spacing

4px base unit. Allowed gaps: `4 / 8 / 12 / 16 / 24 / 32px`. No arbitrary values.

### Border Radius

- Cards, modals: `10px`
- Buttons, inputs, badges: `6px`
- Table rows: `0` (flat)

---

## 2. Widget Library

Six shared React components in `frontend/src/components/ui/`. All pages import exclusively from here. No inline duplication.

### `<StatCard>`

```jsx
<StatCard label="Monthly Sales" value="PKR 4.8L" sub="↑ 12% vs last month" accent="default" />
```

Props:
- `label` — string, muted uppercase label
- `value` — string, large bold number
- `sub` — optional string, coloured sub-line
- `accent` — `"default" | "danger" | "warning" | "success"` — colours the sub-line and left border

Renders: dark card (`--bg-card`), 3px left border in accent colour, muted label, `24px` bold value, small sub-line.

### `<PageHeader>`

```jsx
<PageHeader title="Sales" action={<button>New Sale</button>} />
```

Props:
- `title` — string
- `action` — optional React node (button or element, right-aligned)

Renders: flex row, title left, action right, `--border` bottom divider, `24px` bottom margin.

### `<SearchBar>`

```jsx
<SearchBar value={q} onChange={setQ} placeholder="Search by customer…" />
```

Props:
- `value` — string
- `onChange` — function(string)
- `placeholder` — string

Renders: full-width input with a search icon (SVG), `--bg-card` background, `--border` border, `--text-primary` text. No API calls — parent filters rows client-side.

### `<DataTable>`

```jsx
<DataTable
  columns={[
    { key: 'customer', label: 'Customer' },
    { key: 'total', label: 'Total', render: (row) => `PKR ${row.total}` },
  ]}
  rows={filtered}
  onRowClick={(row) => navigate(`/sales/${row.id}`)}
/>
```

Props:
- `columns` — array of `{ key: string, label: string, render?: (row) => ReactNode }`
- `rows` — array of data objects
- `onRowClick` — optional function(row)
- `emptyMessage` — optional string (default: "No records found")

Renders: full-width table, sticky header with `--bg-card` background and `--text-muted` uppercase labels, alternating row shading (even rows use `--bg-hover`), consistent `12px 16px` cell padding, empty-state message when `rows.length === 0`.

### `<Modal>`

```jsx
<Modal title="Record Payment" open={open} onClose={() => setOpen(false)}>
  {/* form fields */}
</Modal>
```

Props:
- `title` — string
- `open` — boolean
- `onClose` — function
- `children` — React node

Renders: fixed dark overlay (`rgba(0,0,0,0.6)`), centred `--bg-card` panel (`480px` wide), header with title + close button, scrollable body, no built-in footer (caller provides action buttons inside children).

### `<Badge>`

```jsx
<Badge variant="danger" label="Overdue" />
<Badge variant="success" label="Settled" />
```

Props:
- `variant` — `"success" | "danger" | "warning" | "info" | "muted"`
- `label` — string

Renders: inline pill, `6px` radius, `10px 8px` padding, small bold text. Replaces all ad-hoc badge spans in Sales, Debtors, Creditors.

---

## 3. Dashboard

Full rebuild. No new DB tables — all data computed from existing tables.

### Backend: `GET /api/dashboard`

New endpoint in `backend/routers/dashboard.py`. Returns:

```json
{
  "monthly_sales": 482000,
  "monthly_sales_prev": 430000,
  "total_creditors": 90000,
  "total_debtors": 45000,
  "product_count": 48,
  "low_stock_count": 5,
  "alert_count": 3,
  "daily_sales": [
    { "date": "2026-04-05", "total": 12000 },
    ...
  ]
}
```

- `monthly_sales` — sum of `sales.total_amount` where `date >= first day of current month` and `voided = false`
- `monthly_sales_prev` — same for previous month
- `total_creditors` — sum of `creditors.amount_owed` where `status != settled`
- `total_debtors` — sum of `debtors.amount_owed - total payments` where `status != settled`
- `low_stock_count` — products where `quantity <= alert_threshold`
- `alert_count` — count from alerts table
- `daily_sales` — last 30 days, one entry per calendar day (days with no sales included as `total: 0`)

### Frontend Layout

**Row 1 — 2 hero StatCards (side by side):**
- Monthly Sales: `value = "PKR {monthly_sales}"`, `sub = "↑/↓ X% vs last month"`, `accent = "default"`
- Outstanding: `value = "PKR {creditors + debtors}"`, `sub = "Creditors {total_creditors} / Debtors {total_debtors}"`, `accent = "danger"`

**Row 2 — 30-day line chart:**
Chart.js `<Line>` chart. Blue line (`--accent`), transparent fill below line, no gridlines, minimal x-axis dates, y-axis shows PKR values. Dark card background.

**Row 3 — 3 small StatCards (3 columns):**
- Total Products: `value = product_count`, `accent = "default"`
- Low Stock: `value = low_stock_count`, `accent = "warning"`
- Active Alerts: `value = alert_count`, `accent = "danger"`

Chart.js added as dependency (`chart.js` + `react-chartjs-2`).

---

## 4. List Pages

Every list page follows the same structure:

```
<PageHeader title="…" action={<button>…</button>} />
<SearchBar value={q} onChange={setQ} placeholder="…" />
<DataTable columns={…} rows={filtered} />
```

### Search Fields Per Page

| Page | Searchable fields |
|---|---|
| Sales | Customer name, invoice number |
| Products | Name, category, company |
| Creditors | Supplier name |
| Debtors | Customer name |
| Customers | Name, phone |

Search is case-insensitive, client-side, filters the already-loaded data array. No debounce needed (local filter is instant).

### Print Export

A "Print" button in each `<PageHeader>`'s action slot calls `window.print()`.

`@media print` block in `index.css`:
- Hides: sidebar, nav, `<PageHeader>` action buttons, `<SearchBar>`, modals
- Shows: page title and `<DataTable>` only
- Forces white background, black text on all table elements
- No page-break inside rows

Works automatically on every list page — no per-page print code.

### Pages Being Rebuilt

All existing pages migrate their markup to use widget library components:

| Page | Changes |
|---|---|
| Dashboard | Full rebuild (see Section 3) |
| Sales | PageHeader + SearchBar + DataTable + Badge for payment type |
| Products | PageHeader + SearchBar + DataTable |
| Creditors | PageHeader + SearchBar + DataTable + StatCard for total |
| Debtors | PageHeader + SearchBar + DataTable + StatCard for total |
| Customers | PageHeader + SearchBar + DataTable |
| Settings | PageHeader only (no table) |

No feature changes on any page — layout and widget migration only.

---

## 5. Sidebar Navigation

Visual refresh only. No routing or structural changes.

### Styles

- Background: `--bg-card`
- Right border: `1px solid --border`
- Brand area: shop name in `--text-primary`, small blue dot (`--accent`) accent
- Nav links default: `--text-muted` text, no background
- Nav links hover: `--bg-hover` background, `--text-primary` text
- Nav links active: `--text-primary` text, `3px solid --accent` left border, `--bg-hover` background
- Icon size: 18px, vertically centred with label

### Link Order (unchanged)

Dashboard → Sales → Products → Customers → Creditors → Debtors → Settings

---

## Out of Scope

- Mobile / responsive layout
- Dark/light mode toggle
- New routes or pages beyond what exists
- Backend changes other than the new `/api/dashboard` endpoint
- Any changes to PDF invoice design (already done)

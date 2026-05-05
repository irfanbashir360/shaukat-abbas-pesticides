# App-Wide Design Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the light theme with a Dark Executive design system, build a shared widget library, add a 30-day dashboard chart, add search/filter to all list pages, and add print export.

**Architecture:** New CSS tokens in `index.css` replace the existing light palette; old variable names become aliases so un-migrated pages stay usable. Five shared UI components live in `components/ui/`. Each list page is migrated one at a time to use those components. Dashboard gains a Chart.js line chart via a backend endpoint extension.

**Tech Stack:** React 19, Vite, FastAPI, SQLAlchemy, Chart.js + react-chartjs-2

---

## File Map

**Modified:**
- `frontend/src/index.css` — dark token layer + updated CSS classes
- `frontend/src/components/Layout.jsx` — dark sidebar
- `frontend/src/components/Modal.jsx` — dark panel styling
- `backend/routers/dashboard.py` — add `daily_sales`, `monthly_sales_prev`
- `backend/schemas.py` — extend `DashboardSummary`
- `frontend/src/pages/Dashboard.jsx` — full rebuild with Chart.js
- `frontend/src/pages/Sales.jsx` — PageHeader + SearchBar + DataTable
- `frontend/src/pages/Products.jsx` — PageHeader + SearchBar + DataTable
- `frontend/src/pages/Creditors.jsx` — PageHeader + SearchBar + StatCard + DataTable
- `frontend/src/pages/Debtors.jsx` — PageHeader + SearchBar + StatCard + DataTable
- `frontend/src/pages/Customers.jsx` — PageHeader + SearchBar + DataTable

**Created:**
- `frontend/src/components/ui/StatCard.jsx`
- `frontend/src/components/ui/PageHeader.jsx`
- `frontend/src/components/ui/SearchBar.jsx`
- `frontend/src/components/ui/DataTable.jsx`
- `frontend/src/components/ui/Badge.jsx`

**Tests:**
- `backend/tests/test_dashboard.py` — new file, smoke-tests the extended endpoint

---

## Task 1: Dark Executive CSS Design System

**Files:**
- Modify: `frontend/src/index.css`

Replace the entire `:root` block and update CSS class rules that contain hardcoded light-mode `rgba(0,0,0,...)` or `rgba(15,23,42,...)` values.

- [ ] **Step 1: Replace the `:root` token block**

Open `frontend/src/index.css`. Replace everything from `@import "tailwindcss";` through the closing `}` of `:root` with:

```css
@import "tailwindcss";

/* ── Design tokens (Dark Executive) ───────── */
:root {
  /* Core dark palette */
  --bg-base:        #0f172a;
  --bg-card:        #1e293b;
  --bg-hover:       #263348;
  --text-primary:   #f8fafc;
  --accent:         #3b82f6;
  --accent-hover:   #2563eb;
  --danger:         #f87171;
  --warning:        #fb923c;
  --success:        #4ade80;
  --border:         #2d3f55;
  --text-muted:     #64748b;
  --text-faint:     #94a3b8;

  /* Subtle tints (for badges) */
  --accent-subtle:  rgba(59,130,246,0.14);
  --danger-subtle:  rgba(248,113,113,0.14);
  --success-subtle: rgba(74,222,128,0.14);
  --warning-subtle: rgba(251,146,60,0.14);
  --info:           #38bdf8;
  --info-subtle:    rgba(56,189,248,0.14);

  /* Backwards-compat aliases (existing pages use these) */
  --bg:             #0f172a;
  --white:          #1e293b;
  --text:           #f8fafc;
  --border-mid:     #3d5170;
  --sky:            #3b82f6;
  --sky-hover:      #2563eb;
  --amber:          #fb923c;
  --amber-hover:    #ea7c1a;
  --amber-subtle:   rgba(251,146,60,0.14);
  --green:          #4ade80;
  --green-hover:    #22c55e;
  --green-light:    #86efac;
  --green-subtle:   rgba(74,222,128,0.14);
  --navy:           #0f172a;
  --forest:         #0f172a;
  --cream:          #1e293b;
  --accent-light:   #60a5fa;

  --shadow-xs: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.35);
  --shadow:    0 4px 16px rgba(0,0,0,0.40);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.45);
  --shadow-modal: 0 24px 64px rgba(0,0,0,0.55);

  --r-xs: 5px;  --r-sm: 8px;  --r: 12px;  --r-lg: 16px;
}
```

- [ ] **Step 2: Update CSS classes with hardcoded light-mode values**

Find and replace these specific rule bodies (the selectors stay the same, only the property values change):

```css
/* ── Reset ─────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body {
  font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-base);
  -webkit-font-smoothing: antialiased;
}

/* ── Typography ────────────────────────────── */
.sap-h1 {
  font-size: 26px; font-weight: 800;
  letter-spacing: -0.02em; line-height: 1.2;
  color: var(--text-primary);
}
.sap-h2 { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.sap-label {
  display: block; font-size: 13px; font-weight: 600;
  color: var(--text-muted); margin-bottom: 6px;
}
.sap-section-title {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-muted);
}

/* ── Page animation ────────────────────────── */
.sap-page { animation: sapFadeUp 0.22s ease both; }
@keyframes sapFadeUp {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Cards ─────────────────────────────────── */
.sap-card {
  background: var(--bg-card);
  border-radius: var(--r);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

/* ── Tables ────────────────────────────────── */
.sap-table { width: 100%; border-collapse: collapse; }
.sap-table thead th {
  padding: 11px 16px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-muted); text-align: left;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.sap-table thead th:first-child { border-radius: var(--r) 0 0 0; }
.sap-table thead th:last-child  { border-radius: 0 var(--r) 0 0; }
.sap-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  color: var(--text-primary);
  font-size: 13px;
}
.sap-table tbody tr:last-child td { border-bottom: none; }
.sap-table tbody tr { transition: background 0.10s; }
.sap-table tbody tr:hover { background: var(--bg-hover); }
.sap-table tbody tr.voided { opacity: 0.35; }

/* ── Buttons ───────────────────────────────── */
.sap-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; border-radius: var(--r-sm);
  font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
  font-size: 14px; font-weight: 600;
  cursor: pointer; border: none;
  transition: all 0.14s; white-space: nowrap; line-height: 1;
  text-decoration: none;
}
.sap-btn-primary {
  background: var(--accent); color: #fff;
  box-shadow: 0 2px 8px rgba(59,130,246,0.3);
}
.sap-btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 4px 14px rgba(59,130,246,0.4);
  transform: translateY(-1px);
}
.sap-btn-primary:active { transform: translateY(0); }

.sap-btn-ghost {
  background: transparent; color: var(--text-primary);
  border: 1.5px solid var(--border);
}
.sap-btn-ghost:hover { border-color: var(--border-mid); background: rgba(255,255,255,0.04); }

.sap-btn-danger {
  background: transparent; color: var(--danger);
  border: 1.5px solid rgba(248,113,113,0.25);
  padding: 5px 12px; font-size: 13px;
}
.sap-btn-danger:hover { background: var(--danger-subtle); border-color: var(--danger); }

.sap-btn-link {
  background: transparent; color: var(--accent); border: none;
  font-size: 13px; font-weight: 600;
  text-decoration: underline; text-underline-offset: 2px;
  cursor: pointer; padding: 0;
  font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
}
.sap-btn-link-muted {
  background: transparent; color: var(--text-muted); border: none;
  font-size: 13px; font-weight: 500;
  text-decoration: underline; text-underline-offset: 2px;
  cursor: pointer; padding: 0;
  font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
}
.sap-btn-link-muted:hover { color: var(--text-primary); }

/* ── Form controls ─────────────────────────── */
.sap-input {
  width: 100%; padding: 9px 12px;
  font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
  font-size: 14px; color: var(--text-primary);
  background: var(--bg-base);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  outline: none;
  transition: border-color 0.14s, box-shadow 0.14s;
}
.sap-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.18);
}
.sap-input::placeholder { color: var(--text-faint); }

/* ── Status badges ─────────────────────────── */
.sap-badge {
  display: inline-flex; align-items: center;
  padding: 3px 9px; border-radius: 20px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.02em; white-space: nowrap;
}
.badge-success  { background: var(--success-subtle);  color: var(--success); }
.badge-danger   { background: var(--danger-subtle);   color: var(--danger); }
.badge-warning  { background: var(--warning-subtle);  color: var(--warning); }
.badge-info     { background: var(--info-subtle);     color: var(--info); }
.badge-muted    { background: rgba(255,255,255,0.08); color: var(--text-muted); }

/* ── Error message ─────────────────────────── */
.sap-error {
  background: var(--danger-subtle);
  border: 1px solid rgba(248,113,113,0.25);
  color: var(--danger);
  border-radius: var(--r-sm);
  padding: 9px 14px; font-size: 13px; font-weight: 500;
  margin-bottom: 14px;
}

/* ── Empty state ───────────────────────────── */
.sap-empty {
  padding: 52px 24px; text-align: center;
  color: var(--text-faint); font-size: 13px;
}

/* ── Tab nav ───────────────────────────────── */
.sap-tabs { display: flex; gap: 0; border-bottom: 1.5px solid var(--border); margin-bottom: 16px; }
.sap-tab {
  padding: 8px 20px; font-size: 14px; font-weight: 500;
  color: var(--text-muted); cursor: pointer;
  border: none; background: transparent;
  border-bottom: 2px solid transparent; margin-bottom: -1.5px;
  transition: color 0.14s, border-color 0.14s;
  font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
  text-transform: capitalize;
}
.sap-tab:hover { color: var(--text-primary); }
.sap-tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 700; }

/* ── Scrollbar ─────────────────────────────── */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--border-mid); }
```

- [ ] **Step 3: Start the dev server and verify the dark background**

```bash
cd /Users/irfan/shaukat-abbas-pesticides/frontend && npm run dev
```

Open http://localhost:5173. The app background should be `#0f172a` (very dark navy), sidebar white-ish cards are now dark `#1e293b`. No white flashes. If the background is still white, check that the `:root` block parsed correctly (no syntax error).

- [ ] **Step 4: Commit**

```bash
cd /Users/irfan/shaukat-abbas-pesticides
git add frontend/src/index.css
git commit -m "feat: replace light theme with Dark Executive CSS design tokens"
```

---

## Task 2: Shared UI Widget Library

**Files:**
- Create: `frontend/src/components/ui/StatCard.jsx`
- Create: `frontend/src/components/ui/PageHeader.jsx`
- Create: `frontend/src/components/ui/SearchBar.jsx`
- Create: `frontend/src/components/ui/DataTable.jsx`
- Create: `frontend/src/components/ui/Badge.jsx`

- [ ] **Step 1: Create StatCard**

```jsx
// frontend/src/components/ui/StatCard.jsx
const ACCENT_COLORS = {
  default: 'var(--accent)',
  danger:  'var(--danger)',
  warning: 'var(--warning)',
  success: 'var(--success)',
}

export default function StatCard({ label, value, sub, accent = 'default' }) {
  const color = ACCENT_COLORS[accent] || ACCENT_COLORS.default
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '10px',
      padding: '20px 24px',
      borderLeft: `3px solid ${color}`,
      border: '1px solid var(--border)',
      borderLeftWidth: '3px',
      borderLeftColor: color,
    }}>
      <div style={{
        fontSize: '11px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'var(--text-muted)', marginBottom: '10px',
      }}>{label}</div>
      <div style={{
        fontSize: '24px', fontWeight: 800,
        color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1,
      }}>{value}</div>
      {sub && (
        <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 600, color }}>{sub}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create PageHeader**

```jsx
// frontend/src/components/ui/PageHeader.jsx
export default function PageHeader({ title, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingBottom: '16px',
      borderBottom: '1px solid var(--border)',
      marginBottom: '20px',
    }} className="no-print">
      <h1 style={{
        fontSize: '22px', fontWeight: 700,
        color: 'var(--text-primary)', letterSpacing: '-0.01em',
      }}>{title}</h1>
      {action && <div>{action}</div>}
    </div>
  )
}
```

- [ ] **Step 3: Create SearchBar**

```jsx
// frontend/src/components/ui/SearchBar.jsx
export default function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div style={{ position: 'relative', marginBottom: '16px' }} className="no-print">
      <svg
        style={{
          position: 'absolute', left: '11px', top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none',
        }}
        width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5"
      >
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        className="sap-input"
        style={{ paddingLeft: '34px' }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create DataTable**

```jsx
// frontend/src/components/ui/DataTable.jsx
export default function DataTable({ columns, rows, onRowClick, emptyMessage = 'No records found' }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-card)', borderRadius: '10px',
        border: '1px solid var(--border)',
      }}>
        <div className="sap-empty">{emptyMessage}</div>
      </div>
    )
  }
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: '10px',
      border: '1px solid var(--border)', overflow: 'hidden',
    }}>
      <table className="sap-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={col.style}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : {}}
              className={row._rowClass || ''}
            >
              {columns.map(col => (
                <td key={col.key} style={col.tdStyle}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Create Badge**

```jsx
// frontend/src/components/ui/Badge.jsx
const CLASSES = {
  success: 'badge-success',
  danger:  'badge-danger',
  warning: 'badge-warning',
  info:    'badge-info',
  muted:   'badge-muted',
}

export default function Badge({ variant = 'muted', label }) {
  return (
    <span className={`sap-badge ${CLASSES[variant] || 'badge-muted'}`}>{label}</span>
  )
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/irfan/shaukat-abbas-pesticides
git add frontend/src/components/ui/
git commit -m "feat: add shared UI widget library (StatCard, PageHeader, SearchBar, DataTable, Badge)"
```

---

## Task 3: Layout + Modal dark theme

**Files:**
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/components/Modal.jsx`

- [ ] **Step 1: Rewrite Layout.jsx**

Replace the entire file:

```jsx
// frontend/src/components/Layout.jsx
import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/products',  label: 'Products'  },
  { to: '/purchases', label: 'Purchases' },
  { to: '/sales',     label: 'Sales'     },
  { to: '/invoices',  label: 'Invoices'  },
  { to: '/creditors', label: 'Creditors' },
  { to: '/debtors',   label: 'Debtors'   },
  { to: '/suppliers', label: 'Suppliers' },
  { to: '/customers', label: 'Customers' },
  { to: '/reports',   label: 'Reports'   },
  { to: '/settings',  label: 'Settings'  },
]

export default function Layout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ───────────────────────────────── */}
      <aside style={{
        width: '216px', flexShrink: 0,
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand */}
        <div style={{
          padding: '28px 22px 22px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--accent)', flexShrink: 0,
            }} />
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Shaukat Abbas
            </div>
          </div>
          <div style={{
            fontSize: '9.5px', fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginLeft: '16px',
          }}>
            Pesticides
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center',
                padding: '9px 22px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                textDecoration: 'none',
                transition: 'color 0.12s, background 0.12s',
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer badge */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid var(--border)',
          fontSize: '10px', fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text-faint)',
        }}>
          SAP Inventory v1.0
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────── */}
      <main style={{
        flex: 1, overflowY: 'auto',
        background: 'var(--bg-base)',
        padding: '32px 36px',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Update Modal.jsx for dark theme**

Replace the entire file:

```jsx
// frontend/src/components/Modal.jsx
import { createPortal } from 'react-dom'

export default function Modal({ title, onClose, children, size = 'md' }) {
  const maxW = size === 'lg' ? '700px' : '520px'

  const modal = (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9000, overflowY: 'auto',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          minHeight: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '32px 20px', boxSizing: 'border-box',
        }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-modal)',
          width: '100%', maxWidth: maxW,
          border: '1px solid var(--border)',
          animation: 'sapFadeUp 0.18s ease both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
          }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.07)', border: 'none',
              width: '30px', height: '30px', borderRadius: '50%',
              cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, flexShrink: 0,
            }}>×</button>
          </div>
          <div style={{ padding: '24px' }}>{children}</div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
```

- [ ] **Step 3: Visual check**

Run dev server (if not running): `cd /Users/irfan/shaukat-abbas-pesticides/frontend && npm run dev`

Open http://localhost:5173. Verify:
- Sidebar is dark (`#1e293b`) with blue dot in brand
- Active nav link has blue left bar
- Open any modal (e.g., add a product) — modal panel should be dark card on dark overlay

- [ ] **Step 4: Commit**

```bash
cd /Users/irfan/shaukat-abbas-pesticides
git add frontend/src/components/Layout.jsx frontend/src/components/Modal.jsx
git commit -m "feat: update Layout and Modal to Dark Executive theme"
```

---

## Task 4: Dashboard backend — extend endpoint

**Files:**
- Modify: `backend/schemas.py` (lines ~173–182)
- Modify: `backend/routers/dashboard.py`
- Test: `backend/tests/test_dashboard.py` (new)

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_dashboard.py`:

```python
# backend/tests/test_dashboard.py
import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_dashboard_has_daily_sales(client):
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "daily_sales" in data
    assert isinstance(data["daily_sales"], list)
    # always returns 30 entries
    assert len(data["daily_sales"]) == 30
    first = data["daily_sales"][0]
    assert "date" in first
    assert "total" in first

def test_dashboard_has_monthly_sales_prev(client):
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "monthly_sales_prev" in data
    assert isinstance(data["monthly_sales_prev"], float)

def test_dashboard_has_debtors_total(client):
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "debtors_total_owed" in data

def test_dashboard_has_product_count(client):
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "product_count" in data
    assert isinstance(data["product_count"], int)
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd /Users/irfan/shaukat-abbas-pesticides/backend
python -m pytest tests/test_dashboard.py -v
```

Expected: FAIL — `daily_sales`, `monthly_sales_prev`, `debtors_total_owed` not in response.

- [ ] **Step 3: Extend DashboardSummary schema**

In `backend/schemas.py`, find the `DashboardSummary` class (around line 173) and replace it:

```python
class DailySalesPoint(BaseModel):
    date: str   # "YYYY-MM-DD"
    total: float

class DashboardSummary(BaseModel):
    today_sales: float
    month_sales: float
    month_sales_prev: float
    month_purchases: float
    net_profit: float
    product_count: int
    low_stock_products: List[ProductOut]
    creditors_total_owed: float
    creditors_overdue_count: int
    debtors_total_owed: float
    payment_due_alerts: List[InvoiceOut]
    validity_expiry_alerts: List[InvoiceOut]
    daily_sales: List[DailySalesPoint]
```

- [ ] **Step 4: Extend the dashboard endpoint**

Replace the entire content of `backend/routers/dashboard.py`:

```python
# backend/routers/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta, timezone
from database import get_db
import models, schemas

router = APIRouter()

@router.get("", response_model=schemas.DashboardSummary)
def get_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
    today_end   = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)

    month_start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)
    if today.month == 1:
        prev_month_start = datetime(today.year - 1, 12, 1, tzinfo=timezone.utc)
        prev_month_end   = datetime(today.year, 1, 1, tzinfo=timezone.utc)
    else:
        prev_month_start = datetime(today.year, today.month - 1, 1, tzinfo=timezone.utc)
        prev_month_end   = month_start

    today_sales = db.query(func.sum(models.Sale.total_amount)).filter(
        models.Sale.date >= today_start, models.Sale.date <= today_end,
        models.Sale.is_voided == False).scalar() or 0.0

    month_sales = db.query(func.sum(models.Sale.total_amount)).filter(
        models.Sale.date >= month_start, models.Sale.is_voided == False).scalar() or 0.0

    month_sales_prev = db.query(func.sum(models.Sale.total_amount)).filter(
        models.Sale.date >= prev_month_start,
        models.Sale.date < prev_month_end,
        models.Sale.is_voided == False).scalar() or 0.0

    month_purchases = db.query(func.sum(models.Purchase.total_amount)).filter(
        models.Purchase.date >= month_start,
        models.Purchase.is_voided == False).scalar() or 0.0

    # Products
    product_count = db.query(func.count(models.Product.id)).scalar() or 0
    low_stock = db.query(models.Product).filter(
        models.Product.current_stock <= models.Product.low_stock_threshold).all()

    # Creditors
    creditors = db.query(models.Creditor).filter(
        models.Creditor.status != models.CreditorStatus.settled).all()
    cred_paid = sum(sum(p.amount_paid for p in c.payments) for c in creditors)
    cred_owed = max(0.0, sum(c.amount_owed for c in creditors) - cred_paid)
    now_naive = datetime.now()
    overdue_count = sum(1 for c in creditors if c.due_date and c.due_date < now_naive)

    # Debtors
    debtors = db.query(models.Debtor).filter(
        models.Debtor.status != models.DebtorStatus.settled).all()
    debt_paid = sum(sum(p.amount_paid for p in d.payments) for d in debtors)
    debt_owed = max(0.0, sum(d.amount_owed for d in debtors) - debt_paid)

    # Invoice alerts
    settings = db.query(models.InvoiceAlertSettings).first()
    pay_days = settings.payment_due_alert_days if settings else 3
    val_days = settings.validity_expiry_alert_days if settings else 7
    now = datetime.now(timezone.utc)

    payment_alerts = db.query(models.Invoice).filter(
        models.Invoice.is_paid == False,
        models.Invoice.payment_alert_dismissed == False,
        models.Invoice.payment_due_date <= now + timedelta(days=pay_days),
    ).all()

    validity_alerts = db.query(models.Invoice).filter(
        models.Invoice.validity_alert_dismissed == False,
        models.Invoice.validity_expiry_date <= now + timedelta(days=val_days),
    ).all()

    # Daily sales — last 30 calendar days (including today)
    thirty_days_ago = datetime.combine(today - timedelta(days=29), datetime.min.time()).replace(tzinfo=timezone.utc)
    sales_in_range = db.query(models.Sale).filter(
        models.Sale.date >= thirty_days_ago,
        models.Sale.is_voided == False,
    ).all()

    # Build a dict keyed by date string
    daily_map: dict[str, float] = {}
    for sale in sales_in_range:
        sale_date = sale.date
        if sale_date.tzinfo is None:
            sale_date = sale_date.replace(tzinfo=timezone.utc)
        key = sale_date.astimezone(timezone.utc).strftime("%Y-%m-%d")
        daily_map[key] = daily_map.get(key, 0.0) + sale.total_amount

    daily_sales = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        daily_sales.append(schemas.DailySalesPoint(date=key, total=daily_map.get(key, 0.0)))

    return schemas.DashboardSummary(
        today_sales=today_sales,
        month_sales=month_sales,
        month_sales_prev=month_sales_prev,
        month_purchases=month_purchases,
        net_profit=month_sales - month_purchases,
        product_count=product_count,
        low_stock_products=[schemas.ProductOut.model_validate(p) for p in low_stock],
        creditors_total_owed=cred_owed,
        creditors_overdue_count=overdue_count,
        debtors_total_owed=debt_owed,
        payment_due_alerts=[schemas.InvoiceOut.model_validate(i) for i in payment_alerts],
        validity_expiry_alerts=[schemas.InvoiceOut.model_validate(i) for i in validity_alerts],
        daily_sales=daily_sales,
    )
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/irfan/shaukat-abbas-pesticides/backend
python -m pytest tests/test_dashboard.py -v
```

Expected: 3 tests PASS.

- [ ] **Step 6: Run full test suite to verify nothing broke**

```bash
python -m pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/irfan/shaukat-abbas-pesticides
git add backend/routers/dashboard.py backend/schemas.py backend/tests/test_dashboard.py
git commit -m "feat: extend dashboard API with daily_sales, monthly_sales_prev, debtors_total_owed"
```

---

## Task 5: Dashboard frontend rebuild with Chart.js

**Files:**
- Modify: `frontend/package.json` (add deps)
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Install Chart.js**

```bash
cd /Users/irfan/shaukat-abbas-pesticides/frontend
npm install chart.js react-chartjs-2
```

Expected: `chart.js` and `react-chartjs-2` appear in `package.json` dependencies.

- [ ] **Step 2: Rewrite Dashboard.jsx**

Replace the entire file:

```jsx
// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, dismissPaymentAlert, dismissValidityAlert } from '../api/client'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

function pct(current, prev) {
  if (!prev) return null
  const diff = ((current - prev) / prev) * 100
  return (diff >= 0 ? '↑' : '↓') + ' ' + Math.abs(diff).toFixed(1) + '% vs last month'
}

function AlertRow({ inv, onView, onDismiss, dateLabel, dateValue }) {
  const isPast = new Date(dateValue) < new Date()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{inv.invoice_number}</span>
        <span style={{ marginLeft: '10px', fontSize: '13px', color: isPast ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 500 }}>
          {dateLabel}: {new Date(dateValue).toLocaleDateString()}{isPast ? ' · Overdue' : ''}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="sap-btn-link" onClick={onView}>View</button>
        <button className="sap-btn-link-muted" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const navigate = useNavigate()
  const load = () => getDashboard().then(setData).catch(() => {})
  useEffect(() => { load() }, [])

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
      <div style={{ color: 'var(--text-faint)', fontSize: '14px' }}>Loading…</div>
    </div>
  )

  const outstandingTotal = (data.creditors_total_owed || 0) + (data.debtors_total_owed || 0)
  const trend = pct(data.month_sales, data.month_sales_prev)

  const chartData = {
    labels: (data.daily_sales || []).map(p => {
      const d = new Date(p.date)
      return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })
    }),
    datasets: [{
      data: (data.daily_sales || []).map(p => p.total),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.08)',
      fill: true,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#94a3b8',
      bodyColor: '#f8fafc',
      borderColor: '#2d3f55',
      borderWidth: 1,
      callbacks: {
        label: ctx => `PKR ${Number(ctx.parsed.y).toLocaleString()}`,
      },
    }},
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 }, maxTicksLimit: 8 },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: {
          color: '#64748b', font: { size: 11 },
          callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
        },
        border: { display: false },
      },
    },
  }

  const hasAlerts = data.payment_due_alerts.length > 0 || data.validity_expiry_alerts.length > 0

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Dashboard"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => navigate('/purchases')}>+ Purchase</button>
            <button className="sap-btn sap-btn-primary" onClick={() => navigate('/sales')}>+ New Sale</button>
          </div>
        }
      />

      {/* Row 1: 2 hero stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <StatCard
          label="Monthly Sales"
          value={`PKR ${Number(data.month_sales || 0).toLocaleString()}`}
          sub={trend}
          accent="default"
        />
        <StatCard
          label="Outstanding"
          value={`PKR ${Number(outstandingTotal).toLocaleString()}`}
          sub={`Creditors ${Number(data.creditors_total_owed || 0).toLocaleString()} / Debtors ${Number(data.debtors_total_owed || 0).toLocaleString()}`}
          accent="danger"
        />
      </div>

      {/* Row 2: 30-day line chart */}
      <div className="sap-card" style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div className="sap-section-title">Sales · Last 30 Days</div>
        </div>
        <div style={{ height: '160px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Row 3: 3 small stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
        <StatCard
          label="Total Products"
          value={data.product_count}
          accent="default"
        />
        <StatCard
          label="Low Stock"
          value={data.low_stock_products.length}
          sub={data.low_stock_products.length > 0 ? 'Items need restocking' : 'All levels healthy'}
          accent={data.low_stock_products.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Invoice Alerts"
          value={data.payment_due_alerts.length + data.validity_expiry_alerts.length}
          sub={hasAlerts ? 'Requires attention' : 'No alerts'}
          accent={hasAlerts ? 'danger' : 'success'}
        />
      </div>

      {/* Low stock list */}
      {data.low_stock_products.length > 0 && (
        <div className="sap-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span className="sap-h2">Low Stock</span>
            <span className="sap-badge badge-warning">{data.low_stock_products.length}</span>
          </div>
          {data.low_stock_products.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{p.name}</span>
                <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.category}</span>
              </div>
              <span className="sap-badge badge-warning">{p.current_stock} {p.unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* Invoice alerts */}
      {hasAlerts && (
        <div className="sap-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span className="sap-h2">Invoice Alerts</span>
            <span className="sap-badge badge-warning">{data.payment_due_alerts.length + data.validity_expiry_alerts.length}</span>
          </div>
          {data.payment_due_alerts.map(inv => (
            <AlertRow key={inv.id} inv={inv} dateLabel="Due" dateValue={inv.payment_due_date}
              onView={() => navigate(`/invoices/${inv.id}`)}
              onDismiss={async () => { await dismissPaymentAlert(inv.id); load() }} />
          ))}
          {data.validity_expiry_alerts.map(inv => (
            <AlertRow key={inv.id} inv={inv} dateLabel="Valid until" dateValue={inv.validity_expiry_date}
              onView={() => navigate(`/invoices/${inv.id}`)}
              onDismiss={async () => { await dismissValidityAlert(inv.id); load() }} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Start backend + frontend, verify dashboard**

```bash
# Terminal 1 — backend
cd /Users/irfan/shaukat-abbas-pesticides/backend && source venv/bin/activate && uvicorn main:app --port 8000 --reload

# Terminal 2 — frontend
cd /Users/irfan/shaukat-abbas-pesticides/frontend && npm run dev
```

Open http://localhost:5173/dashboard. Verify:
- Two hero stat cards at top (Monthly Sales, Outstanding)
- Line chart below with 30 data points
- Three small stat cards (Products/Low Stock/Alerts)
- Low stock list if any products are below threshold
- No console errors about chart registration

- [ ] **Step 4: Commit**

```bash
cd /Users/irfan/shaukat-abbas-pesticides
git add frontend/package.json frontend/package-lock.json frontend/src/pages/Dashboard.jsx
git commit -m "feat: rebuild Dashboard with Chart.js 30-day line chart and shared StatCard widgets"
```

---

## Task 6: Sales page migration

**Files:**
- Modify: `frontend/src/pages/Sales.jsx`

The Sales page keeps all existing form logic, modal, and void/edit handlers unchanged. Only the page header, the search state, and the sales list table are replaced.

- [ ] **Step 1: Add imports and search state**

At the top of `Sales.jsx`, add the new UI imports after the existing imports:

```jsx
import PageHeader from '../components/ui/PageHeader'
import SearchBar from '../components/ui/SearchBar'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
```

Inside the `Sales` component, add search state after the existing state declarations:

```jsx
const [q, setQ] = useState('')
```

Add the filtered list before the return statement:

```jsx
const filtered = sales.filter(s => {
  if (!q) return true
  const lower = q.toLowerCase()
  const customer = (s.customer_name || s.walkin_name || '').toLowerCase()
  const inv = (s.invoice_number || '').toLowerCase()
  return customer.includes(lower) || inv.includes(lower)
})
```

- [ ] **Step 2: Replace the page header and table in the JSX return**

Find the outer `<div className="sap-page" ...>` return. Replace everything from the opening div through the closing table markup with:

```jsx
return (
  <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
    <PageHeader
      title="Sales"
      action={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="sap-btn sap-btn-ghost" onClick={() => window.print()}>Print</button>
          <button className="sap-btn sap-btn-primary" onClick={() => { closeForm(); setShowForm(true) }}>+ New Sale</button>
        </div>
      }
    />

    <SearchBar value={q} onChange={setQ} placeholder="Search by customer or invoice…" />

    <DataTable
      columns={[
        { key: 'date', label: 'Date', render: s => new Date(s.date).toLocaleDateString() },
        { key: 'invoice_number', label: 'Invoice' },
        { key: 'customer', label: 'Customer', render: s => s.customer_name || s.walkin_name || '—' },
        { key: 'payment_type', label: 'Type', render: s => {
          if (s.is_voided) return <Badge variant="muted" label="Voided" />
          if (s.payment_type === 'credit') return <Badge variant="warning" label="Credit" />
          return <Badge variant="success" label="Cash" />
        }},
        { key: 'total_amount', label: 'Total', render: s => `PKR ${Number(s.total_amount).toLocaleString()}` },
        { key: 'actions', label: '', render: s => (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {!s.is_voided && (
              <>
                <button className="sap-btn-link" onClick={e => { e.stopPropagation(); openEdit(s) }}>Edit</button>
                <button className="sap-btn-link" onClick={e => { e.stopPropagation(); navigate(`/invoices/${s.invoice_id}`) }}>Invoice</button>
                <button className="sap-btn-link-muted" onClick={e => { e.stopPropagation(); handleVoid(s.id) }}>Void</button>
              </>
            )}
          </div>
        ), style: { width: '1px', whiteSpace: 'nowrap' }},
      ]}
      rows={filtered.map(s => ({ ...s, _rowClass: s.is_voided ? 'voided' : '' }))}
      emptyMessage={q ? 'No sales match your search' : 'No sales yet'}
    />

    {/* ── existing modals below — do not remove ── */}
    {showForm && ( /* existing form modal JSX stays here unchanged */ )}
    {invoiceModal && ( /* existing invoice modal JSX stays here unchanged */ )}
  </div>
)
```

**Important:** Keep all existing modal JSX (`showForm && ...` and `invoiceModal && ...`) intact below the DataTable. Only the page header, search bar, and table are replaced.

- [ ] **Step 3: Check existing handleVoid function**

The code references `handleVoid(s.id)`. In the current Sales.jsx, find the void handler — it may be named `handleVoid` or inline. If it's not named `handleVoid`, check the current file and match the correct function name. Adjust the `render` in the actions column accordingly.

- [ ] **Step 4: Visual check**

Open http://localhost:5173/sales. Verify:
- Dark page header with "Sales" title, Print + New Sale buttons
- Search bar filters the table as you type
- Table shows Date, Invoice, Customer, Type (badge), Total, action links
- Cash sales show green badge, credit sales show orange badge, voided show muted badge
- Clicking Print opens browser print dialog

- [ ] **Step 5: Commit**

```bash
cd /Users/irfan/shaukat-abbas-pesticides
git add frontend/src/pages/Sales.jsx
git commit -m "feat: migrate Sales page to shared PageHeader + SearchBar + DataTable widgets"
```

---

## Task 7: Products page migration

**Files:**
- Modify: `frontend/src/pages/Products.jsx`

- [ ] **Step 1: Add imports and search state**

Add at the top of `Products.jsx` after existing imports:

```jsx
import PageHeader from '../components/ui/PageHeader'
import SearchBar from '../components/ui/SearchBar'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
```

Inside the `Products` component, add after existing state:

```jsx
const [q, setQ] = useState('')
```

Add filtered list before the return:

```jsx
const filtered = products.filter(p => {
  if (!q) return true
  const lower = q.toLowerCase()
  return p.name.toLowerCase().includes(lower) ||
    (p.company || '').toLowerCase().includes(lower)
})
```

- [ ] **Step 2: Replace page header and table in JSX return**

The Products page has tabs (fertilizer/seed/pesticide) — keep those. Replace only the `<h1>` heading and the table. The new return:

```jsx
return (
  <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
    <PageHeader
      title="Products"
      action={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="sap-btn sap-btn-ghost" onClick={() => window.print()}>Print</button>
          <button className="sap-btn sap-btn-primary" onClick={openAdd}>+ Add Product</button>
        </div>
      }
    />

    {/* Category tabs — unchanged */}
    <div className="sap-tabs" style={{ marginBottom: '16px' }}>
      {CATEGORIES.map(cat => (
        <button key={cat} className={`sap-tab${tab === cat ? ' active' : ''}`} onClick={() => setTab(cat)}>
          {cat}
        </button>
      ))}
    </div>

    <SearchBar value={q} onChange={setQ} placeholder="Search by name or company…" />

    <DataTable
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'company', label: 'Company', render: p => p.company || '—' },
        { key: 'unit', label: 'Unit' },
        { key: 'price_per_unit', label: 'Price', render: p => `PKR ${Number(p.price_per_unit).toLocaleString()}` },
        { key: 'current_stock', label: 'Stock', render: p => (
          <span style={{ color: p.current_stock <= p.low_stock_threshold ? 'var(--warning)' : 'var(--text-primary)', fontWeight: 600 }}>
            {p.current_stock} {p.unit}
          </span>
        )},
        { key: 'status', label: 'Status', render: p =>
          p.current_stock <= p.low_stock_threshold
            ? <Badge variant="warning" label="Low Stock" />
            : <Badge variant="success" label="OK" />
        },
        { key: 'actions', label: '', render: p => (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="sap-btn-link" onClick={e => { e.stopPropagation(); openEdit(p) }}>Edit</button>
            <button className="sap-btn-link-muted" onClick={e => { e.stopPropagation(); handleDelete(p.id) }}>Delete</button>
          </div>
        ), style: { width: '1px', whiteSpace: 'nowrap' }},
      ]}
      rows={filtered}
      emptyMessage={q ? 'No products match your search' : `No ${tab} products yet`}
    />

    {/* existing add/edit modal — unchanged */}
    {modal && ( /* existing modal JSX stays here unchanged */ )}
  </div>
)
```

- [ ] **Step 3: Visual check**

Open http://localhost:5173/products. Verify:
- Tabs (fertilizer/seed/pesticide) switch the product list
- Search filters within the active tab
- Low stock items show orange "Low Stock" badge
- Edit/Delete links work

- [ ] **Step 4: Commit**

```bash
cd /Users/irfan/shaukat-abbas-pesticides
git add frontend/src/pages/Products.jsx
git commit -m "feat: migrate Products page to shared PageHeader + SearchBar + DataTable widgets"
```

---

## Task 8: Creditors page migration

**Files:**
- Modify: `frontend/src/pages/Creditors.jsx`

- [ ] **Step 1: Rewrite Creditors.jsx**

Replace the entire file. All existing logic is preserved; only the JSX structure changes:

```jsx
// frontend/src/pages/Creditors.jsx
import { useEffect, useState } from 'react'
import { getCreditors, recordCreditorPayment } from '../api/client'
import Modal from '../components/Modal'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import SearchBar from '../components/ui/SearchBar'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import { useToast } from '../components/Toast'

export default function Creditors() {
  const [creditors, setCreditors] = useState([])
  const [payModal, setPayModal] = useState(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const toast = useToast()

  const load = () => getCreditors().then(setCreditors)
  useEffect(() => { load() }, [])

  const handlePay = async () => {
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) return setError('Please enter a valid amount')
    try {
      setError(''); setSaving(true)
      await recordCreditorPayment(payModal.id, {
        date: new Date().toISOString(),
        amount_paid: amt,
        notes,
      })
      setPayModal(null); setAmount(''); setNotes('')
      load()
      toast('Payment recorded')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error recording payment')
    } finally { setSaving(false) }
  }

  const now = new Date()
  const total = creditors.reduce((s, c) => s + Math.max(0, c.amount_owed - c.total_paid), 0)
  const overdue = creditors.filter(c => c.due_date && new Date(c.due_date) < now && c.status !== 'settled')

  const filtered = creditors.filter(c => {
    if (!q) return true
    return (c.supplier_name || '').toLowerCase().includes(q.toLowerCase())
  })

  const statusBadge = c => {
    if (c.status === 'settled') return <Badge variant="success" label="Settled" />
    if (c.due_date && new Date(c.due_date) < now) return <Badge variant="danger" label="Overdue" />
    if (c.status === 'partially_paid') return <Badge variant="warning" label="Partial" />
    return <Badge variant="info" label="Outstanding" />
  }

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Creditors"
        action={<button className="sap-btn sap-btn-ghost" onClick={() => window.print()}>Print</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <StatCard
          label="Total Outstanding"
          value={`PKR ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${creditors.filter(c => c.status !== 'settled').length} active creditors`}
          accent="danger"
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          sub={overdue.length > 0 ? 'Past due date' : 'None overdue'}
          accent={overdue.length > 0 ? 'danger' : 'success'}
        />
      </div>

      <SearchBar value={q} onChange={setQ} placeholder="Search by supplier…" />

      <DataTable
        columns={[
          { key: 'supplier_name', label: 'Supplier' },
          { key: 'amount_owed', label: 'Total Owed', render: c => `PKR ${Number(c.amount_owed).toLocaleString()}` },
          { key: 'total_paid', label: 'Paid', render: c => `PKR ${Number(c.total_paid || 0).toLocaleString()}` },
          { key: 'remaining', label: 'Remaining', render: c => {
            const rem = Math.max(0, c.amount_owed - c.total_paid)
            return <span style={{ fontWeight: 700, color: rem > 0 ? 'var(--danger)' : 'var(--success)' }}>PKR {rem.toLocaleString()}</span>
          }},
          { key: 'due_date', label: 'Due Date', render: c => c.due_date ? new Date(c.due_date).toLocaleDateString() : '—' },
          { key: 'status', label: 'Status', render: statusBadge },
          { key: 'actions', label: '', render: c => c.status !== 'settled' ? (
            <button className="sap-btn-link" onClick={e => { e.stopPropagation(); setPayModal(c); setAmount(''); setNotes(''); setError('') }}>
              Record Payment
            </button>
          ) : null, style: { width: '1px', whiteSpace: 'nowrap' }},
        ]}
        rows={filtered}
        emptyMessage={q ? 'No creditors match your search' : 'No creditors yet'}
      />

      {payModal && (
        <Modal title={`Record Payment — ${payModal.supplier_name}`} onClose={() => setPayModal(null)}>
          {error && <div className="sap-error">{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="sap-label">Amount Paid (PKR)</label>
              <input className="sap-input" type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="sap-label">Notes (optional)</label>
              <input className="sap-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment notes…" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button className="sap-btn sap-btn-ghost" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="sap-btn sap-btn-primary" onClick={handlePay} disabled={saving}>
                {saving ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Visual check**

Open http://localhost:5173/creditors. Verify:
- Two stat cards (Total Outstanding, Overdue count)
- Search filters by supplier name
- Table shows all columns including Remaining (red if owed)
- "Record Payment" button opens the modal
- Modal has dark panel styling

- [ ] **Step 3: Commit**

```bash
cd /Users/irfan/shaukat-abbas-pesticides
git add frontend/src/pages/Creditors.jsx
git commit -m "feat: migrate Creditors page to shared widgets with StatCard + SearchBar + DataTable"
```

---

## Task 9: Debtors page migration

**Files:**
- Modify: `frontend/src/pages/Debtors.jsx`

- [ ] **Step 1: Rewrite Debtors.jsx**

Replace the entire file:

```jsx
// frontend/src/pages/Debtors.jsx
import { useEffect, useState } from 'react'
import { getDebtors, recordDebtorPayment } from '../api/client'
import Modal from '../components/Modal'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import SearchBar from '../components/ui/SearchBar'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import { useToast } from '../components/Toast'

export default function Debtors() {
  const [debtors, setDebtors] = useState([])
  const [payModal, setPayModal] = useState(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const toast = useToast()

  const load = () => getDebtors().then(setDebtors)
  useEffect(() => { load() }, [])

  const handlePay = async () => {
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) return setError('Please enter a valid amount')
    try {
      setError(''); setSaving(true)
      await recordDebtorPayment(payModal.id, {
        date: new Date().toISOString(),
        amount_paid: amt,
        notes,
      })
      setPayModal(null); setAmount(''); setNotes('')
      load()
      toast('Payment recorded')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error recording payment')
    } finally { setSaving(false) }
  }

  const now = new Date()
  const total = debtors.reduce((s, d) => s + Math.max(0, d.amount_owed - d.total_paid), 0)
  const overdue = debtors.filter(d => d.due_date && new Date(d.due_date) < now && d.status !== 'settled')

  const filtered = debtors.filter(d => {
    if (!q) return true
    return (d.customer_name || '').toLowerCase().includes(q.toLowerCase())
  })

  const statusBadge = d => {
    if (d.status === 'settled') return <Badge variant="success" label="Settled" />
    if (d.due_date && new Date(d.due_date) < now) return <Badge variant="danger" label="Overdue" />
    if (d.status === 'partially_paid') return <Badge variant="warning" label="Partial" />
    return <Badge variant="info" label="Outstanding" />
  }

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Debtors"
        action={<button className="sap-btn sap-btn-ghost" onClick={() => window.print()}>Print</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <StatCard
          label="Total Receivable"
          value={`PKR ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${debtors.filter(d => d.status !== 'settled').length} active debtors`}
          accent="warning"
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          sub={overdue.length > 0 ? 'Past due date' : 'None overdue'}
          accent={overdue.length > 0 ? 'danger' : 'success'}
        />
      </div>

      <SearchBar value={q} onChange={setQ} placeholder="Search by customer…" />

      <DataTable
        columns={[
          { key: 'customer_name', label: 'Customer' },
          { key: 'amount_owed', label: 'Total Owed', render: d => `PKR ${Number(d.amount_owed).toLocaleString()}` },
          { key: 'total_paid', label: 'Paid', render: d => `PKR ${Number(d.total_paid || 0).toLocaleString()}` },
          { key: 'remaining', label: 'Remaining', render: d => {
            const rem = Math.max(0, d.amount_owed - d.total_paid)
            return <span style={{ fontWeight: 700, color: rem > 0 ? 'var(--warning)' : 'var(--success)' }}>PKR {rem.toLocaleString()}</span>
          }},
          { key: 'due_date', label: 'Due Date', render: d => d.due_date ? new Date(d.due_date).toLocaleDateString() : '—' },
          { key: 'status', label: 'Status', render: statusBadge },
          { key: 'actions', label: '', render: d => d.status !== 'settled' ? (
            <button className="sap-btn-link" onClick={e => { e.stopPropagation(); setPayModal(d); setAmount(''); setNotes(''); setError('') }}>
              Record Payment
            </button>
          ) : null, style: { width: '1px', whiteSpace: 'nowrap' }},
        ]}
        rows={filtered}
        emptyMessage={q ? 'No debtors match your search' : 'No outstanding debtors'}
      />

      {payModal && (
        <Modal title={`Record Payment — ${payModal.customer_name}`} onClose={() => setPayModal(null)}>
          {error && <div className="sap-error">{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="sap-label">Amount Received (PKR)</label>
              <input className="sap-input" type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="sap-label">Notes (optional)</label>
              <input className="sap-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment notes…" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button className="sap-btn sap-btn-ghost" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="sap-btn sap-btn-primary" onClick={handlePay} disabled={saving}>
                {saving ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Visual check**

Open http://localhost:5173/debtors. Verify:
- Two stat cards (Total Receivable in orange, Overdue count)
- Search bar filters
- Table shows all columns
- Record Payment modal works

- [ ] **Step 3: Commit**

```bash
cd /Users/irfan/shaukat-abbas-pesticides
git add frontend/src/pages/Debtors.jsx
git commit -m "feat: migrate Debtors page to shared widgets with StatCard + SearchBar + DataTable"
```

---

## Task 10: Customers page migration

**Files:**
- Modify: `frontend/src/pages/Customers.jsx`

- [ ] **Step 1: Rewrite Customers.jsx**

Replace the entire file:

```jsx
// frontend/src/pages/Customers.jsx
import { useEffect, useState } from 'react'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/client'
import Modal from '../components/Modal'
import PageHeader from '../components/ui/PageHeader'
import SearchBar from '../components/ui/SearchBar'
import DataTable from '../components/ui/DataTable'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'

const EMPTY = { name: '', phone: '', address: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const toast = useToast()
  const { confirm } = useConfirm()

  const load = () => getCustomers().then(setCustomers)
  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(EMPTY); setModal('add'); setError('') }
  const openEdit = (c) => { setForm(c); setModal(c); setError('') }

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Customer name is required')
    try {
      setError(''); setSaving(true)
      if (modal === 'add') await createCustomer(form)
      else await updateCustomer(modal.id, form)
      await load()
      setModal(null)
      toast(modal === 'add' ? 'Customer added' : 'Customer updated')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error saving customer')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const yes = await confirm('Delete this customer? This cannot be undone.')
    if (!yes) return
    try {
      await deleteCustomer(id)
      load()
      toast('Customer deleted')
    } catch (e) { toast(e.response?.data?.detail || 'Failed to delete customer', 'error') }
  }

  const filtered = customers.filter(c => {
    if (!q) return true
    const lower = q.toLowerCase()
    return c.name.toLowerCase().includes(lower) ||
      (c.phone || '').toLowerCase().includes(lower)
  })

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <PageHeader
        title="Customers"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => window.print()}>Print</button>
            <button className="sap-btn sap-btn-primary" onClick={openAdd}>+ Add Customer</button>
          </div>
        }
      />

      <SearchBar value={q} onChange={setQ} placeholder="Search by name or phone…" />

      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'phone', label: 'Phone', render: c => c.phone || '—' },
          { key: 'address', label: 'Address', render: c => c.address || '—' },
          { key: 'actions', label: '', render: c => (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="sap-btn-link" onClick={e => { e.stopPropagation(); openEdit(c) }}>Edit</button>
              <button className="sap-btn-link-muted" onClick={e => { e.stopPropagation(); handleDelete(c.id) }}>Delete</button>
            </div>
          ), style: { width: '1px', whiteSpace: 'nowrap' }},
        ]}
        rows={filtered}
        emptyMessage={q ? 'No customers match your search' : 'No customers yet'}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add Customer' : 'Edit Customer'} onClose={() => setModal(null)}>
          {error && <div className="sap-error">{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[['name', 'Name *'], ['phone', 'Phone'], ['address', 'Address']].map(([field, label]) => (
              <div key={field}>
                <label className="sap-label">{label}</label>
                <input
                  className="sap-input"
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={label.replace(' *', '')}
                />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button className="sap-btn sap-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="sap-btn sap-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Customer' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Visual check**

Open http://localhost:5173/customers. Verify:
- PageHeader with Print + Add Customer buttons
- Search filters by name/phone
- Table shows Name, Phone, Address, actions
- Add/Edit modal has dark panel

- [ ] **Step 3: Commit**

```bash
cd /Users/irfan/shaukat-abbas-pesticides
git add frontend/src/pages/Customers.jsx
git commit -m "feat: migrate Customers page to shared PageHeader + SearchBar + DataTable widgets"
```

---

## Task 11: Print stylesheet

**Files:**
- Modify: `frontend/src/index.css` (append to end)

- [ ] **Step 1: Append print styles to index.css**

Add the following block at the very end of `frontend/src/index.css`:

```css
/* ── Print export ──────────────────────────── */
@media print {
  /* Hide chrome */
  aside,
  nav,
  .no-print,
  .sap-btn,
  .sap-btn-link,
  .sap-btn-link-muted { display: none !important; }

  /* Force white background and black text on everything */
  body, main, .sap-page {
    background: #ffffff !important;
    color: #000000 !important;
  }

  .sap-card,
  .sap-table thead th,
  .sap-table tbody td {
    background: #ffffff !important;
    color: #000000 !important;
    border-color: #cccccc !important;
  }

  /* Full width — no sidebar margin */
  main { padding: 16px !important; }

  /* No page break inside table rows */
  tr { page-break-inside: avoid; }

  /* Make table fill page */
  .sap-table { width: 100%; }
}
```

- [ ] **Step 2: Verify print output**

Open http://localhost:5173/sales. Click Print. In the browser's print preview:
- Sidebar should be hidden
- Search bar and button row should be hidden
- Table should show with white background and black text
- Sales rows should all be visible

Repeat for Creditors, Debtors, Customers, Products.

- [ ] **Step 3: Commit**

```bash
cd /Users/irfan/shaukat-abbas-pesticides
git add frontend/src/index.css
git commit -m "feat: add print stylesheet — hides chrome, white background for all list pages"
```

---

## Done

After Task 11, run the full backend test suite one final time:

```bash
cd /Users/irfan/shaukat-abbas-pesticides/backend
python -m pytest tests/ -v
```

Expected: all tests pass with no failures.

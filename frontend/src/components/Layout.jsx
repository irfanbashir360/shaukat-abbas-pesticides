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

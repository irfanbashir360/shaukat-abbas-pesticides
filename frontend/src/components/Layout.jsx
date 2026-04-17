import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/products',  label: 'Products'  },
  { to: '/purchases', label: 'Purchases' },
  { to: '/sales',     label: 'Sales'     },
  { to: '/invoices',  label: 'Invoices'  },
  { to: '/creditors', label: 'Creditors' },
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
        background: 'var(--forest)',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Brand */}
        <div style={{
          padding: '28px 22px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 700, fontSize: '16px',
            color: '#fff', lineHeight: 1.25, letterSpacing: '-0.01em',
          }}>
            Shaukat Abbas
          </div>
          <div style={{
            fontSize: '9.5px', fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.32)', marginTop: '2px',
          }}>
            Pesticides
          </div>
          <div style={{
            width: '28px', height: '2.5px',
            background: 'var(--amber)', borderRadius: '2px', marginTop: '14px',
          }} />
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
                color: isActive ? '#fff' : 'rgba(255,255,255,0.46)',
                textDecoration: 'none',
                transition: 'color 0.12s, background 0.12s',
                background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                borderLeft: isActive ? '2.5px solid var(--amber)' : '2.5px solid transparent',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer badge */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          fontSize: '10px', fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.16)',
        }}>
          SAP Inventory v1.0
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────── */}
      <main style={{
        flex: 1, overflowY: 'auto',
        background: 'var(--cream)',
        padding: '32px 36px',
      }}>
        <Outlet />
      </main>
    </div>
  )
}

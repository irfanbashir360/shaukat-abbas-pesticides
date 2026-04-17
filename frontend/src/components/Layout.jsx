import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/products', label: 'Products' },
  { to: '/purchases', label: 'Purchases' },
  { to: '/sales', label: 'Sales' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/creditors', label: 'Creditors' },
  { to: '/suppliers', label: 'Suppliers' },
  { to: '/customers', label: 'Customers' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-56 bg-green-800 text-white flex flex-col">
        <div className="p-4 border-b border-green-700">
          <h1 className="text-sm font-bold leading-tight">Shaukat Abbas Pesticides</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {links.map(({ to, label }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm hover:bg-green-700 transition-colors ${isActive ? 'bg-green-900 font-semibold' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, dismissPaymentAlert, dismissValidityAlert } from '../api/client'
import StatusBadge from '../components/StatusBadge'

function SummaryCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-green-800 mt-1">PKR {Number(value).toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const navigate = useNavigate()

  const load = () => getDashboard().then(setData)
  useEffect(() => { load() }, [])

  if (!data) return <p className="text-gray-500">Loading…</p>

  const handleDismissPayment = async (id) => { await dismissPaymentAlert(id); load() }
  const handleDismissValidity = async (id) => { await dismissValidityAlert(id); load() }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Today's Sales" value={data.today_sales} />
        <SummaryCard label="This Month's Sales" value={data.month_sales} />
        <SummaryCard label="This Month's Purchases" value={data.month_purchases} />
        <SummaryCard label="Net Profit (Month)" value={data.net_profit}
          sub={data.net_profit >= 0 ? '▲ Profitable' : '▼ Loss'} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Low stock */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Low Stock Alerts</h2>
          {data.low_stock_products.length === 0
            ? <p className="text-sm text-gray-400">All stock levels are healthy.</p>
            : data.low_stock_products.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{p.name} <span className="text-gray-400">({p.category})</span></span>
                <StatusBadge status="low" label={`${p.current_stock} ${p.unit}`} />
              </div>
            ))
          }
        </div>

        {/* Creditors */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Creditors Summary</h2>
          <p className="text-2xl font-bold text-red-700">PKR {Number(data.creditors_total_owed).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Total outstanding</p>
          {data.creditors_overdue_count > 0 && (
            <p className="text-sm text-red-600 mt-2 font-medium">
              {data.creditors_overdue_count} overdue creditor(s)
            </p>
          )}
          <button onClick={() => navigate('/creditors')}
            className="mt-3 text-sm text-green-700 underline">View creditors →</button>
        </div>
      </div>

      {/* Invoice alerts */}
      {(data.payment_due_alerts.length > 0 || data.validity_expiry_alerts.length > 0) && (
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Invoice Alerts</h2>

          {data.payment_due_alerts.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-orange-700 mb-2">Payment Due Soon / Overdue</h3>
              {data.payment_due_alerts.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm font-medium">{inv.invoice_number}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      Due: {new Date(inv.payment_due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="text-xs text-blue-600 underline">View</button>
                    <button onClick={() => handleDismissPayment(inv.id)}
                      className="text-xs text-gray-400 underline">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.validity_expiry_alerts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-700 mb-2">Validity Expiring Soon / Expired</h3>
              {data.validity_expiry_alerts.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm font-medium">{inv.invoice_number}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      Valid until: {new Date(inv.validity_expiry_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="text-xs text-blue-600 underline">View</button>
                    <button onClick={() => handleDismissValidity(inv.id)}
                      className="text-xs text-gray-400 underline">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3">
        <button onClick={() => navigate('/sales')}
          className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 text-sm">New Sale</button>
        <button onClick={() => navigate('/purchases')}
          className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 text-sm">New Purchase</button>
        <button onClick={() => navigate('/invoices')}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm">New Invoice</button>
      </div>
    </div>
  )
}

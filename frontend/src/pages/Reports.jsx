import { useState } from 'react'
import { getSalesReport, getPurchasesReport, getStockReport, getCreditorsReport } from '../api/client'
import StatusBadge from '../components/StatusBadge'

const TABS = ['Sales', 'Purchases', 'Stock', 'Creditors']

export default function Reports() {
  const [tab, setTab] = useState('Sales')
  const [rows, setRows] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const params = {}
    if (dateFrom) params.date_from = new Date(dateFrom).toISOString()
    if (dateTo)   params.date_to   = new Date(dateTo).toISOString()
    let data
    if (tab === 'Sales')      data = await getSalesReport(params)
    if (tab === 'Purchases')  data = await getPurchasesReport(params)
    if (tab === 'Stock')      data = await getStockReport()
    if (tab === 'Creditors')  data = await getCreditorsReport()
    setRows(data)
    setLoading(false)
  }

  const handlePrint = () => window.print()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <button onClick={handlePrint} className="px-4 py-2 border rounded text-sm">Print</button>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setRows([]) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500'}`}>
            {t}
          </button>
        ))}
      </div>

      {(tab === 'Sales' || tab === 'Purchases') && (
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" className="border rounded px-3 py-2 text-sm"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" className="border rounded px-3 py-2 text-sm"
              value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button onClick={load} className="px-4 py-2 bg-green-700 text-white rounded text-sm">Run</button>
        </div>
      )}

      {(tab === 'Stock' || tab === 'Creditors') && (
        <button onClick={load} className="px-4 py-2 bg-green-700 text-white rounded text-sm">Run</button>
      )}

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      {rows.length > 0 && tab === 'Sales' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{r.customer}</td>
                  <td className="px-4 py-2">{r.product}</td>
                  <td className="px-4 py-2 capitalize">{r.category}</td>
                  <td className="px-4 py-2 text-right">{r.quantity}</td>
                  <td className="px-4 py-2 text-right font-medium">PKR {r.total.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50 font-semibold">
                <td colSpan={5} className="px-4 py-2 text-right">Grand Total</td>
                <td className="px-4 py-2 text-right">PKR {rows.reduce((s, r) => s + r.total, 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && tab === 'Purchases' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Supplier</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{r.supplier}</td>
                  <td className="px-4 py-2 text-right font-medium">PKR {r.total.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50 font-semibold">
                <td colSpan={2} className="px-4 py-2 text-right">Grand Total</td>
                <td className="px-4 py-2 text-right">PKR {rows.reduce((s, r) => s + r.total, 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && tab === 'Stock' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Stock</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Threshold</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2 capitalize">{r.category}</td>
                  <td className="px-4 py-2 text-right">{r.current_stock} {r.unit}</td>
                  <td className="px-4 py-2 text-right">{r.low_stock_threshold} {r.unit}</td>
                  <td className="px-4 py-2"><StatusBadge status={r.is_low ? 'low' : 'ok'} label={r.is_low ? 'Low' : 'OK'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && tab === 'Creditors' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Supplier</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Owed</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Paid</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Balance</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Due Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{r.supplier}</td>
                  <td className="px-4 py-2 text-right">PKR {r.amount_owed.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">PKR {r.total_paid.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-semibold">PKR {r.balance.toLocaleString()}</td>
                  <td className="px-4 py-2">{new Date(r.due_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

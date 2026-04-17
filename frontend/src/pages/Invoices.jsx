import { useEffect, useState } from 'react'
import { getInvoices } from '../api/client'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'

function invoiceStatus(inv) {
  const now = new Date()
  if (inv.is_paid) return { status: 'paid', label: 'Paid' }
  if (new Date(inv.payment_due_date) < now) return { status: 'overdue', label: 'Overdue' }
  return { status: 'unpaid', label: 'Unpaid' }
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => { getInvoices().then(setInvoices) }, [])

  const filtered = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
        <input placeholder="Search invoice number…" className="border rounded px-3 py-2 text-sm w-56"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Invoice #</th>
              <th className="px-4 py-3 font-medium text-gray-600">Issued</th>
              <th className="px-4 py-3 font-medium text-gray-600">Payment Due</th>
              <th className="px-4 py-3 font-medium text-gray-600">Valid Until</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const { status, label } = invoiceStatus(inv)
              return (
                <tr key={inv.id} className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <td className="px-4 py-3 font-medium text-green-800">{inv.invoice_number}</td>
                  <td className="px-4 py-3">{new Date(inv.issued_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{new Date(inv.payment_due_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{new Date(inv.validity_expiry_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={status} label={label} /></td>
                  <td className="px-4 py-3 text-blue-600 text-xs">View →</td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No invoices found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

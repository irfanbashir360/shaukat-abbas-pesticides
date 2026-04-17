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
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h1 className="sap-h1">Invoices</h1>
        <input className="sap-input" placeholder="Search invoice number…"
          style={{ width: '220px' }}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="sap-card" style={{ overflow: 'hidden' }}>
        <table className="sap-table">
          <thead>
            <tr><th>Invoice #</th><th>Issued</th><th>Payment Due</th><th>Valid Until</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const { status, label } = invoiceStatus(inv)
              return (
                <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <td style={{ fontWeight: 700, color: 'var(--amber)' }}>{inv.invoice_number}</td>
                  <td>{new Date(inv.issued_date).toLocaleDateString()}</td>
                  <td>{new Date(inv.payment_due_date).toLocaleDateString()}</td>
                  <td>{new Date(inv.validity_expiry_date).toLocaleDateString()}</td>
                  <td><StatusBadge status={status} label={label} /></td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>View →</td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="sap-empty">No invoices found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

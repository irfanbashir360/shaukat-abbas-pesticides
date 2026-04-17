import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getInvoice, markInvoicePaid, getInvoicePdfUrl } from '../api/client'
import StatusBadge from '../components/StatusBadge'

export default function InvoiceDetail() {
  const { id } = useParams()
  const [inv, setInv] = useState(null)

  const load = () => getInvoice(id).then(setInv)
  useEffect(() => { load() }, [id])

  if (!inv) return <p className="text-gray-500">Loading…</p>

  const now = new Date()
  const payStatus = inv.is_paid ? 'paid' : new Date(inv.payment_due_date) < now ? 'overdue' : 'unpaid'
  const valStatus = new Date(inv.validity_expiry_date) < now ? 'overdue' : 'ok'

  const handleMarkPaid = async () => { await markInvoicePaid(inv.id); load() }
  const handlePrint = () => window.print()
  const handlePdf = () => window.open(getInvoicePdfUrl(inv.id), '_blank')

  return (
    <div className="max-w-2xl space-y-6" id="invoice-print">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold text-gray-800">Invoice {inv.invoice_number}</h1>
        <div className="flex gap-2">
          {!inv.is_paid && (
            <button onClick={handleMarkPaid}
              className="px-4 py-2 bg-green-700 text-white rounded text-sm">Mark Paid</button>
          )}
          <button onClick={handlePrint}
            className="px-4 py-2 border rounded text-sm">Print</button>
          <button onClick={handlePdf}
            className="px-4 py-2 bg-blue-700 text-white rounded text-sm">Export PDF</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="border-b-2 border-green-800 pb-4 mb-4">
          <h2 className="text-xl font-bold text-green-800">Shaukat Abbas Pesticides</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-gray-500">Invoice Number</p>
            <p className="font-semibold">{inv.invoice_number}</p>
          </div>
          <div>
            <p className="text-gray-500">Issued Date</p>
            <p className="font-semibold">{new Date(inv.issued_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Payment Due</p>
            <p className="font-semibold">{new Date(inv.payment_due_date).toLocaleDateString()}</p>
            <StatusBadge status={payStatus} label={payStatus === 'paid' ? 'Paid' : payStatus === 'overdue' ? 'Overdue' : 'Pending'} />
          </div>
          <div>
            <p className="text-gray-500">Valid Until</p>
            <p className="font-semibold">{new Date(inv.validity_expiry_date).toLocaleDateString()}</p>
            <StatusBadge status={valStatus} label={valStatus === 'overdue' ? 'Expired' : 'Valid'} />
          </div>
        </div>
      </div>
    </div>
  )
}

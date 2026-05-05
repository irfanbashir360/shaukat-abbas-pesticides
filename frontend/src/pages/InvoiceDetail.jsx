import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getInvoice, markInvoicePaid, getInvoicePdfUrl } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../components/Toast'

export default function InvoiceDetail() {
  const { id } = useParams()
  const [inv, setInv] = useState(null)
  const [marking, setMarking] = useState(false)
  const toast = useToast()

  const load = () => getInvoice(id).then(setInv).catch(() => toast('Failed to load invoice', 'error'))
  useEffect(() => { load() }, [id])

  if (!inv) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
      <div style={{ color: 'var(--text-faint)', fontSize: '14px' }}>Loading…</div>
    </div>
  )

  const now = new Date()
  const payStatus = inv.is_paid ? 'paid' : new Date(inv.payment_due_date) < now ? 'overdue' : 'unpaid'
  const valStatus = new Date(inv.validity_expiry_date) < now ? 'overdue' : 'ok'

  const handleMarkPaid = async () => {
    try {
      setMarking(true)
      await markInvoicePaid(inv.id)
      load()
      toast('Invoice marked as paid')
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to mark paid', 'error')
    } finally { setMarking(false) }
  }

  return (
    <div className="sap-page" style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="sap-section-title" style={{ marginBottom: '4px' }}>Invoice</div>
          <h1 className="sap-h1">{inv.invoice_number}</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!inv.is_paid && (
            <button className="sap-btn sap-btn-primary" onClick={handleMarkPaid} disabled={marking}>
              {marking ? 'Saving…' : 'Mark Paid'}
            </button>
          )}
          <button className="sap-btn sap-btn-ghost" onClick={() => window.open(getInvoicePdfUrl(inv.id), '_blank')}>Print</button>
        </div>
      </div>

      <div className="sap-card" style={{ padding: '32px' }}>
        <div style={{
          borderBottom: '2.5px solid var(--navy)',
          paddingBottom: '20px', marginBottom: '24px',
        }}>
          <div style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '22px', fontWeight: 700,
            color: 'var(--navy)', letterSpacing: '-0.01em',
          }}>
            Shaukat Abbas Pesticides
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Official Tax Invoice
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {[
            { label: 'Invoice Number', value: inv.invoice_number, mono: true },
            { label: 'Issued Date', value: new Date(inv.issued_date).toLocaleDateString() },
            { label: 'Payment Due', value: new Date(inv.payment_due_date).toLocaleDateString(), badge: <StatusBadge status={payStatus} label={payStatus === 'paid' ? 'Paid' : payStatus === 'overdue' ? 'Overdue' : 'Pending'} /> },
            { label: 'Valid Until', value: new Date(inv.validity_expiry_date).toLocaleDateString(), badge: <StatusBadge status={valStatus} label={valStatus === 'overdue' ? 'Expired' : 'Valid'} /> },
          ].map(({ label, value, badge, mono }) => (
            <div key={label}>
              <div className="sap-section-title" style={{ marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? '0.04em' : 'inherit' }}>
                {value}
              </div>
              {badge && <div style={{ marginTop: '6px' }}>{badge}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

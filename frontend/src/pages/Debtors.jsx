import { useEffect, useState } from 'react'
import { getDebtors, recordDebtorPayment } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'

export default function Debtors() {
  const [debtors, setDebtors] = useState([])
  const [payModal, setPayModal] = useState(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
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
  const total = debtors.reduce((s, d) => s + (d.amount_owed - d.total_paid), 0)

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 className="sap-h1">Debtors</h1>

      <div style={{
        background: 'var(--white)', border: '1px solid rgba(37,99,235,0.20)',
        borderLeft: '4px solid var(--sky)',
        borderRadius: 'var(--r)', padding: '18px 24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div className="sap-section-title" style={{ marginBottom: '6px' }}>Total Receivable</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--sky)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ fontSize: '15px', fontWeight: 600, marginRight: '4px', opacity: 0.7 }}>PKR</span>
            {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="sap-badge">{debtors.length} active</div>
      </div>

      <div className="sap-card" style={{ overflow: 'hidden' }}>
        <table className="sap-table">
          <thead>
            <tr><th>Customer</th><th>Owed</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {debtors.map(d => {
              const isOverdue = new Date(d.due_date) < now && d.status !== 'settled'
              return (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.customer_name}</td>
                  <td>PKR {Number(d.amount_owed).toLocaleString()}</td>
                  <td style={{ color: 'var(--success)' }}>PKR {Number(d.total_paid).toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>PKR {(d.amount_owed - d.total_paid).toLocaleString()}</td>
                  <td>{new Date(d.due_date).toLocaleDateString()}</td>
                  <td>{isOverdue ? <StatusBadge status="overdue" label="Overdue" /> : <StatusBadge status={d.status} />}</td>
                  <td style={{ textAlign: 'right' }}>
                    {d.status !== 'settled' && (
                      <button className="sap-btn-link" onClick={() => { setPayModal(d); setAmount(''); setNotes(''); setError('') }}>
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {debtors.length === 0 && <tr><td colSpan={7} className="sap-empty">No outstanding debtors.</td></tr>}
          </tbody>
        </table>
      </div>

      {payModal && (
        <Modal title="Record Payment" onClose={() => setPayModal(null)}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Customer: <strong style={{ color: 'var(--text)' }}>{payModal.customer_name}</strong>
          </p>
          <p style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--sky)', fontWeight: 600 }}>
            Balance due: PKR {(payModal.amount_owed - payModal.total_paid).toLocaleString()}
          </p>
          {error && <div className="sap-error">{error}</div>}
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Amount Paid (PKR)</label>
            <input className="sap-input" type="number" min="0" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)} autoFocus />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Notes (optional)</label>
            <textarea className="sap-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => setPayModal(null)}>Cancel</button>
            <button className="sap-btn sap-btn-primary" onClick={handlePay} disabled={saving}>
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

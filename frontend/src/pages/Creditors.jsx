import { useEffect, useState } from 'react'
import { getCreditors, recordCreditorPayment } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'

export default function Creditors() {
  const [creditors, setCreditors] = useState([])
  const [payModal, setPayModal] = useState(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const load = () => getCreditors().then(setCreditors)
  useEffect(() => { load() }, [])

  const handlePay = async () => {
    try {
      setError('')
      await recordCreditorPayment(payModal.id, {
        date: new Date().toISOString(),
        amount_paid: parseFloat(amount),
        notes,
      })
      setPayModal(null); setAmount(''); setNotes('')
      load()
    } catch (e) { setError(e.response?.data?.detail || 'Error') }
  }

  const now = new Date()
  const total = creditors.reduce((s, c) => s + (c.amount_owed - c.total_paid), 0)

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 className="sap-h1">Creditors</h1>

      {/* Total outstanding banner */}
      <div style={{
        background: 'var(--white)', border: '1px solid rgba(192,53,48,0.20)',
        borderLeft: '4px solid var(--danger)',
        borderRadius: 'var(--r)', padding: '18px 24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div className="sap-section-title" style={{ marginBottom: '4px' }}>Total Outstanding</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: 'var(--danger)', letterSpacing: '-0.03em' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, marginRight: '4px', opacity: 0.7 }}>PKR</span>
            {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="sap-badge badge-danger">{creditors.filter(c => c.status !== 'settled').length} active</div>
      </div>

      <div className="sap-card" style={{ overflow: 'hidden' }}>
        <table className="sap-table">
          <thead>
            <tr><th>Supplier</th><th>Owed</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {creditors.map(c => {
              const isOverdue = new Date(c.due_date) < now && c.status !== 'settled'
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.supplier_name}</td>
                  <td>PKR {c.amount_owed.toLocaleString()}</td>
                  <td style={{ color: 'var(--success)' }}>PKR {c.total_paid.toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>PKR {(c.amount_owed - c.total_paid).toLocaleString()}</td>
                  <td>{new Date(c.due_date).toLocaleDateString()}</td>
                  <td>{isOverdue ? <StatusBadge status="overdue" label="Overdue" /> : <StatusBadge status={c.status} />}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="sap-btn-link" onClick={() => setPayModal(c)}>Record Payment</button>
                  </td>
                </tr>
              )
            })}
            {creditors.length === 0 && <tr><td colSpan={7} className="sap-empty">No outstanding creditors.</td></tr>}
          </tbody>
        </table>
      </div>

      {payModal && (
        <Modal title={`Record Payment`} onClose={() => setPayModal(null)}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Supplier: <strong>{payModal.supplier_name}</strong></p>
          <p style={{ fontSize: '13px', marginBottom: '16px', color: 'var(--danger)', fontWeight: 600 }}>
            Balance: PKR {(payModal.amount_owed - payModal.total_paid).toLocaleString()}
          </p>
          {error && <div className="sap-error">{error}</div>}
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Amount Paid (PKR)</label>
            <input className="sap-input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Notes</label>
            <textarea className="sap-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => setPayModal(null)}>Cancel</button>
            <button className="sap-btn sap-btn-primary" onClick={handlePay}>Record Payment</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

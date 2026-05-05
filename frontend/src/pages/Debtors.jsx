// frontend/src/pages/Debtors.jsx
import { useEffect, useState } from 'react'
import { getDebtors, recordDebtorPayment } from '../api/client'
import Modal from '../components/Modal'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import SearchBar from '../components/ui/SearchBar'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import { useToast } from '../components/Toast'

export default function Debtors() {
  const [debtors, setDebtors] = useState([])
  const [payModal, setPayModal] = useState(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
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
  const total = debtors.reduce((s, d) => s + Math.max(0, d.amount_owed - d.total_paid), 0)
  const overdue = debtors.filter(d => d.due_date && new Date(d.due_date) < now && d.status !== 'settled')

  const filtered = debtors.filter(d => {
    if (!q) return true
    return (d.customer_name || '').toLowerCase().includes(q.toLowerCase())
  })

  const statusBadge = d => {
    if (d.status === 'settled') return <Badge variant="success" label="Settled" />
    if (d.due_date && new Date(d.due_date) < now) return <Badge variant="danger" label="Overdue" />
    if (d.status === 'partially_paid') return <Badge variant="warning" label="Partial" />
    return <Badge variant="info" label="Outstanding" />
  }

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Debtors"
        action={<button className="sap-btn sap-btn-ghost" onClick={() => window.print()}>Print</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <StatCard
          label="Total Receivable"
          value={`PKR ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${debtors.filter(d => d.status !== 'settled').length} active debtors`}
          accent="warning"
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          sub={overdue.length > 0 ? 'Past due date' : 'None overdue'}
          accent={overdue.length > 0 ? 'danger' : 'success'}
        />
      </div>

      <SearchBar value={q} onChange={setQ} placeholder="Search by customer…" />

      <DataTable
        columns={[
          { key: 'customer_name', label: 'Customer' },
          { key: 'amount_owed', label: 'Total Owed', render: d => `PKR ${Number(d.amount_owed).toLocaleString()}` },
          { key: 'total_paid', label: 'Paid', render: d => `PKR ${Number(d.total_paid || 0).toLocaleString()}` },
          { key: 'remaining', label: 'Remaining', render: d => {
            const rem = Math.max(0, d.amount_owed - d.total_paid)
            return <span style={{ fontWeight: 700, color: rem > 0 ? 'var(--warning)' : 'var(--success)' }}>PKR {rem.toLocaleString()}</span>
          }},
          { key: 'due_date', label: 'Due Date', render: d => d.due_date ? new Date(d.due_date).toLocaleDateString() : '—' },
          { key: 'status', label: 'Status', render: statusBadge },
          { key: 'actions', label: '', render: d => d.status !== 'settled' ? (
            <button className="sap-btn-link" onClick={e => { e.stopPropagation(); setPayModal(d); setAmount(''); setNotes(''); setError('') }}>
              Record Payment
            </button>
          ) : null, style: { width: '1px', whiteSpace: 'nowrap' }},
        ]}
        rows={filtered}
        emptyMessage={q ? 'No debtors match your search' : 'No outstanding debtors'}
      />

      {payModal && (
        <Modal title={`Record Payment — ${payModal.customer_name}`} onClose={() => setPayModal(null)}>
          {error && <div className="sap-error">{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="sap-label">Amount Received (PKR)</label>
              <input className="sap-input" type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="sap-label">Notes (optional)</label>
              <input className="sap-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment notes…" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button className="sap-btn sap-btn-ghost" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="sap-btn sap-btn-primary" onClick={handlePay} disabled={saving}>
                {saving ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

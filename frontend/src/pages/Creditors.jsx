// frontend/src/pages/Creditors.jsx
import { useEffect, useState } from 'react'
import { getCreditors, recordCreditorPayment } from '../api/client'
import Modal from '../components/Modal'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import SearchBar from '../components/ui/SearchBar'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import { useToast } from '../components/Toast'

export default function Creditors() {
  const [creditors, setCreditors] = useState([])
  const [payModal, setPayModal] = useState(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const toast = useToast()

  const load = () => getCreditors().then(setCreditors)
  useEffect(() => { load() }, [])

  const handlePay = async () => {
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) return setError('Please enter a valid amount')
    try {
      setError(''); setSaving(true)
      await recordCreditorPayment(payModal.id, {
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
  const total = creditors.reduce((s, c) => s + Math.max(0, c.amount_owed - c.total_paid), 0)
  const overdue = creditors.filter(c => c.due_date && new Date(c.due_date) < now && c.status !== 'settled')

  const filtered = creditors.filter(c => {
    if (!q) return true
    return (c.supplier_name || '').toLowerCase().includes(q.toLowerCase())
  })

  const statusBadge = c => {
    if (c.status === 'settled') return <Badge variant="success" label="Settled" />
    if (c.due_date && new Date(c.due_date) < now) return <Badge variant="danger" label="Overdue" />
    if (c.status === 'partially_paid') return <Badge variant="warning" label="Partial" />
    return <Badge variant="info" label="Outstanding" />
  }

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Creditors"
        action={<button className="sap-btn sap-btn-ghost" onClick={() => window.print()}>Print</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <StatCard
          label="Total Outstanding"
          value={`PKR ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${creditors.filter(c => c.status !== 'settled').length} active creditors`}
          accent="danger"
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          sub={overdue.length > 0 ? 'Past due date' : 'None overdue'}
          accent={overdue.length > 0 ? 'danger' : 'success'}
        />
      </div>

      <SearchBar value={q} onChange={setQ} placeholder="Search by supplier…" />

      <DataTable
        columns={[
          { key: 'supplier_name', label: 'Supplier' },
          { key: 'amount_owed', label: 'Total Owed', render: c => `PKR ${Number(c.amount_owed).toLocaleString()}` },
          { key: 'total_paid', label: 'Paid', render: c => `PKR ${Number(c.total_paid || 0).toLocaleString()}` },
          { key: 'remaining', label: 'Remaining', render: c => {
            const rem = Math.max(0, c.amount_owed - c.total_paid)
            return <span style={{ fontWeight: 700, color: rem > 0 ? 'var(--danger)' : 'var(--success)' }}>PKR {rem.toLocaleString()}</span>
          }},
          { key: 'due_date', label: 'Due Date', render: c => c.due_date ? new Date(c.due_date).toLocaleDateString() : '—' },
          { key: 'status', label: 'Status', render: statusBadge },
          { key: 'actions', label: '', render: c => c.status !== 'settled' ? (
            <button className="sap-btn-link" onClick={e => { e.stopPropagation(); setPayModal(c); setAmount(''); setNotes(''); setError('') }}>
              Record Payment
            </button>
          ) : null, style: { width: '1px', whiteSpace: 'nowrap' }},
        ]}
        rows={filtered}
        emptyMessage={q ? 'No creditors match your search' : 'No creditors yet'}
      />

      {payModal && (
        <Modal title={`Record Payment — ${payModal.supplier_name}`} onClose={() => setPayModal(null)}>
          {error && <div className="sap-error">{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="sap-label">Amount Paid (PKR)</label>
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

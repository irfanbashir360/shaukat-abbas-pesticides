import { useEffect, useState } from 'react'
import { getPurchases, createPurchase, voidPurchase, getSuppliers, getProducts } from '../api/client'
import LineItemsTable from '../components/LineItemsTable'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'

const today = () => new Date().toISOString().slice(0, 16)
const EMPTY_ITEM = { product_id: '', quantity: 0, unit_price: 0 }
const EMPTY_FORM = { date: today(), supplier_id: '', payment_type: 'cash', notes: '', due_date: '', items: [{ ...EMPTY_ITEM }] }

export default function Purchases() {
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const { prompt } = useConfirm()

  const load = () => getPurchases().then(setPurchases)
  useEffect(() => { load(); getSuppliers().then(setSuppliers); getProducts().then(setProducts) }, [])

  const handleItemChange = (idx, field, val) =>
    setForm(f => { const items = [...f.items]; items[idx] = { ...items[idx], [field]: val }; return { ...f, items } })

  const total = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  const handleSubmit = async () => {
    if (!form.supplier_id) return setError('Please select a supplier')
    if (form.items.length === 0) return setError('Add at least one item')
    if (form.items.some(i => !i.product_id)) return setError('Select a product for every item')
    if (form.items.some(i => i.quantity <= 0)) return setError('All quantities must be greater than 0')
    if (form.items.some(i => i.unit_price <= 0)) return setError('All unit prices must be greater than 0')
    if (form.payment_type === 'credit' && !form.due_date) return setError('Please enter a due date for credit purchase')
    try {
      setError(''); setSaving(true)
      const payload = {
        ...form,
        supplier_id: parseInt(form.supplier_id),
        due_date: form.payment_type === 'credit' ? new Date(form.due_date).toISOString() : null,
        date: new Date(form.date).toISOString(),
        items: form.items.map(i => ({ ...i, product_id: parseInt(i.product_id), quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price) }))
      }
      await createPurchase(payload)
      await load()
      setShowForm(false)
      setForm({ ...EMPTY_FORM, date: today() })
      toast('Purchase recorded successfully')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create purchase')
    } finally { setSaving(false) }
  }

  const handleVoid = async (id) => {
    const reason = await prompt('Enter reason for voiding this purchase:')
    if (!reason) return
    try {
      await voidPurchase(id, reason)
      load()
      toast('Purchase voided')
    } catch (e) { toast(e.response?.data?.detail || 'Failed to void purchase', 'error') }
  }

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h1 className="sap-h1">Purchases</h1>
        <button className="sap-btn sap-btn-primary" onClick={() => setShowForm(true)}>+ New Purchase</button>
      </div>

      {showForm && (
        <Modal title="New Purchase" onClose={() => setShowForm(false)} size="lg">
          {error && <div className="sap-error">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label className="sap-label">Date</label>
              <input className="sap-input" type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="sap-label">Supplier</label>
              <select className="sap-input" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                <option value="">Select supplier…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="sap-label">Payment Type</label>
              <select className="sap-input" value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            {form.payment_type === 'credit' && (
              <div>
                <label className="sap-label">Due Date</label>
                <input className="sap-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            )}
          </div>
          <LineItemsTable items={form.items} products={products}
            onChange={handleItemChange}
            onAdd={() => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}
            onRemove={(idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} />
          <div style={{ textAlign: 'right', fontWeight: 700, margin: '12px 0', fontSize: '15px' }}>
            Total: <span style={{ color: 'var(--amber)' }}>PKR {total.toLocaleString()}</span>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Notes</label>
            <textarea className="sap-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="sap-btn sap-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Save Purchase'}
            </button>
          </div>
        </Modal>
      )}

      <div className="sap-card" style={{ overflow: 'hidden' }}>
        <table className="sap-table">
          <thead><tr><th>Date</th><th>Supplier</th><th>Payment</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {purchases.map(p => (
              <tr key={p.id} className={p.is_voided ? 'voided' : ''}>
                <td>{new Date(p.date).toLocaleDateString()}</td>
                <td style={{ fontWeight: 500 }}>{suppliers.find(s => s.id === p.supplier_id)?.name || '—'}</td>
                <td style={{ textTransform: 'capitalize' }}>{p.payment_type}</td>
                <td style={{ fontWeight: 600 }}>PKR {p.total_amount.toLocaleString()}</td>
                <td>{p.is_voided ? <StatusBadge status="overdue" label="Voided" /> : <StatusBadge status="ok" label="Active" />}</td>
                <td style={{ textAlign: 'right' }}>
                  {!p.is_voided && <button className="sap-btn sap-btn-danger" onClick={() => handleVoid(p.id)}>Void</button>}
                </td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td colSpan={6} className="sap-empty">No purchases yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

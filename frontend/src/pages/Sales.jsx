import { useEffect, useState } from 'react'
import { getSales, createSale, voidSale, getCustomers, getProducts, createInvoice } from '../api/client'
import LineItemsTable from '../components/LineItemsTable'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { useNavigate } from 'react-router-dom'

const today = () => new Date().toISOString().slice(0, 16)
const EMPTY_ITEM = { product_id: '', quantity: 0, unit_price: 0 }

export default function Sales() {
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [invoiceModal, setInvoiceModal] = useState(null)
  const [invForm, setInvForm] = useState({ payment_due_date: '', validity_expiry_date: '' })
  const [form, setForm] = useState({ date: today(), customer_id: '', notes: '', items: [{ ...EMPTY_ITEM }] })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = () => getSales().then(setSales)
  useEffect(() => { load(); getCustomers().then(setCustomers); getProducts().then(setProducts) }, [])

  const handleItemChange = (idx, field, val) =>
    setForm(f => { const items = [...f.items]; items[idx] = { ...items[idx], [field]: val }; return { ...f, items } })

  const total = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  const handleSubmit = async () => {
    if (!form.customer_id) return setError('Please select a customer')
    if (form.items.length === 0) return setError('Add at least one item')
    if (form.items.some(i => !i.product_id)) return setError('Select a product for every item')
    if (form.items.some(i => i.quantity <= 0)) return setError('All quantities must be greater than 0')
    try {
      setError('')
      const payload = {
        ...form,
        customer_id: parseInt(form.customer_id),
        date: new Date(form.date).toISOString(),
        items: form.items.map(i => ({ ...i, product_id: parseInt(i.product_id) }))
      }
      const sale = await createSale(payload)
      await load()
      setShowForm(false)
      if (confirm('Sale recorded. Create invoice now?')) setInvoiceModal(sale)
    } catch (e) { setError(e.response?.data?.detail || 'Failed to create sale') }
  }

  const handleCreateInvoice = async () => {
    try {
      const inv = await createInvoice({
        sale_id: invoiceModal.id,
        payment_due_date: new Date(invForm.payment_due_date).toISOString(),
        validity_expiry_date: new Date(invForm.validity_expiry_date).toISOString(),
      })
      setInvoiceModal(null)
      navigate(`/invoices/${inv.id}`)
    } catch (e) { alert(e.response?.data?.detail || 'Failed to create invoice') }
  }

  const handleVoid = async (id) => {
    const reason = prompt('Reason for voiding?')
    if (!reason) return
    await voidSale(id, reason); load()
  }

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h1 className="sap-h1">Sales</h1>
        <button className="sap-btn sap-btn-primary" onClick={() => setShowForm(true)}>+ New Sale</button>
      </div>

      {showForm && (
        <Modal title="New Sale" onClose={() => setShowForm(false)} size="lg">
          {error && <div className="sap-error">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label className="sap-label">Date</label>
              <input className="sap-input" type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="sap-label">Customer</label>
              <select className="sap-input" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                <option value="">Select customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <LineItemsTable items={form.items} products={products}
            onChange={handleItemChange}
            onAdd={() => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}
            onRemove={(idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} />
          <div style={{ textAlign: 'right', fontWeight: 700, margin: '12px 0', fontSize: '14px' }}>
            Total: <span style={{ color: 'var(--amber)' }}>PKR {total.toFixed(2)}</span>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Notes</label>
            <textarea className="sap-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="sap-btn sap-btn-primary" onClick={handleSubmit}>Save Sale</button>
          </div>
        </Modal>
      )}

      {invoiceModal && (
        <Modal title="Create Invoice" onClose={() => setInvoiceModal(null)}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Set dates for invoice for sale #{invoiceModal.id}</p>
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Payment Due Date</label>
            <input className="sap-input" type="date" value={invForm.payment_due_date} onChange={e => setInvForm(f => ({ ...f, payment_due_date: e.target.value }))} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Validity Expiry Date</label>
            <input className="sap-input" type="date" value={invForm.validity_expiry_date} onChange={e => setInvForm(f => ({ ...f, validity_expiry_date: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => setInvoiceModal(null)}>Skip</button>
            <button className="sap-btn sap-btn-primary" onClick={handleCreateInvoice}>Create Invoice</button>
          </div>
        </Modal>
      )}

      <div className="sap-card" style={{ overflow: 'hidden' }}>
        <table className="sap-table">
          <thead><tr><th>Date</th><th>Customer</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {sales.map(s => (
              <tr key={s.id} className={s.is_voided ? 'voided' : ''}>
                <td>{new Date(s.date).toLocaleDateString()}</td>
                <td style={{ fontWeight: 500 }}>{customers.find(c => c.id === s.customer_id)?.name || '—'}</td>
                <td style={{ fontWeight: 600 }}>PKR {s.total_amount.toLocaleString()}</td>
                <td>{s.is_voided ? <StatusBadge status="overdue" label="Voided" /> : <StatusBadge status="ok" label="Active" />}</td>
                <td style={{ textAlign: 'right' }}>
                  {!s.is_voided && <button className="sap-btn sap-btn-danger" onClick={() => handleVoid(s.id)}>Void</button>}
                </td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={5} className="sap-empty">No sales yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

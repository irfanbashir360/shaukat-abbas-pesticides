import { useEffect, useState } from 'react'
import { getSales, createSale, updateSale, voidSale, getCustomers, getProducts, createInvoice, createCustomer } from '../api/client'
import LineItemsTable from '../components/LineItemsTable'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import { useNavigate } from 'react-router-dom'

const today = () => new Date().toISOString().slice(0, 16)
const EMPTY_ITEM = { product_id: '', quantity: 0, unit_price: 0 }

export default function Sales() {
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingSale, setEditingSale] = useState(null)
  const [invoiceModal, setInvoiceModal] = useState(null)
  const [invForm, setInvForm] = useState({ payment_due_date: '', validity_expiry_date: '' })
  const [form, setForm] = useState({ date: today(), customer_id: '', walkin_name: '', notes: '', items: [{ ...EMPTY_ITEM }] })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const { confirm, prompt } = useConfirm()

  const load = () => getSales().then(setSales)
  useEffect(() => { load(); getCustomers().then(setCustomers); getProducts().then(setProducts) }, [])

  const openEdit = (sale) => {
    setEditingSale(sale)
    setForm({
      date: new Date(sale.date).toISOString().slice(0, 16),
      customer_id: String(sale.customer_id),
      walkin_name: '',
      notes: sale.notes || '',
      items: sale.items.map(i => ({
        product_id: String(i.product_id),
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))
    })
    setError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingSale(null)
    setForm({ date: today(), customer_id: '', walkin_name: '', notes: '', items: [{ ...EMPTY_ITEM }] })
    setError('')
  }

  const handleItemChange = (idx, field, val) =>
    setForm(f => { const items = [...f.items]; items[idx] = { ...items[idx], [field]: val }; return { ...f, items } })

  const total = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  const handleSubmit = async () => {
    const isWalkin = form.customer_id === 'walkin'
    if (!form.customer_id) return setError('Please select a customer')
    if (isWalkin && !form.walkin_name.trim()) return setError('Please enter the walk-in customer name')
    if (form.items.length === 0) return setError('Add at least one item')
    if (form.items.some(i => !i.product_id)) return setError('Select a product for every item')
    if (form.items.some(i => i.quantity <= 0)) return setError('All quantities must be greater than 0')
    if (form.items.some(i => i.unit_price <= 0)) return setError('All unit prices must be greater than 0')
    try {
      setError(''); setSaving(true)
      let customerId
      if (isWalkin) {
        const newCustomer = await createCustomer({ name: form.walkin_name.trim(), phone: '', address: '' })
        customerId = newCustomer.id
        await getCustomers().then(setCustomers)
      } else {
        customerId = parseInt(form.customer_id)
      }
      const payload = {
        date: new Date(form.date).toISOString(),
        customer_id: customerId,
        notes: form.notes,
        items: form.items.map(i => ({ product_id: parseInt(i.product_id), quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price) }))
      }
      let sale
      if (editingSale) {
        sale = await updateSale(editingSale.id, payload)
        toast('Sale updated successfully')
      } else {
        sale = await createSale(payload)
        toast('Sale recorded successfully')
      }
      await load()
      closeForm()
      if (!editingSale) {
        const yes = await confirm('Sale saved. Create invoice now?')
        if (yes) setInvoiceModal(sale)
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create sale')
    } finally { setSaving(false) }
  }

  const handleCreateInvoice = async () => {
    if (!invForm.payment_due_date) return toast('Please enter a payment due date', 'error')
    if (!invForm.validity_expiry_date) return toast('Please enter a validity expiry date', 'error')
    try {
      const inv = await createInvoice({
        sale_id: invoiceModal.id,
        payment_due_date: new Date(invForm.payment_due_date).toISOString(),
        validity_expiry_date: new Date(invForm.validity_expiry_date).toISOString(),
      })
      setInvoiceModal(null)
      setInvForm({ payment_due_date: '', validity_expiry_date: '' })
      toast('Invoice created')
      navigate(`/invoices/${inv.id}`)
    } catch (e) { toast(e.response?.data?.detail || 'Failed to create invoice', 'error') }
  }

  const handleVoid = async (id) => {
    const reason = await prompt('Enter reason for voiding this sale:')
    if (!reason) return
    try {
      await voidSale(id, reason)
      load()
      toast('Sale voided')
    } catch (e) { toast(e.response?.data?.detail || 'Failed to void sale', 'error') }
  }

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h1 className="sap-h1">Sales</h1>
        <button className="sap-btn sap-btn-primary" onClick={() => { setEditingSale(null); setShowForm(true) }}>+ New Sale</button>
      </div>

      {showForm && (
        <Modal title={editingSale ? `Edit Sale #${editingSale.id}` : 'New Sale'} onClose={closeForm} size="lg">
          {error && <div className="sap-error">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label className="sap-label">Date</label>
              <input className="sap-input" type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="sap-label">Customer</label>
              <select className="sap-input" value={form.customer_id}
                onChange={e => setForm(f => ({ ...f, customer_id: e.target.value, walkin_name: '' }))}>
                <option value="">Select customer…</option>
                <option value="walkin">— Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {form.customer_id === 'walkin' && (
                <input
                  className="sap-input"
                  style={{ marginTop: '8px' }}
                  placeholder="Enter customer name"
                  value={form.walkin_name}
                  onChange={e => setForm(f => ({ ...f, walkin_name: e.target.value }))}
                  autoFocus
                />
              )}
            </div>
          </div>
          <LineItemsTable items={form.items} products={products}
            onChange={handleItemChange}
            onAdd={() => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}
            onRemove={(idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} />
          <div style={{ textAlign: 'right', fontWeight: 700, margin: '12px 0', fontSize: '15px' }}>
            Total: <span style={{ color: 'var(--sky)' }}>PKR {total.toLocaleString()}</span>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Notes</label>
            <textarea className="sap-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={closeForm}>Cancel</button>
            <button className="sap-btn sap-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editingSale ? 'Update Sale' : 'Save Sale'}
            </button>
          </div>
        </Modal>
      )}

      {invoiceModal && (
        <Modal title="Create Invoice" onClose={() => setInvoiceModal(null)}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>Set dates for invoice linked to sale #{invoiceModal.id}</p>
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
                  {!s.is_voided && (
                    <span style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button className="sap-btn-link" onClick={() => openEdit(s)}>Edit</button>
                      <button className="sap-btn sap-btn-danger" onClick={() => handleVoid(s.id)}>Void</button>
                    </span>
                  )}
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

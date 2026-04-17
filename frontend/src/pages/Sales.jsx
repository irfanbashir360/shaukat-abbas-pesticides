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
  const [invoiceModal, setInvoiceModal] = useState(null) // sale object
  const [invForm, setInvForm] = useState({ payment_due_date: '', validity_expiry_date: '' })
  const [form, setForm] = useState({ date: today(), customer_id: '', notes: '', items: [{ ...EMPTY_ITEM }] })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = () => getSales().then(setSales)
  useEffect(() => {
    load()
    getCustomers().then(setCustomers)
    getProducts().then(setProducts)
  }, [])

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Sales</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-green-700 text-white rounded text-sm">+ New Sale</button>
      </div>

      {showForm && (
        <Modal title="New Sale" onClose={() => setShowForm(false)}>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="datetime-local" className="w-full border rounded px-3 py-2 text-sm"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select className="w-full border rounded px-3 py-2 text-sm"
                value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                <option value="">Select…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <LineItemsTable items={form.items} products={products}
            onChange={handleItemChange}
            onAdd={() => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}
            onRemove={(idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} />
          <div className="mt-3 text-right font-semibold">Total: PKR {total.toFixed(2)}</div>
          <div className="mb-3 mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-green-700 text-white rounded text-sm">Save Sale</button>
          </div>
        </Modal>
      )}

      {invoiceModal && (
        <Modal title="Create Invoice" onClose={() => setInvoiceModal(null)}>
          <p className="text-sm text-gray-600 mb-4">Set dates for invoice #{invoiceModal.id}</p>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Due Date</label>
            <input type="date" className="w-full border rounded px-3 py-2 text-sm"
              value={invForm.payment_due_date} onChange={e => setInvForm(f => ({ ...f, payment_due_date: e.target.value }))} />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Validity Expiry Date</label>
            <input type="date" className="w-full border rounded px-3 py-2 text-sm"
              value={invForm.validity_expiry_date} onChange={e => setInvForm(f => ({ ...f, validity_expiry_date: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setInvoiceModal(null)} className="px-4 py-2 border rounded text-sm">Skip</button>
            <button onClick={handleCreateInvoice} className="px-4 py-2 bg-green-700 text-white rounded text-sm">Create Invoice</button>
          </div>
        </Modal>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => (
              <tr key={s.id} className={`border-t hover:bg-gray-50 ${s.is_voided ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">{new Date(s.date).toLocaleDateString()}</td>
                <td className="px-4 py-3">{customers.find(c => c.id === s.customer_id)?.name || '—'}</td>
                <td className="px-4 py-3 font-medium">PKR {s.total_amount.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {s.is_voided ? <StatusBadge status="overdue" label="Voided" /> : <StatusBadge status="ok" label="Active" />}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {!s.is_voided && (
                    <button onClick={() => handleVoid(s.id)} className="text-red-500 text-xs hover:underline">Void</button>
                  )}
                </td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No sales yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

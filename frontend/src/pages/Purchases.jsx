import { useEffect, useState } from 'react'
import { getPurchases, createPurchase, voidPurchase, getSuppliers, getProducts } from '../api/client'
import LineItemsTable from '../components/LineItemsTable'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'

const today = () => new Date().toISOString().slice(0, 16)
const EMPTY_ITEM = { product_id: '', quantity: 0, unit_price: 0 }

export default function Purchases() {
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: today(), supplier_id: '', payment_type: 'cash', notes: '', due_date: '', items: [{ ...EMPTY_ITEM }] })
  const [error, setError] = useState('')

  const load = () => getPurchases().then(setPurchases)
  useEffect(() => {
    load()
    getSuppliers().then(setSuppliers)
    getProducts().then(setProducts)
  }, [])

  const handleItemChange = (idx, field, val) =>
    setForm(f => { const items = [...f.items]; items[idx] = { ...items[idx], [field]: val }; return { ...f, items } })
  const handleAddItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))
  const handleRemoveItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const total = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  const handleSubmit = async () => {
    try {
      setError('')
      const payload = {
        ...form,
        supplier_id: parseInt(form.supplier_id),
        due_date: form.payment_type === 'credit' ? new Date(form.due_date).toISOString() : null,
        date: new Date(form.date).toISOString(),
        items: form.items.map(i => ({ ...i, product_id: parseInt(i.product_id) }))
      }
      await createPurchase(payload)
      await load()
      setShowForm(false)
      setForm({ date: today(), supplier_id: '', payment_type: 'cash', notes: '', due_date: '', items: [{ ...EMPTY_ITEM }] })
    } catch (e) { setError(e.response?.data?.detail || 'Failed to create purchase') }
  }

  const handleVoid = async (id) => {
    const reason = prompt('Reason for voiding?')
    if (!reason) return
    await voidPurchase(id, reason); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Purchases</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-green-700 text-white rounded text-sm">+ New Purchase</button>
      </div>

      {showForm && (
        <Modal title="New Purchase" onClose={() => setShowForm(false)}>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="datetime-local" className="w-full border rounded px-3 py-2 text-sm"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select className="w-full border rounded px-3 py-2 text-sm"
                value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                <option value="">Select…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
              <select className="w-full border rounded px-3 py-2 text-sm"
                value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            {form.payment_type === 'credit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" className="w-full border rounded px-3 py-2 text-sm"
                  value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            )}
          </div>
          <LineItemsTable items={form.items} products={products}
            onChange={handleItemChange} onAdd={handleAddItem} onRemove={handleRemoveItem} />
          <div className="mt-3 text-right font-semibold">Total: PKR {total.toFixed(2)}</div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-green-700 text-white rounded text-sm">Save Purchase</button>
          </div>
        </Modal>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Supplier</th>
              <th className="px-4 py-3 font-medium text-gray-600">Payment</th>
              <th className="px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {purchases.map(p => (
              <tr key={p.id} className={`border-t hover:bg-gray-50 ${p.is_voided ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">{new Date(p.date).toLocaleDateString()}</td>
                <td className="px-4 py-3">{suppliers.find(s => s.id === p.supplier_id)?.name || '—'}</td>
                <td className="px-4 py-3 capitalize">{p.payment_type}</td>
                <td className="px-4 py-3 font-medium">PKR {p.total_amount.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {p.is_voided ? <StatusBadge status="overdue" label="Voided" /> : <StatusBadge status="ok" label="Active" />}
                </td>
                <td className="px-4 py-3">
                  {!p.is_voided && (
                    <button onClick={() => handleVoid(p.id)} className="text-red-500 text-xs hover:underline">Void</button>
                  )}
                </td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No purchases yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

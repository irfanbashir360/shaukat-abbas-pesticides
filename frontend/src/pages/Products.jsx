import { useEffect, useState } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/client'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'

const CATEGORIES = ['fertilizer', 'seed', 'pesticide']
const EMPTY = { name: '', category: 'fertilizer', unit: 'kg', price_per_unit: '', current_stock: '', low_stock_threshold: '' }

export default function Products() {
  const [tab, setTab] = useState('fertilizer')
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState(null) // null | 'add' | {editing product}
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')

  const load = () => getProducts(tab).then(setProducts)
  useEffect(() => { load() }, [tab])

  const openAdd = () => { setForm({ ...EMPTY, category: tab }); setModal('add'); setError('') }
  const openEdit = (p) => { setForm({ ...p }); setModal(p); setError('') }
  const closeModal = () => setModal(null)

  const handleSave = async () => {
    try {
      const payload = { ...form, price_per_unit: parseFloat(form.price_per_unit),
        current_stock: parseFloat(form.current_stock), low_stock_threshold: parseFloat(form.low_stock_threshold) }
      if (modal === 'add') await createProduct(payload)
      else await updateProduct(modal.id, payload)
      await load(); closeModal()
    } catch (e) { setError(e.response?.data?.detail || 'Error saving product') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    await deleteProduct(id); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <button onClick={openAdd}
          className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 text-sm">+ Add Product</button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 border-b">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setTab(cat)}
            className={`px-4 py-2 text-sm capitalize font-medium border-b-2 transition-colors ${
              tab === cat ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Products table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 font-medium text-gray-600">Unit</th>
              <th className="px-4 py-3 font-medium text-gray-600">Price/Unit</th>
              <th className="px-4 py-3 font-medium text-gray-600">Stock</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-600">{p.unit}</td>
                <td className="px-4 py-3">PKR {p.price_per_unit.toLocaleString()}</td>
                <td className="px-4 py-3">{p.current_stock} {p.unit}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={p.current_stock <= p.low_stock_threshold ? 'low' : 'ok'}
                    label={p.current_stock <= p.low_stock_threshold ? 'Low Stock' : 'OK'}
                  />
                </td>
                <td className="px-4 py-3 flex gap-2 justify-end">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No {tab}s added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Product' : 'Edit Product'} onClose={closeModal}>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          {[['name','Name','text'],['unit','Unit (kg/bag/litre)','text'],
            ['price_per_unit','Price per Unit','number'],
            ['current_stock','Current Stock','number'],
            ['low_stock_threshold','Low Stock Alert At','number']].map(([field, label, type]) => (
            <div key={field} className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type={type} className="w-full border rounded px-3 py-2 text-sm"
                value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
            </div>
          ))}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className="w-full border rounded px-3 py-2 text-sm"
              value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={closeModal} className="px-4 py-2 border rounded text-sm">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-700 text-white rounded text-sm">Save</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

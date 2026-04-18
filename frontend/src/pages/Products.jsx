import { useEffect, useState } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/client'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'

const CATEGORIES = ['fertilizer', 'seed', 'pesticide']
const EMPTY = { name: '', category: 'fertilizer', unit: 'kg', price_per_unit: '', current_stock: '', low_stock_threshold: '' }

export default function Products() {
  const [tab, setTab] = useState('fertilizer')
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const { confirm } = useConfirm()

  const load = () => getProducts(tab).then(setProducts)
  useEffect(() => { load() }, [tab])

  const openAdd = () => { setForm({ ...EMPTY, category: tab }); setModal('add'); setError('') }
  const openEdit = (p) => { setForm({ ...p }); setModal(p); setError('') }
  const closeModal = () => setModal(null)

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Product name is required')
    const price = parseFloat(form.price_per_unit)
    const stock = parseFloat(form.current_stock)
    const threshold = parseFloat(form.low_stock_threshold)
    if (isNaN(price) || price < 0) return setError('Please enter a valid price')
    if (isNaN(stock) || stock < 0) return setError('Please enter a valid stock quantity')
    if (isNaN(threshold) || threshold < 0) return setError('Please enter a valid low stock threshold')
    try {
      setError(''); setSaving(true)
      const payload = { ...form, price_per_unit: price, current_stock: stock, low_stock_threshold: threshold }
      if (modal === 'add') await createProduct(payload)
      else await updateProduct(modal.id, payload)
      await load()
      closeModal()
      toast(modal === 'add' ? 'Product added' : 'Product updated')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error saving product')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const yes = await confirm('Delete this product? This cannot be undone.')
    if (!yes) return
    try {
      await deleteProduct(id)
      load()
      toast('Product deleted')
    } catch (e) { toast(e.response?.data?.detail || 'Failed to delete product', 'error') }
  }

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h1 className="sap-h1">Products</h1>
        <button className="sap-btn sap-btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      <div className="sap-tabs">
        {CATEGORIES.map(cat => (
          <button key={cat} className={`sap-tab ${tab === cat ? 'active' : ''}`} onClick={() => setTab(cat)}
            style={{ textTransform: 'capitalize' }}>
            {cat}s
          </button>
        ))}
      </div>

      <div className="sap-card" style={{ overflow: 'hidden' }}>
        <table className="sap-table">
          <thead>
            <tr><th>Name</th><th>Unit</th><th>Price / Unit</th><th>Stock</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td style={{ color: 'var(--text-muted)' }}>{p.unit}</td>
                <td>PKR {Number(p.price_per_unit).toLocaleString()}</td>
                <td>{p.current_stock} {p.unit}</td>
                <td>
                  <StatusBadge
                    status={p.current_stock <= p.low_stock_threshold ? 'low' : 'ok'}
                    label={p.current_stock <= p.low_stock_threshold ? 'Low Stock' : 'OK'}
                  />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button className="sap-btn-link" onClick={() => openEdit(p)}>Edit</button>
                    <button className="sap-btn sap-btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                  </span>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={6} className="sap-empty">No {tab}s added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Product' : 'Edit Product'} onClose={closeModal}>
          {error && <div className="sap-error">{error}</div>}
          {[
            ['name', 'Name', 'text'],
            ['unit', 'Unit (kg / bag / litre)', 'text'],
            ['price_per_unit', 'Price per Unit (PKR)', 'number'],
            ['current_stock', 'Current Stock', 'number'],
            ['low_stock_threshold', 'Low Stock Alert At', 'number'],
          ].map(([field, label, type]) => (
            <div key={field} style={{ marginBottom: '14px' }}>
              <label className="sap-label">{label}</label>
              <input className="sap-input" type={type}
                value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
            </div>
          ))}
          <div style={{ marginBottom: '14px' }}>
            <label className="sap-label">Category</label>
            <select className="sap-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="sap-btn sap-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Product'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

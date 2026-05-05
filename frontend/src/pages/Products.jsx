import { useEffect, useState } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct, getUnits } from '../api/client'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import PageHeader from '../components/ui/PageHeader'
import SearchBar from '../components/ui/SearchBar'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'

const CATEGORIES = ['fertilizer', 'seed', 'pesticide']
const EMPTY = { name: '', category: 'fertilizer', unit: '', price_per_unit: '', current_stock: '', low_stock_threshold: '' }

export default function Products() {
  const [tab, setTab] = useState('fertilizer')
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [units, setUnits] = useState([])
  const [q, setQ] = useState('')
  const toast = useToast()
  const { confirm } = useConfirm()

  const load = () => getProducts(tab).then(setProducts)
  useEffect(() => { load() }, [tab])
  useEffect(() => { getUnits().then(setUnits) }, [])

  const openAdd = () => { setForm({ ...EMPTY, category: tab, unit: units[0]?.name || '' }); setModal('add'); setError('') }
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

  const filtered = products.filter(p => {
    if (!q) return true
    const lower = q.toLowerCase()
    return p.name.toLowerCase().includes(lower) ||
      (p.company || '').toLowerCase().includes(lower)
  })

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Products"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => window.print()}>Print</button>
            <button className="sap-btn sap-btn-primary" onClick={openAdd}>+ Add Product</button>
          </div>
        }
      />

      {/* Category tabs */}
      <div className="sap-tabs" style={{ marginBottom: '16px' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} className={`sap-tab${tab === cat ? ' active' : ''}`} onClick={() => setTab(cat)}>
            {cat}
          </button>
        ))}
      </div>

      <SearchBar value={q} onChange={setQ} placeholder="Search by name or company…" />

      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'company', label: 'Company', render: p => p.company || '—' },
          { key: 'unit', label: 'Unit' },
          { key: 'price_per_unit', label: 'Price', render: p => `PKR ${Number(p.price_per_unit).toLocaleString()}` },
          { key: 'current_stock', label: 'Stock', render: p => (
            <span style={{ color: p.current_stock <= p.low_stock_threshold ? 'var(--warning)' : 'var(--text-primary)', fontWeight: 600 }}>
              {p.current_stock} {p.unit}
            </span>
          )},
          { key: 'status', label: 'Status', render: p =>
            p.current_stock <= p.low_stock_threshold
              ? <Badge variant="warning" label="Low Stock" />
              : <Badge variant="success" label="OK" />
          },
          { key: 'actions', label: '', render: p => (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="sap-btn-link" onClick={e => { e.stopPropagation(); openEdit(p) }}>Edit</button>
              <button className="sap-btn-link-muted" onClick={e => { e.stopPropagation(); handleDelete(p.id) }}>Delete</button>
            </div>
          ), style: { width: '1px', whiteSpace: 'nowrap' }},
        ]}
        rows={filtered}
        emptyMessage={q ? 'No products match your search' : `No ${tab} products yet`}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add Product' : 'Edit Product'} onClose={closeModal}>
          {error && <div className="sap-error">{error}</div>}
          {[
            ['name', 'Name', 'text'],
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
            <label className="sap-label">Unit</label>
            <select className="sap-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              {units.length === 0
                ? <option value="">No units — add in Settings</option>
                : units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)
              }
            </select>
          </div>
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

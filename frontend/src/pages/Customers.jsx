// frontend/src/pages/Customers.jsx
import { useEffect, useState } from 'react'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/client'
import Modal from '../components/Modal'
import PageHeader from '../components/ui/PageHeader'
import SearchBar from '../components/ui/SearchBar'
import DataTable from '../components/ui/DataTable'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'

const EMPTY = { name: '', phone: '', address: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const toast = useToast()
  const { confirm } = useConfirm()

  const load = () => getCustomers().then(setCustomers)
  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(EMPTY); setModal('add'); setError('') }
  const openEdit = (c) => { setForm(c); setModal(c); setError('') }

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Customer name is required')
    try {
      setError(''); setSaving(true)
      if (modal === 'add') await createCustomer(form)
      else await updateCustomer(modal.id, form)
      await load()
      setModal(null)
      toast(modal === 'add' ? 'Customer added' : 'Customer updated')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error saving customer')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const yes = await confirm('Delete this customer? This cannot be undone.')
    if (!yes) return
    try {
      await deleteCustomer(id)
      load()
      toast('Customer deleted')
    } catch (e) { toast(e.response?.data?.detail || 'Failed to delete customer', 'error') }
  }

  const filtered = customers.filter(c => {
    if (!q) return true
    const lower = q.toLowerCase()
    return c.name.toLowerCase().includes(lower) ||
      (c.phone || '').toLowerCase().includes(lower)
  })

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <PageHeader
        title="Customers"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => window.print()}>Print</button>
            <button className="sap-btn sap-btn-primary" onClick={openAdd}>+ Add Customer</button>
          </div>
        }
      />

      <SearchBar value={q} onChange={setQ} placeholder="Search by name or phone…" />

      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'phone', label: 'Phone', render: c => c.phone || '—' },
          { key: 'address', label: 'Address', render: c => c.address || '—' },
          { key: 'actions', label: '', render: c => (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="sap-btn-link" onClick={e => { e.stopPropagation(); openEdit(c) }}>Edit</button>
              <button className="sap-btn-link-muted" onClick={e => { e.stopPropagation(); handleDelete(c.id) }}>Delete</button>
            </div>
          ), style: { width: '1px', whiteSpace: 'nowrap' }},
        ]}
        rows={filtered}
        emptyMessage={q ? 'No customers match your search' : 'No customers yet'}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add Customer' : 'Edit Customer'} onClose={() => setModal(null)}>
          {error && <div className="sap-error">{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[['name', 'Name *'], ['phone', 'Phone'], ['address', 'Address']].map(([field, label]) => (
              <div key={field}>
                <label className="sap-label">{label}</label>
                <input
                  className="sap-input"
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={label.replace(' *', '')}
                />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button className="sap-btn sap-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="sap-btn sap-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Customer' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

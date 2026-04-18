import { useEffect, useState } from 'react'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/client'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'

const EMPTY = { name: '', phone: '', address: '' }
const FIELDS = [['name', 'Name'], ['phone', 'Phone'], ['address', 'Address']]

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
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

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h1 className="sap-h1">Customers</h1>
        <button className="sap-btn sap-btn-primary" onClick={openAdd}>+ Add Customer</button>
      </div>
      <div className="sap-card" style={{ overflow: 'hidden' }}>
        <table className="sap-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Address</th><th></th></tr></thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td>{c.phone || '—'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{c.address || '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button className="sap-btn-link" onClick={() => openEdit(c)}>Edit</button>
                    <button className="sap-btn sap-btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
                  </span>
                </td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={4} className="sap-empty">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal === 'add' ? 'Add Customer' : 'Edit Customer'} onClose={() => setModal(null)}>
          {error && <div className="sap-error">{error}</div>}
          {FIELDS.map(([field, label]) => (
            <div key={field} style={{ marginBottom: '14px' }}>
              <label className="sap-label">{label}</label>
              <input className="sap-input" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="sap-btn sap-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

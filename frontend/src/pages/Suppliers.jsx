import { useEffect, useState } from 'react'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/client'
import Modal from '../components/Modal'

const EMPTY = { name: '', phone: '', address: '' }

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')

  const load = () => getSuppliers().then(setSuppliers)
  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(EMPTY); setModal('add'); setError('') }
  const openEdit = (s) => { setForm(s); setModal(s); setError('') }

  const handleSave = async () => {
    try {
      if (modal === 'add') await createSupplier(form)
      else await updateSupplier(modal.id, form)
      await load(); setModal(null)
    } catch (e) { setError(e.response?.data?.detail || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete supplier?')) return
    await deleteSupplier(id); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-green-700 text-white rounded text-sm">+ Add Supplier</button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="px-4 py-3 font-medium text-gray-600">Address</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.phone}</td>
                <td className="px-4 py-3">{s.address}</td>
                <td className="px-4 py-3 flex gap-2 justify-end">
                  <button onClick={() => openEdit(s)} className="text-blue-600 text-xs hover:underline">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 text-xs hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No suppliers yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal === 'add' ? 'Add Supplier' : 'Edit Supplier'} onClose={() => setModal(null)}>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          {[['name','Name'],['phone','Phone'],['address','Address']].map(([field, label]) => (
            <div key={field} className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input className="w-full border rounded px-3 py-2 text-sm"
                value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
            </div>
          ))}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(null)} className="px-4 py-2 border rounded text-sm">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-700 text-white rounded text-sm">Save</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

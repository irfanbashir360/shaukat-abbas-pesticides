import { useEffect, useState } from 'react'
import { getCreditors, recordCreditorPayment } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'

export default function Creditors() {
  const [creditors, setCreditors] = useState([])
  const [payModal, setPayModal] = useState(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const load = () => getCreditors().then(setCreditors)
  useEffect(() => { load() }, [])

  const handlePay = async () => {
    try {
      setError('')
      await recordCreditorPayment(payModal.id, {
        date: new Date().toISOString(),
        amount_paid: parseFloat(amount),
        notes,
      })
      setPayModal(null); setAmount(''); setNotes('')
      load()
    } catch (e) { setError(e.response?.data?.detail || 'Error') }
  }

  const now = new Date()
  const total = creditors.reduce((s, c) => s + (c.amount_owed - c.total_paid), 0)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Creditors</h1>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">Total Outstanding</p>
        <p className="text-2xl font-bold text-red-800">PKR {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Supplier</th>
              <th className="px-4 py-3 font-medium text-gray-600">Owed</th>
              <th className="px-4 py-3 font-medium text-gray-600">Paid</th>
              <th className="px-4 py-3 font-medium text-gray-600">Balance</th>
              <th className="px-4 py-3 font-medium text-gray-600">Due Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {creditors.map(c => {
              const isOverdue = new Date(c.due_date) < now && c.status !== 'settled'
              return (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.supplier_name}</td>
                  <td className="px-4 py-3">PKR {c.amount_owed.toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-700">PKR {c.total_paid.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold">PKR {(c.amount_owed - c.total_paid).toLocaleString()}</td>
                  <td className="px-4 py-3">{new Date(c.due_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {isOverdue
                      ? <StatusBadge status="overdue" label="Overdue" />
                      : <StatusBadge status={c.status} />}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setPayModal(c)}
                      className="text-blue-600 text-xs hover:underline">Record Payment</button>
                  </td>
                </tr>
              )
            })}
            {creditors.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No outstanding creditors.</td></tr>}
          </tbody>
        </table>
      </div>

      {payModal && (
        <Modal title={`Record Payment — ${payModal.supplier_name}`} onClose={() => setPayModal(null)}>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <p className="text-sm text-gray-600 mb-3">
            Balance: PKR {(payModal.amount_owed - payModal.total_paid).toLocaleString()}
          </p>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (PKR)</label>
            <input type="number" min="0" step="0.01" className="w-full border rounded px-3 py-2 text-sm"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setPayModal(null)} className="px-4 py-2 border rounded text-sm">Cancel</button>
            <button onClick={handlePay} className="px-4 py-2 bg-green-700 text-white rounded text-sm">Record</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

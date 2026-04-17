import { useEffect, useState } from 'react'
import { getSettings, updateSettings } from '../api/client'

export default function Settings() {
  const [form, setForm] = useState({ payment_due_alert_days: 3, validity_expiry_alert_days: 7 })
  const [saved, setSaved] = useState(false)

  useEffect(() => { getSettings().then(setForm) }, [])

  const handleSave = async () => {
    await updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="font-semibold text-gray-700">Invoice Alert Thresholds</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alert me X days before payment is due
          </label>
          <input type="number" min="1" max="90" className="w-full border rounded px-3 py-2 text-sm"
            value={form.payment_due_alert_days}
            onChange={e => setForm(f => ({ ...f, payment_due_alert_days: parseInt(e.target.value) }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alert me X days before invoice validity expires
          </label>
          <input type="number" min="1" max="90" className="w-full border rounded px-3 py-2 text-sm"
            value={form.validity_expiry_alert_days}
            onChange={e => setForm(f => ({ ...f, validity_expiry_alert_days: parseInt(e.target.value) }))} />
        </div>
        <button onClick={handleSave}
          className="px-4 py-2 bg-green-700 text-white rounded text-sm">
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

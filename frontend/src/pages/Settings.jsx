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
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 className="sap-h1">Settings</h1>
      <div className="sap-card" style={{ padding: '28px', maxWidth: '480px' }}>
        <div className="sap-h2" style={{ marginBottom: '20px' }}>Invoice Alert Thresholds</div>
        <div style={{ marginBottom: '18px' }}>
          <label className="sap-label">Days before payment due date to alert</label>
          <input className="sap-input" type="number" min="1" max="90"
            value={form.payment_due_alert_days}
            onChange={e => setForm(f => ({ ...f, payment_due_alert_days: parseInt(e.target.value) }))} />
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
            Alert will appear on dashboard this many days before payment is due
          </div>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label className="sap-label">Days before validity expiry to alert</label>
          <input className="sap-input" type="number" min="1" max="90"
            value={form.validity_expiry_alert_days}
            onChange={e => setForm(f => ({ ...f, validity_expiry_alert_days: parseInt(e.target.value) }))} />
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
            Alert will appear on dashboard this many days before invoice expires
          </div>
        </div>
        <button className="sap-btn sap-btn-primary" onClick={handleSave} style={{ minWidth: '140px' }}>
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

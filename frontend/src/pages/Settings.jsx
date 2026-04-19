import { useEffect, useState } from 'react'
import {
  getSettings, updateSettings,
  uploadLogo, deleteLogo, getLogoUrl,
  getUnits, createUnit, deleteUnit,
  exportBackup, importBackup,
} from '../api/client'
import { useToast } from '../components/Toast'

const TABS = [
  { key: 'business', label: 'Business Info' },
  { key: 'alerts',   label: 'Invoice Alerts' },
  { key: 'units',    label: 'Units' },
  { key: 'backup',   label: 'Backup' },
]

const tabBarStyle = {
  display: 'flex',
  borderBottom: '2px solid #e2e8f0',
  marginBottom: '28px',
  gap: '4px',
}

function tabStyle(active) {
  return {
    padding: '10px 22px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14.5px',
    color: active ? '#0f172a' : '#64748b',
    borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
    marginBottom: '-2px',
    transition: 'color 0.15s',
  }
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('business')
  const [settings, setSettings] = useState(null)
  const [units, setUnits] = useState([])
  const [newUnit, setNewUnit] = useState('')
  const [restoreFile, setRestoreFile] = useState(null)
  const [restored, setRestored] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [logoTs, setLogoTs] = useState(Date.now())
  const toast = useToast()

  const loadSettings = () => getSettings().then(setSettings)
  const loadUnits = () => getUnits().then(setUnits)

  useEffect(() => { loadSettings(); loadUnits() }, [])

  const handleLogoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      await uploadLogo(file)
      await loadSettings()
      setLogoTs(Date.now())
      toast('Logo uploaded', 'success')
    } catch {
      toast('Logo upload failed', 'error')
    }
    e.target.value = ''
  }

  const handleRemoveLogo = async () => {
    try {
      await deleteLogo()
      await loadSettings()
      setLogoTs(Date.now())
      toast('Logo removed', 'success')
    } catch {
      toast('Failed to remove logo', 'error')
    }
  }

  const saveBusiness = async () => {
    try {
      await updateSettings({
        business_name:               settings.business_name || '',
        tagline:                     settings.tagline || '',
        address:                     settings.address || '',
        phone:                       settings.phone || '',
        email:                       settings.email || '',
        ntn:                         settings.ntn || '',
        strn:                        settings.strn || '',
        bank_name:                   settings.bank_name || '',
        account_number:              settings.account_number || '',
        iban:                        settings.iban || '',
        footer_note:                 settings.footer_note || '',
        payment_due_alert_days:      settings.payment_due_alert_days,
        validity_expiry_alert_days:  settings.validity_expiry_alert_days,
      })
      toast('Business info saved', 'success')
    } catch {
      toast('Save failed', 'error')
    }
  }

  const saveAlerts = async () => {
    try {
      await updateSettings({
        payment_due_alert_days:     settings.payment_due_alert_days,
        validity_expiry_alert_days: settings.validity_expiry_alert_days,
      })
      toast('Alert settings saved', 'success')
    } catch {
      toast('Save failed', 'error')
    }
  }

  const handleAddUnit = async () => {
    const name = newUnit.trim()
    if (!name) { toast('Enter a unit name', 'error'); return }
    try {
      await createUnit(name)
      setNewUnit('')
      await loadUnits()
      toast(`Unit "${name}" added`, 'success')
    } catch {
      toast('Failed to add unit', 'error')
    }
  }

  const handleDeleteUnit = async (id) => {
    try {
      await deleteUnit(id)
      await loadUnits()
      toast('Unit deleted', 'success')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Cannot delete unit — it may be in use'
      toast(msg, 'error')
    }
  }

  const handleRestore = async () => {
    if (!restoreFile) { toast('Select a .zip backup file first', 'error'); return }
    const ok = window.confirm('This will replace ALL current data and cannot be undone. Are you sure?')
    if (!ok) return
    setRestoring(true)
    try {
      await importBackup(restoreFile)
      setRestored(true)
      toast('Backup restored successfully', 'success')
    } catch {
      toast('Restore failed', 'error')
    } finally {
      setRestoring(false)
    }
  }

  if (!settings) return <div style={{ padding: '40px', color: '#64748b' }}>Loading…</div>

  const field = (label, key, type = 'text', hint = null) => (
    <div style={{ marginBottom: '18px' }}>
      <label className="sap-label">{label}</label>
      <input
        className="sap-input"
        type={type}
        value={settings[key] ?? ''}
        onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
      />
      {hint && <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '5px' }}>{hint}</div>}
    </div>
  )

  return (
    <div className="sap-page">
      <h1 className="sap-h1">Settings</h1>

      <div style={tabBarStyle}>
        {TABS.map(t => (
          <button
            key={t.key}
            style={tabStyle(activeTab === t.key)}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'business' && (
        <div className="sap-card" style={{ padding: '28px', maxWidth: '640px' }}>
          <div className="sap-h2" style={{ marginBottom: '22px' }}>Business Info</div>

          <div style={{ marginBottom: '24px' }}>
            <label className="sap-label">Business Logo</label>
            {settings.logo_filename && (
              <div style={{ marginBottom: '12px' }}>
                <img
                  src={`${getLogoUrl()}?t=${logoTs}`}
                  alt="Business logo"
                  style={{
                    height: '72px',
                    maxWidth: '200px',
                    objectFit: 'contain',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '6px',
                    background: '#fff',
                    display: 'block',
                    marginBottom: '10px',
                  }}
                />
                <button
                  className="sap-btn sap-btn-ghost"
                  onClick={handleRemoveLogo}
                  style={{ fontSize: '13px', color: '#dc2626', borderColor: '#fecaca' }}
                >
                  Remove Logo
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              style={{ display: 'block', marginTop: '8px', fontSize: '13.5px', color: '#0f172a' }}
            />
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '5px' }}>
              Recommended: PNG or SVG, transparent background
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            {field('Business Name', 'business_name')}
            {field('Tagline', 'tagline')}
            {field('Phone', 'phone')}
            {field('Email', 'email')}
            {field('NTN', 'ntn')}
            {field('STRN', 'strn')}
            {field('Bank Name', 'bank_name')}
            {field('Account Number', 'account_number')}
            {field('IBAN', 'iban')}
          </div>

          {field('Address', 'address')}

          <div style={{ marginBottom: '18px' }}>
            <label className="sap-label">Footer Note</label>
            <textarea
              className="sap-input"
              rows={3}
              value={settings.footer_note ?? ''}
              onChange={e => setSettings(s => ({ ...s, footer_note: e.target.value }))}
              style={{ resize: 'vertical', minHeight: '72px' }}
            />
          </div>

          <button className="sap-btn sap-btn-primary" onClick={saveBusiness} style={{ minWidth: '160px' }}>
            Save Business Info
          </button>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="sap-card" style={{ padding: '28px', maxWidth: '480px' }}>
          <div className="sap-h2" style={{ marginBottom: '22px' }}>Invoice Alert Thresholds</div>

          <div style={{ marginBottom: '18px' }}>
            <label className="sap-label">Days before payment due date to alert</label>
            <input
              className="sap-input"
              type="number"
              min="1"
              max="90"
              value={settings.payment_due_alert_days ?? 3}
              onChange={e => setSettings(s => ({ ...s, payment_due_alert_days: parseInt(e.target.value) || 1 }))}
            />
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '5px' }}>
              Alert will appear on dashboard this many days before payment is due
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label className="sap-label">Days before validity expiry to alert</label>
            <input
              className="sap-input"
              type="number"
              min="1"
              max="90"
              value={settings.validity_expiry_alert_days ?? 7}
              onChange={e => setSettings(s => ({ ...s, validity_expiry_alert_days: parseInt(e.target.value) || 1 }))}
            />
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '5px' }}>
              Alert will appear on dashboard this many days before invoice expires
            </div>
          </div>

          <button className="sap-btn sap-btn-primary" onClick={saveAlerts} style={{ minWidth: '160px' }}>
            Save Alert Settings
          </button>
        </div>
      )}

      {activeTab === 'units' && (
        <div className="sap-card" style={{ padding: '28px', maxWidth: '560px' }}>
          <div className="sap-h2" style={{ marginBottom: '22px' }}>Measurement Units</div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input
              className="sap-input"
              style={{ flex: 1, marginBottom: 0 }}
              placeholder="New unit name (e.g. kg, litre, box)"
              value={newUnit}
              onChange={e => setNewUnit(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddUnit()}
            />
            <button
              className="sap-btn sap-btn-primary"
              onClick={handleAddUnit}
              style={{ whiteSpace: 'nowrap' }}
            >
              Add Unit
            </button>
          </div>

          {units.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '14px' }}>No units yet.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {units.map(u => (
                <div
                  key={u.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '999px',
                    padding: '6px 14px 6px 16px',
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: '#1e40af',
                  }}
                >
                  {u.name}
                  <button
                    onClick={() => handleDeleteUnit(u.id)}
                    title="Delete unit"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0 2px',
                      lineHeight: 1,
                      fontSize: '15px',
                      color: '#64748b',
                      fontWeight: 700,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '540px' }}>
          <div className="sap-card" style={{ padding: '28px' }}>
            <div className="sap-h2" style={{ marginBottom: '10px' }}>Export Backup</div>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', margin: '0 0 20px' }}>
              Download a full backup of all data as a .zip file.
            </p>
            <button
              className="sap-btn sap-btn-primary"
              onClick={exportBackup}
              style={{ minWidth: '180px' }}
            >
              Download Backup
            </button>
          </div>

          <div className="sap-card" style={{ padding: '28px' }}>
            <div className="sap-h2" style={{ marginBottom: '10px' }}>Restore Backup</div>
            <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '20px', margin: '0 0 20px' }}>
              Warning: restoring will replace ALL current data and cannot be undone.
            </p>

            {restored ? (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
              }}>
                <span style={{ color: '#0f172a', fontWeight: 500, fontSize: '14px' }}>
                  Backup restored. Please refresh.
                </span>
                <button
                  className="sap-btn sap-btn-primary"
                  onClick={() => window.location.reload()}
                >
                  Refresh Now
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={e => setRestoreFile(e.target.files[0] || null)}
                    style={{ display: 'block', fontSize: '13.5px', color: '#0f172a' }}
                  />
                </div>
                <button
                  className="sap-btn sap-btn-primary"
                  onClick={handleRestore}
                  disabled={restoring}
                  style={{
                    minWidth: '180px',
                    background: restoring ? '#64748b' : undefined,
                  }}
                >
                  {restoring ? 'Restoring…' : 'Restore Backup'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

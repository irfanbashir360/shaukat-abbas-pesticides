import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, dismissPaymentAlert, dismissValidityAlert } from '../api/client'
import StatusBadge from '../components/StatusBadge'

const numStyle = {
  fontSize: '28px', fontWeight: 800,
  color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1,
}

function StatCard({ label, value, accent, note }) {
  return (
    <div className="sap-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'var(--amber)',
        }} />
      )}
      <div className="sap-section-title" style={{ marginBottom: '10px' }}>{label}</div>
      <div style={numStyle}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>PKR</span>
        {Number(value || 0).toLocaleString()}
      </div>
      {note && (
        <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600, color: value >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {note}
        </div>
      )}
    </div>
  )
}

function AlertRow({ inv, onView, onDismiss, dateLabel, dateValue }) {
  const isPast = new Date(dateValue) < new Date()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)',
    }}>
      <div>
        <span style={{ fontSize: '14px', fontWeight: 600 }}>{inv.invoice_number}</span>
        <span style={{ marginLeft: '10px', fontSize: '13px', color: isPast ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 500 }}>
          {dateLabel}: {new Date(dateValue).toLocaleDateString()}{isPast ? ' · Overdue' : ''}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="sap-btn-link" onClick={onView}>View</button>
        <button className="sap-btn-link-muted" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const navigate = useNavigate()
  const load = () => getDashboard().then(setData).catch(() => {})
  useEffect(() => { load() }, [])

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
      <div style={{ color: 'var(--text-faint)', fontSize: '14px' }}>Loading…</div>
    </div>
  )

  const hasAlerts = data.payment_due_alerts.length > 0 || data.validity_expiry_alerts.length > 0

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="sap-section-title" style={{ marginBottom: '4px' }}>
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h1 className="sap-h1">Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="sap-btn sap-btn-ghost" onClick={() => navigate('/purchases')}>+ Purchase</button>
          <button className="sap-btn sap-btn-primary" onClick={() => navigate('/sales')}>+ New Sale</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
        <StatCard label="Today's Sales" value={data.today_sales} />
        <StatCard label="Month Sales" value={data.month_sales} />
        <StatCard label="Month Purchases" value={data.month_purchases} />
        <StatCard label="Net Profit" value={data.net_profit} accent
          note={data.net_profit >= 0 ? '▲ Profitable this month' : '▼ Loss this month'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className="sap-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span className="sap-h2">Low Stock Alerts</span>
            {data.low_stock_products.length > 0 && <span className="sap-badge badge-danger">{data.low_stock_products.length}</span>}
          </div>
          {data.low_stock_products.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '12px 0' }}>All stock levels are healthy.</div>
            : data.low_stock_products.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</span>
                  <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.category}</span>
                </div>
                <StatusBadge status="low" label={`${p.current_stock} ${p.unit}`} />
              </div>
            ))
          }
        </div>

        <div className="sap-card" style={{ padding: '20px 24px' }}>
          <div className="sap-h2" style={{ marginBottom: '14px' }}>Creditors Summary</div>
          <div style={{
            fontSize: '32px', fontWeight: 800,
            color: data.creditors_total_owed > 0 ? 'var(--danger)' : 'var(--success)',
            letterSpacing: '-0.03em', lineHeight: 1,
          }}>
            <span style={{ fontSize: '15px', fontWeight: 600, marginRight: '4px', opacity: 0.7 }}>PKR</span>
            {Number(data.creditors_total_owed || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>Total outstanding balance</div>
          {data.creditors_overdue_count > 0 && (
            <div style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--danger-subtle)', borderRadius: 'var(--r-sm)', fontSize: '13px', fontWeight: 600, color: 'var(--danger)' }}>
              {data.creditors_overdue_count} creditor{data.creditors_overdue_count > 1 ? 's' : ''} overdue
            </div>
          )}
          <button className="sap-btn-link" onClick={() => navigate('/creditors')} style={{ marginTop: '14px', display: 'inline-block' }}>
            View all creditors →
          </button>
        </div>
      </div>

      {hasAlerts && (
        <div className="sap-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span className="sap-h2">Invoice Alerts</span>
            <span className="sap-badge badge-warning">{data.payment_due_alerts.length + data.validity_expiry_alerts.length}</span>
          </div>
          {data.payment_due_alerts.length > 0 && (
            <div style={{ marginBottom: data.validity_expiry_alerts.length > 0 ? '20px' : 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--warning)', marginBottom: '8px' }}>Payment Due</div>
              {data.payment_due_alerts.map(inv => (
                <AlertRow key={inv.id} inv={inv} dateLabel="Due" dateValue={inv.payment_due_date}
                  onView={() => navigate(`/invoices/${inv.id}`)}
                  onDismiss={async () => { await dismissPaymentAlert(inv.id); load() }} />
              ))}
            </div>
          )}
          {data.validity_expiry_alerts.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--danger)', marginBottom: '8px' }}>Validity Expiring</div>
              {data.validity_expiry_alerts.map(inv => (
                <AlertRow key={inv.id} inv={inv} dateLabel="Valid until" dateValue={inv.validity_expiry_date}
                  onView={() => navigate(`/invoices/${inv.id}`)}
                  onDismiss={async () => { await dismissValidityAlert(inv.id); load() }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

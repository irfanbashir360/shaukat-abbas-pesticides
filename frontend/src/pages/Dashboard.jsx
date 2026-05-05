import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, dismissPaymentAlert, dismissValidityAlert } from '../api/client'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

function pct(current, prev) {
  if (!prev) return null
  const diff = ((current - prev) / prev) * 100
  return (diff >= 0 ? '↑' : '↓') + ' ' + Math.abs(diff).toFixed(1) + '% vs last month'
}

function AlertRow({ inv, onView, onDismiss, dateLabel, dateValue }) {
  const isPast = new Date(dateValue) < new Date()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{inv.invoice_number}</span>
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

  const outstandingTotal = (data.creditors_total_owed || 0) + (data.debtors_total_owed || 0)
  const trend = pct(data.month_sales, data.monthly_sales_prev)

  const chartData = {
    labels: (data.daily_sales || []).map(p => {
      const d = new Date(p.date)
      return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })
    }),
    datasets: [{
      data: (data.daily_sales || []).map(p => p.total),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.08)',
      fill: true,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#94a3b8',
      bodyColor: '#f8fafc',
      borderColor: '#2d3f55',
      borderWidth: 1,
      callbacks: {
        label: ctx => `PKR ${Number(ctx.parsed.y).toLocaleString()}`,
      },
    }},
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 }, maxTicksLimit: 8 },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: {
          color: '#64748b', font: { size: 11 },
          callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
        },
        border: { display: false },
      },
    },
  }

  const hasAlerts = data.payment_due_alerts.length > 0 || data.validity_expiry_alerts.length > 0

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Dashboard"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="sap-btn sap-btn-ghost" onClick={() => navigate('/purchases')}>+ Purchase</button>
            <button className="sap-btn sap-btn-primary" onClick={() => navigate('/sales')}>+ New Sale</button>
          </div>
        }
      />

      {/* Row 1: 2 hero stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <StatCard
          label="Monthly Sales"
          value={`PKR ${Number(data.month_sales || 0).toLocaleString()}`}
          sub={trend}
          accent="default"
        />
        <StatCard
          label="Outstanding"
          value={`PKR ${Number(outstandingTotal).toLocaleString()}`}
          sub={`Creditors ${Number(data.creditors_total_owed || 0).toLocaleString()} / Debtors ${Number(data.debtors_total_owed || 0).toLocaleString()}`}
          accent="danger"
        />
      </div>

      {/* Row 2: 30-day line chart */}
      <div className="sap-card" style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div className="sap-section-title">Sales · Last 30 Days</div>
        </div>
        <div style={{ height: '160px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Row 3: 3 small stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
        <StatCard
          label="Total Products"
          value={data.product_count}
          accent="default"
        />
        <StatCard
          label="Low Stock"
          value={data.low_stock_products.length}
          sub={data.low_stock_products.length > 0 ? 'Items need restocking' : 'All levels healthy'}
          accent={data.low_stock_products.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Invoice Alerts"
          value={data.payment_due_alerts.length + data.validity_expiry_alerts.length}
          sub={hasAlerts ? 'Requires attention' : 'No alerts'}
          accent={hasAlerts ? 'danger' : 'success'}
        />
      </div>

      {/* Low stock list */}
      {data.low_stock_products.length > 0 && (
        <div className="sap-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span className="sap-h2">Low Stock</span>
            <span className="sap-badge badge-warning">{data.low_stock_products.length}</span>
          </div>
          {data.low_stock_products.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{p.name}</span>
                <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.category}</span>
              </div>
              <span className="sap-badge badge-warning">{p.current_stock} {p.unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* Invoice alerts */}
      {hasAlerts && (
        <div className="sap-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span className="sap-h2">Invoice Alerts</span>
            <span className="sap-badge badge-warning">{data.payment_due_alerts.length + data.validity_expiry_alerts.length}</span>
          </div>
          {data.payment_due_alerts.map(inv => (
            <AlertRow key={inv.id} inv={inv} dateLabel="Due" dateValue={inv.payment_due_date}
              onView={() => navigate(`/invoices/${inv.id}`)}
              onDismiss={async () => { await dismissPaymentAlert(inv.id); load() }} />
          ))}
          {data.validity_expiry_alerts.map(inv => (
            <AlertRow key={inv.id} inv={inv} dateLabel="Valid until" dateValue={inv.validity_expiry_date}
              onView={() => navigate(`/invoices/${inv.id}`)}
              onDismiss={async () => { await dismissValidityAlert(inv.id); load() }} />
          ))}
        </div>
      )}
    </div>
  )
}

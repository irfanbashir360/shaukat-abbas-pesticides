import { useState } from 'react'
import { getSalesReport, getPurchasesReport, getStockReport, getCreditorsReport } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../components/Toast'

const TABS = ['Sales', 'Purchases', 'Stock', 'Creditors']

export default function Reports() {
  const [tab, setTab] = useState('Sales')
  const [rows, setRows] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    setRows([])
    try {
      const params = {}
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString()
      if (dateTo) params.date_to = new Date(dateTo).toISOString()
      let data
      if (tab === 'Sales') data = await getSalesReport(params)
      if (tab === 'Purchases') data = await getPurchasesReport(params)
      if (tab === 'Stock') data = await getStockReport()
      if (tab === 'Creditors') data = await getCreditorsReport()
      setRows(data || [])
      if ((data || []).length === 0) toast('No records found for the selected filters', 'error')
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to load report', 'error')
    } finally { setLoading(false) }
  }

  const grandTotal = rows.reduce((s, r) => s + (r.total || 0), 0)

  return (
    <div className="sap-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h1 className="sap-h1">Reports</h1>
        {rows.length > 0 && <button className="sap-btn sap-btn-ghost" onClick={() => window.print()}>Print</button>}
      </div>

      <div className="sap-tabs">
        {TABS.map(t => (
          <button key={t} className={`sap-tab ${tab === t ? 'active' : ''}`}
            onClick={() => { setTab(t); setRows([]) }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {(tab === 'Sales' || tab === 'Purchases') && (
          <>
            <div>
              <label className="sap-label">From</label>
              <input className="sap-input" type="date" style={{ width: '160px' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="sap-label">To</label>
              <input className="sap-input" type="date" style={{ width: '160px' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </>
        )}
        <button className="sap-btn sap-btn-primary" onClick={load} disabled={loading}>
          {loading ? 'Running…' : 'Run Report'}
        </button>
      </div>

      {rows.length > 0 && tab === 'Sales' && (
        <div className="sap-card" style={{ overflow: 'hidden' }}>
          <table className="sap-table">
            <thead>
              <tr>
                <th>Date</th><th>Customer</th><th>Product</th><th>Category</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 500 }}>{r.customer}</td>
                  <td>{r.product}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
                  <td style={{ textAlign: 'right' }}>{r.quantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>PKR {Number(r.total).toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{ background: '#faf8f4', fontWeight: 700 }}>
                <td colSpan={5} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Grand Total</td>
                <td style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--amber)', fontSize: '15px' }}>PKR {grandTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && tab === 'Purchases' && (
        <div className="sap-card" style={{ overflow: 'hidden' }}>
          <table className="sap-table">
            <thead><tr><th>Date</th><th>Supplier</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 500 }}>{r.supplier}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>PKR {Number(r.total).toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{ background: '#faf8f4' }}>
                <td colSpan={2} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>Grand Total</td>
                <td style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--amber)', fontWeight: 700, fontSize: '15px' }}>PKR {grandTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && tab === 'Stock' && (
        <div className="sap-card" style={{ overflow: 'hidden' }}>
          <table className="sap-table">
            <thead>
              <tr>
                <th>Product</th><th>Category</th>
                <th style={{ textAlign: 'right' }}>Stock</th>
                <th style={{ textAlign: 'right' }}>Threshold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
                  <td style={{ textAlign: 'right' }}>{r.current_stock} {r.unit}</td>
                  <td style={{ textAlign: 'right' }}>{r.low_stock_threshold} {r.unit}</td>
                  <td><StatusBadge status={r.is_low ? 'low' : 'ok'} label={r.is_low ? 'Low' : 'OK'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && tab === 'Creditors' && (
        <div className="sap-card" style={{ overflow: 'hidden' }}>
          <table className="sap-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th style={{ textAlign: 'right' }}>Owed</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th>Due Date</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{r.supplier}</td>
                  <td style={{ textAlign: 'right' }}>PKR {Number(r.amount_owed).toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success)' }}>PKR {Number(r.total_paid).toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>PKR {Number(r.balance).toLocaleString()}</td>
                  <td>{new Date(r.due_date).toLocaleDateString()}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && !loading && (
        <div className="sap-card" style={{ padding: '56px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '14px' }}>
          {tab === 'Stock' || tab === 'Creditors'
            ? 'Click Run Report to see results.'
            : 'Select a date range and click Run Report to see results.'}
        </div>
      )}
    </div>
  )
}

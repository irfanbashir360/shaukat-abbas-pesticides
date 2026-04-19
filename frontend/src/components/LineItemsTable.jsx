const th = {
  padding: '9px 12px', fontSize: '12px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  color: '#64748b', background: '#f8fafc',
  borderBottom: '1.5px solid #e2e8f0', textAlign: 'left',
}
const td = {
  padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)',
  fontSize: '14px', color: '#0f172a', verticalAlign: 'middle',
}

export default function LineItemsTable({ items, products, onChange, onAdd, onRemove }) {
  return (
    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '4px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Product</th>
            <th style={{ ...th, width: '100px' }}>Qty</th>
            <th style={{ ...th, width: '130px' }}>Unit Price</th>
            <th style={{ ...th, width: '110px', textAlign: 'right' }}>Total</th>
            <th style={{ ...th, width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td style={td}>
                <select
                  style={{
                    width: '100%', padding: '7px 10px',
                    border: '1.5px solid #e2e8f0', borderRadius: '7px',
                    fontSize: '14px', background: '#fff', color: '#0f172a',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  value={item.product_id}
                  onChange={e => onChange(idx, 'product_id', e.target.value)}
                >
                  <option value="">Select product…</option>
                  {products.map(p => (
                    <option key={p.id} value={String(p.id)}>{p.name} ({p.unit})</option>
                  ))}
                </select>
              </td>
              <td style={td}>
                <input
                  type="number" min="0" step="0.01"
                  style={{
                    width: '100%', padding: '7px 10px',
                    border: '1.5px solid #e2e8f0', borderRadius: '7px',
                    fontSize: '14px', background: '#fff', color: '#0f172a',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  value={item.quantity}
                  onChange={e => onChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                />
              </td>
              <td style={td}>
                <input
                  type="number" min="0" step="0.01"
                  style={{
                    width: '100%', padding: '7px 10px',
                    border: '1.5px solid #e2e8f0', borderRadius: '7px',
                    fontSize: '14px', background: '#fff', color: '#0f172a',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  value={item.unit_price}
                  onChange={e => onChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                />
              </td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                PKR {(item.quantity * item.unit_price).toFixed(0)}
              </td>
              <td style={{ ...td, textAlign: 'center', padding: '10px 8px' }}>
                <button
                  onClick={() => onRemove(idx)}
                  style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    border: 'none', background: 'rgba(220,38,38,0.1)',
                    color: '#dc2626', cursor: 'pointer', fontSize: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, fontWeight: 700,
                  }}
                >×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '10px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <button
          onClick={onAdd}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600, color: '#2563eb',
            padding: 0, fontFamily: 'inherit',
          }}
        >
          + Add item
        </button>
      </div>
    </div>
  )
}

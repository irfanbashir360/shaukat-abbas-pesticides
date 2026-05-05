export default function DataTable({ columns, rows, onRowClick, emptyMessage = 'No records found' }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-card)', borderRadius: '10px',
        border: '1px solid var(--border)',
      }}>
        <div className="sap-empty">{emptyMessage}</div>
      </div>
    )
  }
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: '10px',
      border: '1px solid var(--border)', overflow: 'hidden',
    }}>
      <table className="sap-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={col.style}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : {}}
              className={row._rowClass || ''}
            >
              {columns.map(col => (
                <td key={col.key} style={col.tdStyle}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PageHeader({ title, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingBottom: '16px',
      borderBottom: '1px solid var(--border)',
      marginBottom: '20px',
    }} className="no-print">
      <h1 style={{
        fontSize: '22px', fontWeight: 700,
        color: 'var(--text-primary)', letterSpacing: '-0.01em',
      }}>{title}</h1>
      {action && <div>{action}</div>}
    </div>
  )
}

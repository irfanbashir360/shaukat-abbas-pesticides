const ACCENT_COLORS = {
  default: 'var(--accent)',
  danger:  'var(--danger)',
  warning: 'var(--warning)',
  success: 'var(--success)',
}

export default function StatCard({ label, value, sub, accent = 'default' }) {
  const color = ACCENT_COLORS[accent] || ACCENT_COLORS.default
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '10px',
      padding: '20px 24px',
      border: '1px solid var(--border)',
      borderLeftWidth: '3px',
      borderLeftColor: color,
    }}>
      <div style={{
        fontSize: '11px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'var(--text-muted)', marginBottom: '10px',
      }}>{label}</div>
      <div style={{
        fontSize: '24px', fontWeight: 800,
        color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1,
      }}>{value}</div>
      {sub && (
        <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 600, color }}>{sub}</div>
      )}
    </div>
  )
}

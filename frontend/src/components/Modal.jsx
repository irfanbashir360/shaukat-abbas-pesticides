export default function Modal({ title, onClose, children, size = 'md' }) {
  const maxW = size === 'lg' ? '680px' : '520px'
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(10,22,16,0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'sapFadeUp 0.18s ease both',
      }}
    >
      <div style={{
        background: 'var(--white)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-modal)',
        width: '100%', maxWidth: maxW,
        maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '17px', fontWeight: 700,
            color: 'var(--text)', letterSpacing: '-0.01em',
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.04)', border: 'none',
              width: '28px', height: '28px',
              borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', color: 'var(--text-muted)',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(0,0,0,0.08)'; e.target.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.target.style.background = 'rgba(0,0,0,0.04)'; e.target.style.color = 'var(--text-muted)' }}
          >
            ×
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

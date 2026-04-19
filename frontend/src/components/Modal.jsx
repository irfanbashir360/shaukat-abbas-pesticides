import { createPortal } from 'react-dom'

export default function Modal({ title, onClose, children, size = 'md' }) {
  const maxW = size === 'lg' ? '700px' : '520px'

  const modal = (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9000, overflowY: 'auto',
        background: 'rgba(15,23,42,0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          minHeight: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '32px 20px', boxSizing: 'border-box',
        }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          width: '100%', maxWidth: maxW,
          border: '1px solid #e2e8f0',
          animation: 'sapFadeUp 0.18s ease both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #d1fae5',
          }}>
            <h2 style={{
              fontSize: '18px', fontWeight: 700, color: '#0f172a',
            }}>
              {title}
            </h2>
            <button onClick={onClose} style={{
              background: 'rgba(0,0,0,0.05)', border: 'none',
              width: '30px', height: '30px', borderRadius: '50%',
              cursor: 'pointer', fontSize: '20px', color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, flexShrink: 0,
            }}>×</button>
          </div>
          <div style={{ padding: '24px' }}>{children}</div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

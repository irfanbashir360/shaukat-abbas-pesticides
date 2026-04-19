import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

const Ctx = createContext(null)

export function ConfirmProvider({ children }) {
  const [dlg, setDlg] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((message) =>
    new Promise(res => { resolveRef.current = res; setDlg({ type: 'confirm', message, val: '' }) }), [])

  const prompt = useCallback((message) =>
    new Promise(res => { resolveRef.current = res; setDlg({ type: 'prompt', message, val: '' }) }), [])

  const finish = (result) => { resolveRef.current(result); setDlg(null) }

  const dialog = dlg && createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9100,
      background: 'rgba(15,23,42,0.5)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', boxSizing: 'border-box',
    }}
      onClick={e => e.target === e.currentTarget && finish(null)}
    >
      <div style={{
        background: '#fff', borderRadius: '14px',
        padding: '28px 28px 24px',
        width: '360px', maxWidth: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        border: '1px solid #e2e8f0',
        animation: 'sapFadeUp 0.18s ease both',
      }}>
        <p style={{ fontSize: '15px', fontWeight: 500, color: '#0f172a', lineHeight: 1.5, marginBottom: dlg.type === 'prompt' ? '14px' : '22px' }}>
          {dlg.message}
        </p>
        {dlg.type === 'prompt' && (
          <input
            autoFocus
            style={{
              width: '100%', padding: '9px 12px',
              border: '1.5px solid #e2e8f0', borderRadius: '8px',
              fontSize: '14px', outline: 'none', marginBottom: '18px',
              fontFamily: 'inherit', color: '#0f172a', boxSizing: 'border-box',
            }}
            value={dlg.val}
            onChange={e => setDlg(d => ({ ...d, val: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') finish(dlg.val || null) }}
            onFocus={e => { e.target.style.borderColor = '#2563eb' }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={() => finish(null)} style={{
            padding: '8px 20px', borderRadius: '8px',
            border: '1.5px solid #e2e8f0', background: 'transparent',
            cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            color: '#0f172a', fontFamily: 'inherit',
          }}>Cancel</button>
          <button onClick={() => finish(dlg.type === 'prompt' ? (dlg.val || null) : true)} style={{
            padding: '8px 20px', borderRadius: '8px',
            border: 'none', background: '#2563eb',
            color: '#fff', cursor: 'pointer',
            fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
          }}>Confirm</button>
        </div>
      </div>
    </div>,
    document.body
  )

  return (
    <Ctx.Provider value={{ confirm, prompt }}>
      {children}
      {dialog}
    </Ctx.Provider>
  )
}

export const useConfirm = () => useContext(Ctx)

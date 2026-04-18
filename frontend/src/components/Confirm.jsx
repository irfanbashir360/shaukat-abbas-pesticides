import { createContext, useContext, useState, useCallback, useRef } from 'react'

const Ctx = createContext(null)

export function ConfirmProvider({ children }) {
  const [dlg, setDlg] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((message) =>
    new Promise(res => { resolveRef.current = res; setDlg({ type: 'confirm', message, val: '' }) }), [])

  const prompt = useCallback((message) =>
    new Promise(res => { resolveRef.current = res; setDlg({ type: 'prompt', message, val: '' }) }), [])

  const finish = (result) => { resolveRef.current(result); setDlg(null) }

  return (
    <Ctx.Provider value={{ confirm, prompt }}>
      {children}
      {dlg && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,22,16,0.5)',
            backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => e.target === e.currentTarget && finish(null)}
        >
          <div style={{
            background: '#fff', borderRadius: '14px',
            padding: '28px 28px 24px',
            width: '360px', maxWidth: '90vw',
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
            border: '1px solid #e6e0d5',
            animation: 'sapFadeUp 0.18s ease both',
          }}>
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#18251f', lineHeight: 1.5, marginBottom: dlg.type === 'prompt' ? '14px' : '22px' }}>
              {dlg.message}
            </p>
            {dlg.type === 'prompt' && (
              <input
                autoFocus
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1.5px solid #e6e0d5', borderRadius: '8px',
                  fontSize: '14px', outline: 'none', marginBottom: '18px',
                  fontFamily: "inherit", color: '#18251f',
                }}
                value={dlg.val}
                onChange={e => setDlg(d => ({ ...d, val: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') finish(dlg.val || null) }}
                onFocus={e => { e.target.style.borderColor = '#c8821a' }}
                onBlur={e => { e.target.style.borderColor = '#e6e0d5' }}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => finish(null)}
                style={{
                  padding: '8px 20px', borderRadius: '8px',
                  border: '1.5px solid #e6e0d5', background: 'transparent',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                  color: '#18251f', fontFamily: 'inherit',
                }}>
                Cancel
              </button>
              <button
                onClick={() => finish(dlg.type === 'prompt' ? (dlg.val || null) : true)}
                style={{
                  padding: '8px 20px', borderRadius: '8px',
                  border: 'none', background: '#c8821a',
                  color: '#fff', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
                }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useConfirm = () => useContext(Ctx)

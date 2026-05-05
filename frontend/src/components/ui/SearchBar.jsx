export default function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div style={{ position: 'relative', marginBottom: '16px' }} className="no-print">
      <svg
        style={{
          position: 'absolute', left: '11px', top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none',
        }}
        width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5"
      >
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        className="sap-input"
        style={{ paddingLeft: '34px' }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

const CLASSES = {
  success: 'badge-success',
  danger:  'badge-danger',
  warning: 'badge-warning',
  info:    'badge-info',
  muted:   'badge-muted',
}

export default function Badge({ variant = 'muted', label }) {
  if (!label && label !== 0) return null
  return (
    <span className={`sap-badge ${CLASSES[variant] || 'badge-muted'}`}>{label}</span>
  )
}

const MAP = {
  outstanding:    'badge-warning',
  partially_paid: 'badge-info',
  settled:        'badge-success',
  overdue:        'badge-danger',
  paid:           'badge-success',
  unpaid:         'badge-warning',
  low:            'badge-danger',
  ok:             'badge-success',
  active:         'badge-success',
  voided:         'badge-danger',
}

export default function StatusBadge({ status, label }) {
  const cls = MAP[status] || 'badge-muted'
  const text = label || status.replace(/_/g, ' ')
  return (
    <span className={`sap-badge ${cls}`}>{text}</span>
  )
}

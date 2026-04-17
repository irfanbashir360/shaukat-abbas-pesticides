const COLORS = {
  outstanding: 'bg-yellow-100 text-yellow-800',
  partially_paid: 'bg-blue-100 text-blue-800',
  settled: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  unpaid: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800',
  ok: 'bg-green-100 text-green-800',
}

export default function StatusBadge({ status, label }) {
  const color = COLORS[status] || 'bg-gray-100 text-gray-700'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label || status.replace('_', ' ')}
    </span>
  )
}

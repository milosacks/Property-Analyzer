const colors = {
  watching:       'bg-blue-100 text-blue-800',
  active:         'bg-green-100 text-green-800',
  under_contract: 'bg-yellow-100 text-yellow-800',
  closed:         'bg-gray-100 text-gray-800',
  rejected:       'bg-red-100 text-red-800',
}

const labels = {
  watching:       'Watching',
  active:         'Active',
  under_contract: 'Under Contract',
  closed:         'Closed',
  rejected:       'Rejected',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}

import Badge from './Badge'

export default function StaffCard({ staff, onClick }) {
  const roleColors = {
    arborist: 'primary',
    climber: 'success',
    groundsman: 'info',
    operator: 'warning',
    manager: 'neutral',
    owner: 'primary',
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900/50 cursor-pointer transition-colors" onClick={onClick}>
      {staff.photo_url ? (
        <img src={staff.photo_url} alt={staff.name} className="w-10 h-10 rounded-full object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-semibold text-sm">
          {staff.name?.charAt(0)?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{staff.name}</p>
        {staff.email && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{staff.email}</p>}
      </div>
      <Badge variant={roleColors[staff.role] || 'neutral'}>
        {staff.role?.charAt(0).toUpperCase() + staff.role?.slice(1)}
      </Badge>
    </div>
  )
}

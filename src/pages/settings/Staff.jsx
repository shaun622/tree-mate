import { useState, useMemo } from 'react'
import { Plus, Shield, Wrench } from 'lucide-react'
import { useBusiness } from '../../hooks/useBusiness'
import { useStaff } from '../../hooks/useStaff'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { Input, Select } from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import { STAFF_ROLES, cn } from '../../lib/utils'

// Two-tier role split. Admins get full app access (clients, jobs,
// billing); technicians use the field/run-sheet view. Tree Mate's
// `arborist`/`climber`/`groundsman`/`operator` roles are all
// field-level — admin tier is `manager` + `owner` only.
const ADMIN_ROLES = new Set(['manager', 'owner'])
const isAdminRole = (role) => ADMIN_ROLES.has((role || '').toLowerCase())

const ROLE_LABELS = {
  owner:      'Account owner',
  manager:    'Manager',
  arborist:   'Arborist',
  climber:    'Climber',
  groundsman: 'Groundsman',
  operator:   'Operator',
}

export default function Staff() {
  // staffLimit comes from useBusiness, which derives it from
  // businesses.staff_seat_override (HQ admin override) ?? plan.max_staff
  // ?? 1. Source of truth lives in the `plans` table now (see migration
  // 005_plans.sql); HQ admin can also pin a per-business override.
  const { business, staffLimit } = useBusiness()
  const { staff, createStaff, updateStaff, deleteStaff, uploadPhoto } = useStaff(business?.id)
  const { user } = useAuth()
  const toast = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'arborist' })
  const [deleteId, setDeleteId] = useState(null)

  // Virtualise the business owner so they appear in the Admin section.
  // The owner lives in businesses.owner_id, NOT staff_members — without
  // this row they'd be invisible on the Staff page even though they're
  // the highest-privilege user. Render-only when the current viewer is
  // the owner (we have their email from auth).
  const ownerVirtual = useMemo(() => {
    if (!user || !business?.owner_id || user.id !== business.owner_id) return null
    return {
      id: `__owner__:${business.owner_id}`,
      name: user.email,
      role: 'owner',
      email: user.email,
      phone: null,
      photo_url: null,
      _virtual: true,
    }
  }, [user, business?.owner_id])

  // Group staff into admins / technicians. Owner is virtual and joins
  // the admins list. Skip any staff_members row whose user_id matches
  // the business owner (defensive — shouldn't happen but if it does,
  // ownerVirtual is the canonical row).
  const { admins, technicians } = useMemo(() => {
    const admins = ownerVirtual ? [ownerVirtual] : []
    const technicians = []
    for (const m of staff) {
      if (ownerVirtual && m.user_id === business?.owner_id) continue
      if (isAdminRole(m.role)) admins.push(m)
      else technicians.push(m)
    }
    return { admins, technicians }
  }, [staff, ownerVirtual, business?.owner_id])

  // Active count for the seat indicator — exclude the owner (virtual,
  // doesn't consume a seat) but count both admins and technicians.
  const activeCount = admins.filter(m => !m._virtual).length + technicians.length
  const canAdd = activeCount < staffLimit

  function openAdd(roleHint) {
    if (!canAdd) {
      toast.error('Seat limit reached', { description: `Your plan allows ${staffLimit} staff. Upgrade or contact support to add more.` })
      return
    }
    setEditing(null)
    setForm({ name: '', email: '', phone: '', role: roleHint })
    setShowModal(true)
  }

  function openEdit(member) {
    if (member?._virtual) return // Virtual owner is read-only
    setEditing(member)
    setForm({ name: member.name, email: member.email || '', phone: member.phone || '', role: member.role })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Belt-and-braces seat-limit guard (matches Add button + RoleSection
    // gating). Re-check at submit time so we never insert past the limit.
    if (!editing && activeCount >= staffLimit) {
      toast.error('Seat limit reached', { description: `Your plan allows ${staffLimit} staff. Upgrade or contact support to add more.` })
      return
    }
    setSaving(true)
    if (editing) {
      await updateStaff(editing.id, form)
    } else {
      await createStaff(form)
    }
    setSaving(false)
    setShowModal(false)
    setEditing(null)
    setForm({ name: '', email: '', phone: '', role: 'arborist' })
  }

  const handlePhotoUpload = async (staffId, e) => {
    const file = e.target.files[0]
    if (file) await uploadPhoto(staffId, file)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-500 tabular-nums">
            {activeCount} of {staffLimit} {staffLimit === 1 ? 'seat' : 'seats'} used
          </p>
          <Badge variant={canAdd ? 'success' : 'warning'}>{business?.plan || 'trial'} plan</Badge>
        </div>

        {/* ── ADMIN & STAFF ── */}
        <RoleSection
          icon={Shield}
          label="Admin & staff"
          description="People who log in to manage clients, jobs, and billing"
          members={admins}
          onAdd={() => openAdd('manager')}
          onEdit={openEdit}
          onPhotoUpload={handlePhotoUpload}
          onDelete={(id) => setDeleteId(id)}
          emptyText="No admins yet besides the account owner. Add managers here."
          canAdd={canAdd}
        />

        {/* ── TECHNICIANS ── */}
        <RoleSection
          icon={Wrench}
          label="Technicians"
          description="Field workers — arborists, climbers, groundsmen, operators"
          members={technicians}
          onAdd={() => openAdd('arborist')}
          onEdit={openEdit}
          onPhotoUpload={handlePhotoUpload}
          onDelete={(id) => setDeleteId(id)}
          emptyText="No technicians yet. Add the people who do the field work."
          canAdd={canAdd}
        />

        {staff.length === 0 && !ownerVirtual && (
          <EmptyState title="No team yet" description="Add your first team member to get started" actionLabel="Add Staff" onAction={() => openAdd('arborist')} />
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Staff' : isAdminRole(form.role) ? 'Add admin' : 'Add technician'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          <Select
            label="Role"
            value={form.role}
            onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
            options={STAFF_ROLES.filter(r => r !== 'owner').map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
          />
          <Button type="submit" loading={saving} className="w-full">{editing ? 'Save Changes' : 'Add Staff'}</Button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Remove this staff member?"
        description="They'll lose access immediately. You can re-invite later."
        destructive
        confirmLabel="Remove"
        onConfirm={async () => { await deleteStaff(deleteId) }}
      />
    </>
  )
}

// ─── Section card for a role group ─────────────────
function RoleSection({ icon: Icon, label, description, members, onAdd, onEdit, onPhotoUpload, onDelete, emptyText, canAdd }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400 inline-flex items-center gap-2">
            <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
            {label}
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-50 dark:bg-brand-950/40 text-[10px] font-bold tabular-nums text-brand-700 dark:text-brand-300">
              {members.length}
            </span>
          </p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <button
          onClick={onAdd}
          disabled={!canAdd}
          className={cn(
            'inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs font-semibold transition-colors shrink-0',
            canAdd
              ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-950/60'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed',
          )}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          Add
        </button>
      </div>
      {members.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-600 italic">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {members.map(member => (
            <li key={member.id}>
              <MemberRow
                member={member}
                onClick={() => onEdit(member)}
                onPhotoUpload={onPhotoUpload}
                onDelete={onDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ─── A single member row ─────────────────
function MemberRow({ member, onClick, onPhotoUpload, onDelete }) {
  const isOwner = member._virtual || member.role === 'owner'
  const roleLabel = ROLE_LABELS[member.role] || member.role
  const initials = (member.name || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={cn(
      'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
      member._virtual ? 'cursor-default' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer',
    )}
      onClick={member._virtual ? undefined : onClick}
    >
      {member.photo_url ? (
        <img src={member.photo_url} alt="" className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700 shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{member.name}</p>
        <p className="text-[11.5px] text-gray-500 dark:text-gray-400 truncate">{roleLabel}{member.email ? ` · ${member.email}` : ''}</p>
      </div>
      {!member._virtual && (
        <div className="flex gap-1 shrink-0">
          <label className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full cursor-pointer" onClick={e => e.stopPropagation()}>
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => onPhotoUpload(member.id, e)} />
          </label>
          <button onClick={e => { e.stopPropagation(); onDelete(member.id) }} className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      )}
      {isOwner && (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 shrink-0">
          Owner
        </span>
      )}
    </div>
  )
}

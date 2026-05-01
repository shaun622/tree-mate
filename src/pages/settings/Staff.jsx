import { useState } from 'react'
import { useBusiness } from '../../hooks/useBusiness'
import { useStaff } from '../../hooks/useStaff'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ConfirmModal from '../../components/ui/ConfirmModal'
import StaffCard from '../../components/ui/StaffCard'
import { Input, Select } from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import { STAFF_ROLES } from '../../lib/utils'

export default function Staff() {
  // staffLimit comes from useBusiness, which derives it from
  // businesses.staff_seat_override (HQ admin override) ?? plan.max_staff
  // ?? 1. Source of truth lives in the `plans` table now (see migration
  // 005_plans.sql); HQ admin can also pin a per-business override.
  const { business, staffLimit } = useBusiness()
  const { staff, createStaff, updateStaff, deleteStaff, uploadPhoto } = useStaff(business?.id)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'arborist' })
  const [deleteId, setDeleteId] = useState(null)

  const canAdd = staff.length < staffLimit

  const handleSubmit = async (e) => {
    e.preventDefault()
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

  const handleEdit = (s) => {
    setEditing(s)
    setForm({ name: s.name, email: s.email || '', phone: s.phone || '', role: s.role })
    setShowModal(true)
  }

  const handlePhotoUpload = async (staffId, e) => {
    const file = e.target.files[0]
    if (file) await uploadPhoto(staffId, file)
  }

  return (
    <>
      {canAdd && (
        <div className="flex items-center justify-end mb-3">
          <button
            onClick={() => { setEditing(null); setForm({ name: '', email: '', phone: '', role: 'arborist' }); setShowModal(true) }}
            className="pill-ghost text-[12px]"
          >
            + Add staff
          </button>
        </div>
      )}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-500">{staff.length} / {staffLimit} staff members</p>
          <Badge variant={canAdd ? 'success' : 'warning'}>{business?.plan || 'trial'} plan</Badge>
        </div>

        {staff.length === 0 ? (
          <EmptyState title="No staff" description="Add your first team member" actionLabel="Add Staff" onAction={() => setShowModal(true)} />
        ) : (
          <Card className="divide-y divide-gray-100 dark:divide-gray-800">
            {staff.map(s => (
              <div key={s.id} className="flex items-center">
                <div className="flex-1"><StaffCard staff={s} onClick={() => handleEdit(s)} /></div>
                <div className="pr-3 flex gap-1">
                  <label className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-full cursor-pointer">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoUpload(s.id, e)} />
                  </label>
                  <button onClick={() => setDeleteId(s.id)} className="p-2 hover:bg-red-50 rounded-full">
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Staff' : 'Add Staff'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          <Select label="Role" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} options={STAFF_ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))} />
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

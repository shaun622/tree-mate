import { useState } from 'react'
import { useBusiness } from '../../hooks/useBusiness'
import { useStaff } from '../../hooks/useStaff'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import StaffCard from '../../components/ui/StaffCard'
import { Input, Select } from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import { STAFF_ROLES } from '../../lib/utils'

const PLAN_LIMITS = { trial: 5, basic: 5, unlimited: Infinity }

export default function Staff() {
  const { business } = useBusiness()
  const { staff, createStaff, updateStaff, deleteStaff, uploadPhoto } = useStaff(business?.id)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'arborist' })

  const limit = PLAN_LIMITS[business?.plan] || 1
  const canAdd = staff.length < limit

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
    <PageWrapper>
      <Header title="Staff" back="/settings" rightAction={
        canAdd ? (
          <button onClick={() => { setEditing(null); setForm({ name: '', email: '', phone: '', role: 'arborist' }); setShowModal(true) }} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        ) : null
      } />

      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{staff.length} / {limit} staff members</p>
          <Badge variant={canAdd ? 'success' : 'warning'}>{business?.plan || 'trial'} plan</Badge>
        </div>

        {staff.length === 0 ? (
          <EmptyState title="No staff" description="Add your first team member" actionLabel="Add Staff" onAction={() => setShowModal(true)} />
        ) : (
          <Card className="divide-y divide-gray-50">
            {staff.map(s => (
              <div key={s.id} className="flex items-center">
                <div className="flex-1"><StaffCard staff={s} onClick={() => handleEdit(s)} /></div>
                <div className="pr-3 flex gap-1">
                  <label className="p-2 hover:bg-gray-100 rounded-full cursor-pointer">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(s.id, e)} />
                  </label>
                  <button onClick={() => { if (confirm('Delete this staff member?')) deleteStaff(s.id) }} className="p-2 hover:bg-red-50 rounded-full">
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
    </PageWrapper>
  )
}

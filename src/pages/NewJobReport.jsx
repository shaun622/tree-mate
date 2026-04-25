import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useJobReport } from '../hooks/useJobReport'
import { useStaff } from '../hooks/useStaff'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Input, TextArea, Select } from '../components/ui/Input'
import { statusLabel, PHOTO_TAGS, HEALTH_CONDITIONS, ACTIONS_TAKEN, SUGGESTED_JOB_TYPES, SUGGESTED_EQUIPMENT, DEFAULT_TASKS } from '../lib/utils'
import { canUseFeature } from '../lib/plans'
import UpgradePrompt from '../components/ui/UpgradePrompt'

export default function NewJobReport() {
  const { id: siteId } = useParams()
  const navigate = useNavigate()
  const { business } = useBusiness()
  const { createReport, completeReport, addPhoto, addTask, toggleTask, addEquipment, addAssessment } = useJobReport(business?.id)
  const { staff } = useStaff(business?.id)
  const [site, setSite] = useState(null)
  const [report, setReport] = useState(null)
  const [tasks, setTasks] = useState([])
  const [equipment, setEquipment] = useState([])
  const [assessments, setAssessments] = useState([])
  const [photos, setPhotos] = useState([])
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [photoTag, setPhotoTag] = useState('before')
  const fileRef = useRef()
  const [form, setForm] = useState({
    notes: '', debris_volume_m3: '', stump_count: '', trees_removed: '',
    trees_pruned: '', herbicide_applied: false, ground_levelled: false,
    technician_name: '', staff_id: ''
  })
  const [eqForm, setEqForm] = useState({ equipment_name: '', hours_used: '', cost: '', notes: '' })
  const [assessForm, setAssessForm] = useState({
    tree_number: 1, species: '', diameter_dbh_cm: '', height_m: '',
    canopy_spread_m: '', health_condition: 'healthy', lean_direction: '', action_taken: 'removed', notes: ''
  })
  const [equipmentLib, setEquipmentLib] = useState([])

  useEffect(() => {
    const fetch = async () => {
      const { data: siteData } = await supabase.from('job_sites').select('*').eq('id', siteId).single()
      setSite(siteData)
      // Fetch equipment library
      if (business?.id) {
        const { data: eqLib } = await supabase.from('equipment_library').select('*').eq('business_id', business.id)
        setEquipmentLib(eqLib || [])
      }
    }
    fetch()
  }, [siteId, business?.id])

  // Create report on mount
  useEffect(() => {
    if (!business?.id || !siteId || report) return
    const init = async () => {
      const { data } = await createReport({ job_site_id: siteId })
      if (data) {
        setReport(data)
        // Add default tasks
        for (const taskName of DEFAULT_TASKS) {
          const { data: t } = await addTask(data.id, taskName)
          if (t) setTasks(prev => [...prev, t])
        }
      }
    }
    init()
  }, [business?.id, siteId])

  const handleToggleTask = async (taskId, completed) => {
    await toggleTask(taskId, completed)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed } : t))
  }

  const handleAddTask = async () => {
    if (!newTask.trim() || !report) return
    const { data } = await addTask(report.id, newTask.trim())
    if (data) setTasks(prev => [...prev, data])
    setNewTask('')
  }

  const handleAddEquipment = async () => {
    if (!eqForm.equipment_name || !report) return
    const { data } = await addEquipment(report.id, eqForm)
    if (data) setEquipment(prev => [...prev, data])
    setEqForm({ equipment_name: '', hours_used: '', cost: '', notes: '' })
  }

  const handleAddAssessment = async () => {
    if (!report) return
    const { data } = await addAssessment(report.id, assessForm)
    if (data) setAssessments(prev => [...prev, data])
    setAssessForm(p => ({ ...p, tree_number: p.tree_number + 1, species: '', diameter_dbh_cm: '', height_m: '', canopy_spread_m: '', lean_direction: '', notes: '' }))
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !report) return
    const { data } = await addPhoto(report.id, file, photoTag)
    if (data) setPhotos(prev => [...prev, data])
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleComplete = async () => {
    if (!report) return
    setCompleting(true)
    await supabase.from('job_reports').update({
      ...form,
      debris_volume_m3: form.debris_volume_m3 ? Number(form.debris_volume_m3) : null,
      stump_count: form.stump_count ? Number(form.stump_count) : null,
      trees_removed: form.trees_removed ? Number(form.trees_removed) : null,
      trees_pruned: form.trees_pruned ? Number(form.trees_pruned) : null,
    }).eq('id', report.id)
    await completeReport(report.id)
    setCompleting(false)
    navigate(`/reports/${report.id}`)
  }

  return (
    <PageWrapper>
      <Header title="New Job Report" back />

      <div className="px-4 py-4 space-y-4">
        {/* Site Summary */}
        {site && (
          <Card className="p-4">
            <p className="font-medium text-gray-900 dark:text-gray-100">{site.address}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="neutral">{statusLabel(site.site_type)}</Badge>
              <Badge>{statusLabel(site.site_access)}</Badge>
            </div>
          </Card>
        )}

        {/* Staff */}
        {staff.length > 0 && (
          <Select label="Technician" value={form.staff_id} onChange={e => {
            const s = staff.find(x => x.id === e.target.value)
            setForm(p => ({ ...p, staff_id: e.target.value, technician_name: s?.name || '' }))
          }} options={[{ value: '', label: 'Select staff...' }, ...staff.map(s => ({ value: s.id, label: s.name }))]} />
        )}

        {/* Tasks */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Tasks</h3>
          <div className="space-y-2">
            {tasks.map(t => (
              <label key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900/50 cursor-pointer">
                <input type="checkbox" checked={t.completed} onChange={e => handleToggleTask(t.id, e.target.checked)} className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-brand-500 focus:ring-brand-500" />
                <span className={`text-sm ${t.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>{t.task_name}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add custom task..." className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-sm" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTask())} />
            <Button variant="secondary" onClick={handleAddTask} className="px-3 py-2 text-sm">Add</Button>
          </div>
        </Card>

        {/* Equipment Used */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Equipment Used</h3>
          {equipment.map(eq => (
            <div key={eq.id} className="flex justify-between items-center p-2 border-b border-gray-50">
              <span className="text-sm">{eq.equipment_name}</span>
              <span className="text-sm text-gray-500 dark:text-gray-500">{eq.hours_used}h — ${eq.cost}</span>
            </div>
          ))}
          <div className="space-y-2 mt-3">
            <Select value={eqForm.equipment_name} onChange={e => setEqForm(p => ({ ...p, equipment_name: e.target.value }))} options={[
              { value: '', label: 'Select equipment...' },
              ...equipmentLib.map(e => ({ value: e.name, label: e.name })),
              ...SUGGESTED_EQUIPMENT.filter(s => !equipmentLib.find(e => e.name === s.name)).map(s => ({ value: s.name, label: s.name }))
            ]} />
            <div className="flex gap-2">
              <Input placeholder="Hours" type="number" value={eqForm.hours_used} onChange={e => setEqForm(p => ({ ...p, hours_used: e.target.value }))} className="flex-1" />
              <Input placeholder="Cost $" type="number" value={eqForm.cost} onChange={e => setEqForm(p => ({ ...p, cost: e.target.value }))} className="flex-1" />
            </div>
            <Button variant="secondary" onClick={handleAddEquipment} className="w-full text-sm">Add Equipment</Button>
          </div>
        </Card>

        {/* Tree Assessments */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Tree Assessments</h3>
          {assessments.map(a => (
            <div key={a.id} className="p-2 border-b border-gray-50 text-sm">
              <p className="font-medium">Tree #{a.tree_number}: {a.species || 'Unknown'}</p>
              <p className="text-gray-500 dark:text-gray-500">{a.diameter_dbh_cm}cm DBH, {a.height_m}m tall — {statusLabel(a.action_taken)}</p>
            </div>
          ))}
          <div className="space-y-2 mt-3">
            <div className="flex gap-2">
              <Input label="Tree #" type="number" value={assessForm.tree_number} onChange={e => setAssessForm(p => ({ ...p, tree_number: Number(e.target.value) }))} className="w-20" />
              <Input label="Species" placeholder="e.g. Eucalyptus" value={assessForm.species} onChange={e => setAssessForm(p => ({ ...p, species: e.target.value }))} className="flex-1" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input label="DBH (cm)" type="number" value={assessForm.diameter_dbh_cm} onChange={e => setAssessForm(p => ({ ...p, diameter_dbh_cm: e.target.value }))} />
              <Input label="Height (m)" type="number" value={assessForm.height_m} onChange={e => setAssessForm(p => ({ ...p, height_m: e.target.value }))} />
              <Input label="Canopy (m)" type="number" value={assessForm.canopy_spread_m} onChange={e => setAssessForm(p => ({ ...p, canopy_spread_m: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select label="Health" value={assessForm.health_condition} onChange={e => setAssessForm(p => ({ ...p, health_condition: e.target.value }))} options={HEALTH_CONDITIONS.map(h => ({ value: h, label: statusLabel(h) }))} />
              <Select label="Action" value={assessForm.action_taken} onChange={e => setAssessForm(p => ({ ...p, action_taken: e.target.value }))} options={ACTIONS_TAKEN.map(a => ({ value: a, label: statusLabel(a) }))} />
            </div>
            <Input label="Lean Direction" placeholder="e.g. North-East" value={assessForm.lean_direction} onChange={e => setAssessForm(p => ({ ...p, lean_direction: e.target.value }))} />
            <Button variant="secondary" onClick={handleAddAssessment} className="w-full text-sm">Add Assessment</Button>
          </div>
        </Card>

        {/* Photos */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Photos</h3>
          {canUseFeature(business, 'photos') ? (
            <>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {photos.map(p => (
                    <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden">
                      <img src={p.signed_url} alt="" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md">{p.tag}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <select value={photoTag} onChange={e => setPhotoTag(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-sm">
                  {PHOTO_TAGS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="text-sm text-gray-500 dark:text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-brand-50 file:text-brand-700" />
              </div>
            </>
          ) : (
            <UpgradePrompt message="Job photos are available on the Unlimited plan." />
          )}
        </Card>

        {/* Summary Fields */}
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Debris (m3)" type="number" value={form.debris_volume_m3} onChange={e => setForm(p => ({ ...p, debris_volume_m3: e.target.value }))} />
            <Input label="Stumps Ground" type="number" value={form.stump_count} onChange={e => setForm(p => ({ ...p, stump_count: e.target.value }))} />
            <Input label="Trees Removed" type="number" value={form.trees_removed} onChange={e => setForm(p => ({ ...p, trees_removed: e.target.value }))} />
            <Input label="Trees Pruned" type="number" value={form.trees_pruned} onChange={e => setForm(p => ({ ...p, trees_pruned: e.target.value }))} />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.herbicide_applied} onChange={e => setForm(p => ({ ...p, herbicide_applied: e.target.checked }))} className="w-4 h-4 rounded text-brand-500" />
              Herbicide Applied
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.ground_levelled} onChange={e => setForm(p => ({ ...p, ground_levelled: e.target.checked }))} className="w-4 h-4 rounded text-brand-500" />
              Ground Levelled
            </label>
          </div>
          <TextArea label="Notes" placeholder="Additional notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </Card>

        {/* Complete */}
        <Button onClick={handleComplete} loading={completing} className="w-full">
          Complete & Send Report
        </Button>
      </div>
    </PageWrapper>
  )
}
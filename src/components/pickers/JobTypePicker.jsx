import { useState } from 'react'
import { Input, Select } from '../ui/Input'
import Button from '../ui/Button'
import { SUGGESTED_JOB_TYPES } from '../../lib/utils'

export default function JobTypePicker({ templates = [], value, onChange, onCreateTemplate, label = 'Job Type', required = false }) {
  const [mode, setMode] = useState('idle') // 'idle' | 'custom'
  const [customName, setCustomName] = useState('')
  const [busy, setBusy] = useState(false)

  // Build options: templates first, then suggested types not already in templates,
  // then "+ Custom Type". Always include current value if it's not in any list.
  const templateNames = templates.map(t => t.name)
  const suggestedNames = SUGGESTED_JOB_TYPES.map(s => s.name).filter(n => !templateNames.includes(n))
  const allKnown = [...templateNames, ...suggestedNames]
  const includesCurrent = !value || allKnown.includes(value)

  const options = [
    { value: '', label: 'Select type...' },
    { value: '__custom__', label: '+ Custom Type' },
    ...templateNames.map(n => ({ value: n, label: n })),
    ...suggestedNames.map(n => ({ value: n, label: n })),
    ...(!includesCurrent ? [{ value, label: value }] : []),
  ]

  const handleSelect = (val) => {
    if (val === '__custom__') {
      setMode('custom')
      setCustomName('')
    } else {
      setMode('idle')
      onChange(val)
    }
  }

  const handleSaveCustom = async () => {
    const name = customName.trim()
    if (!name) return
    setBusy(true)
    if (onCreateTemplate) {
      try { await onCreateTemplate(name) } catch (e) { console.warn('Could not save template', e) }
    }
    onChange(name)
    setMode('idle')
    setCustomName('')
    setBusy(false)
  }

  return (
    <div className="space-y-2">
      <Select label={label} value={value} onChange={e => handleSelect(e.target.value)} options={options} required={required} />

      {mode === 'custom' && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-2 border-2 border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide">Custom Job Type</p>
          <Input
            placeholder="e.g. Crown Reduction"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveCustom() } }}
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setMode('idle')} className="flex-1 !min-h-[40px] text-xs">Cancel</Button>
            <Button type="button" loading={busy} onClick={handleSaveCustom} className="flex-1 !min-h-[40px] text-xs">Use Type</Button>
          </div>
          {onCreateTemplate && <p className="text-[10px] text-gray-400 dark:text-gray-500">Will be saved as a reusable template.</p>}
        </div>
      )}
    </div>
  )
}

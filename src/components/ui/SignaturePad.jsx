import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * SignaturePad — pointer-events canvas. Mouse + touch + pen unified.
 * High-DPI aware. No external deps.
 *
 * Usage:
 *   <SignaturePad onSave={(dataUrl) => uploadSignature(dataUrl)} />
 *
 *   {readOnlyUrl && <SignaturePad value={readOnlyUrl} readOnly />}
 *
 * Outputs a transparent PNG dataURL via onSave when the user clicks "Save".
 */
export default function SignaturePad({
  value,
  readOnly = false,
  onSave,
  onChange,
  height = 160,
  className = '',
}) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastRef = useRef(null)
  const [hasInk, setHasInk] = useState(false)
  const [saved, setSaved] = useState(false)

  // Initialise canvas + DPR scaling
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    canvas.width = w * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.2
    ctx.strokeStyle = '#0f1118'
  }, [height])

  // Render readonly value (image)
  useEffect(() => {
    if (!readOnly || !value) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
      ctx.drawImage(img, 0, 0, canvas.clientWidth, height)
    }
    img.src = value
  }, [value, readOnly, height])

  const pos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ev = e.touches ? e.touches[0] : e
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
  }

  const start = (e) => {
    if (readOnly) return
    e.preventDefault()
    drawingRef.current = true
    lastRef.current = pos(e)
  }
  const move = (e) => {
    if (!drawingRef.current || readOnly) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(lastRef.current.x, lastRef.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastRef.current = p
    if (!hasInk) setHasInk(true)
    setSaved(false)
  }
  const end = () => {
    drawingRef.current = false
    lastRef.current = null
    if (onChange) onChange()
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setHasInk(false)
    setSaved(false)
  }

  const save = () => {
    if (!canvasRef.current || !hasInk) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSave?.(dataUrl)
    setSaved(true)
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'rounded-card border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 overflow-hidden',
          readOnly ? 'pointer-events-none' : 'touch-none',
        )}
      >
        <canvas
          ref={canvasRef}
          style={{ height, width: '100%', display: 'block' }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      {!readOnly && (
        <div className="flex items-center justify-between mt-2">
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
            Clear
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!hasInk}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all',
              !hasInk
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : saved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-brand-500 text-white hover:bg-brand-600',
            )}
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            {saved ? 'Saved' : 'Save signature'}
          </button>
        </div>
      )}
    </div>
  )
}

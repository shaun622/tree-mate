import { useState, useRef } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

export default function DocumentUploader({ bucket, path, onUpload, accept = 'image/*,.pdf', label = 'Upload File', capture }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const toast = useToast()

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${path}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from(bucket).upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)
      onUpload({ path: fileName, url: publicUrl, name: file.name })
      toast.success('Uploaded')
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Upload failed', { description: 'Please try again.' })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        capture={capture}
        onChange={handleUpload}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className={`inline-flex items-center gap-2 px-4 py-3 rounded-card border-2 border-dashed border-line hover:border-brand-300 cursor-pointer transition-colors text-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {uploading
          ? <Loader2 className="w-4 h-4 text-brand-500 animate-spin" strokeWidth={2.2} />
          : <Upload className="w-4 h-4 text-ink-3" strokeWidth={2} />}
        <span className="text-ink-2">{uploading ? 'Uploading…' : label}</span>
      </label>
    </div>
  )
}

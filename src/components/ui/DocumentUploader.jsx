import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function DocumentUploader({ bucket, path, onUpload, accept = 'image/*,.pdf', label = 'Upload File' }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

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
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept={accept} onChange={handleUpload} className="hidden" id="file-upload" />
      <label htmlFor="file-upload" className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-brand-300 cursor-pointer transition-colors text-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        {uploading ? (
          <svg className="animate-spin h-5 w-5 text-brand-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        ) : (
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        )}
        <span className="text-gray-600 dark:text-gray-500">{uploading ? 'Uploading...' : label}</span>
      </label>
    </div>
  )
}

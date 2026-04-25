import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../hooks/useBusiness'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

export default function ImportData() {
  const { business } = useBusiness()
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [importType, setImportType] = useState('clients')

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const rows = lines.slice(1).map(line => {
        const values = line.split(',')
        const row = {}
        headers.forEach((h, i) => { row[h] = values[i]?.trim() })
        return row
      })

      if (importType === 'clients') {
        const clients = rows.map(r => ({
          business_id: business.id, name: r.name || r.client_name || '',
          email: r.email || '', phone: r.phone || '', address: r.address || '',
        })).filter(c => c.name)
        const { error } = await supabase.from('clients').insert(clients)
        setResult(error ? `Error: ${error.message}` : `Imported ${clients.length} clients`)
      }
    } catch (err) {
      setResult(`Error: ${err.message}`)
    }
    setImporting(false)
  }

  return (
    <PageWrapper>
      <Header title="Import Data" back="/settings" />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Import Type</label>
            <div className="flex gap-2">
              {['clients', 'job_sites'].map(t => (
                <button key={t} onClick={() => setImportType(t)} className={`px-4 py-2 rounded-xl text-sm font-medium ${importType === t ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-500'}`}>
                  {t === 'clients' ? 'Clients' : 'Job Sites'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CSV File</label>
            <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} className="text-sm text-gray-500 dark:text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700" />
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-1">Expected CSV columns for {importType}:</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {importType === 'clients' ? 'name, email, phone, address' : 'client_name, address, site_type, site_access'}
            </p>
          </div>

          <Button onClick={handleImport} loading={importing} disabled={!file} className="w-full">
            Import {importType === 'clients' ? 'Clients' : 'Job Sites'}
          </Button>

          {result && (
            <div className={`p-3 rounded-xl text-sm ${result.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {result}
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  )
}

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Upload, FileArchive, FileSpreadsheet, CheckCircle2, X } from 'lucide-react'
import { exportImportApi } from '@/api/exportImport'
import type { ImportResult } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ── Export ────────────────────────────────────────────────────────────────────

function ExportSection() {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const blob = await exportImportApi.exportCsv()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rentivo-export-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Export data</CardTitle>
        <CardDescription>
          Downloads a ZIP archive with four CSV files — deposits, subscriptions,
          properties and property transactions. Safe to re-import: rows are
          deduplicated by ID.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground flex-1">
            {['deposits.csv', 'subscriptions.csv', 'properties.csv', 'property_transactions.csv'].map(f => (
              <div key={f} className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <Button onClick={handleExport} disabled={loading} className="shrink-0">
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Exporting…' : 'Export ZIP'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Import result card ────────────────────────────────────────────────────────

function ResultCard({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  const rows = [
    { label: 'Deposits',             value: result.deposits },
    { label: 'Subscriptions',        value: result.subscriptions },
    { label: 'Properties',           value: result.properties },
    { label: 'Property transactions', value: result.property_transactions },
  ]
  const total = rows.reduce((s, r) => s + r.value, 0)

  return (
    <div className="mt-4 rounded-lg border border-income/30 bg-income/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-income shrink-0" />
          <p className="font-semibold text-sm">
            Import complete — {total} records created
            {result.skipped > 0 && (
              <span className="text-muted-foreground font-normal ml-1">
                · {result.skipped} skipped (already exist)
              </span>
            )}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-3 text-sm">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={cn('font-mono font-medium', r.value > 0 ? 'text-income' : 'text-muted-foreground')}>
              +{r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Import ────────────────────────────────────────────────────────────────────

function ImportSection() {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const accept = '.zip,.csv'

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'zip' && ext !== 'csv') {
      toast.error('Only .zip or .csv files are supported')
      return
    }
    setSelectedFile(file)
    setResult(null)
    setLoading(true)
    try {
      const r = await exportImportApi.importCsv(file)
      setResult(r)
      // Invalidate all data queries so lists refresh
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.success('Import successful')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Import failed')
    } finally {
      setLoading(false)
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Import data</CardTitle>
        <CardDescription>
          Upload a full ZIP export or a single CSV file. Existing records (matched
          by ID) are skipped — safe to re-import without duplicates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Dropzone */}
        <div
          onClick={() => !loading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer select-none',
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30',
            loading && 'pointer-events-none opacity-60',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={onInputChange}
          />

          {loading ? (
            <>
              <Upload className="h-8 w-8 text-primary animate-bounce" />
              <p className="text-sm font-medium">Importing {selectedFile?.name}…</p>
            </>
          ) : dragging ? (
            <>
              <FileArchive className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium text-primary">Drop to import</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileArchive className="h-7 w-7" />
                <FileSpreadsheet className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Drop a file here or{' '}
                  <span className="text-primary underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">ZIP archive or single CSV</p>
              </div>
            </>
          )}
        </div>

        {/* Result */}
        {result && <ResultCard result={result} onClose={() => setResult(null)} />}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ImportExport() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Import / Export</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Back up your data as CSV or restore from a previous export.
        </p>
      </div>
      <ExportSection />
      <ImportSection />
    </div>
  )
}

import { useId, useRef, useState, type DragEvent } from 'react'
import { ImageOff, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { SmartImage } from '@/components/smart-image'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ACCEPTED, uploadImage } from '@/lib/api'

// Image picker: upload a file (click or drop) or paste a URL; the value is always a path/URL string.
export function ImageField({ label, value, onChange, error, description, aspect = 'landscape' }: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  description?: string
  aspect?: 'portrait' | 'landscape' | 'square'
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [problem, setProblem] = useState('')

  async function pick(file?: File) {
    if (!file) return
    setBusy(true)
    setProblem('')
    try {
      onChange(await uploadImage(file))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unggahan gagal.'
      setProblem(message)
      toast.error('Gagal mengunggah gambar', { description: message })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = '' // allow re-selecting the same file
    }
  }

  const drop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    void pick(e.dataTransfer.files[0])
  }

  const frame = { portrait: 'aspect-4/5 w-28', landscape: 'aspect-16/10 w-44', square: 'aspect-square w-24' }[aspect]

  return (
    <Field data-invalid={!!(error || problem) || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex flex-wrap items-start gap-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={drop}
          className={`relative shrink-0 overflow-hidden rounded-xl border border-dashed bg-muted/40 ${frame} ${over ? 'border-primary bg-accent' : ''}`}
        >
          <SmartImage
            src={value}
            alt=""
            className={`size-full ${aspect === 'square' ? 'object-contain p-2' : 'object-cover'}`}
            fallback={
              <button type="button" onClick={() => input.current?.click()} className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-muted-foreground hover:text-primary" aria-label="Pilih gambar">
                {value ? <><ImageOff className="size-6 text-destructive" /><span className="text-xs text-destructive">Gambar tidak ditemukan</span></> : <ImagePlus className="size-7" />}
              </button>
            }
          />
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-background/70" role="status" aria-label="Mengunggah">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2" style={{ minWidth: '12rem' }}>
          <input ref={input} id={id} type="file" accept={ACCEPTED} className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-9" disabled={busy} onClick={() => input.current?.click()}>
              <Upload /> {value ? 'Ganti gambar' : 'Unggah gambar'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" className="h-9 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={() => onChange('')}>
                <Trash2 /> Hapus
              </Button>
            )}
          </div>
          <FieldDescription>JPG, PNG, atau WebP. Gambar besar diperkecil otomatis. {description}</FieldDescription>
          <Input
            className="h-9"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="atau tempel URL / path gambar"
            aria-label={`${label} (URL)`}
            aria-invalid={!!error || undefined}
          />
        </div>
      </div>
      <FieldError>{problem || error}</FieldError>
    </Field>
  )
}

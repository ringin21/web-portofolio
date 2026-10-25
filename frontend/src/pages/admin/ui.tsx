import { useId, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type Errors = Record<string, string>

export type SaveResult = { ok: true } | { ok: false; errors: Errors }

export function PageHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

type FormFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  description?: string
  multiline?: boolean
  placeholder?: string
  type?: string
  maxLength?: number
  className?: string
  autoFocus?: boolean
}

export function FormField({ label, value, onChange, error, description, multiline, className, maxLength, ...props }: FormFieldProps) {
  const id = useId()
  const control = { id, value, maxLength, 'aria-invalid': !!error || undefined, onChange: (e: { target: { value: string } }) => onChange(e.target.value), ...props }

  return (
    <Field data-invalid={!!error || undefined} className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {multiline && maxLength && <span className="text-xs text-muted-foreground tabular-nums">{value.length}/{maxLength}</span>}
      </div>
      {multiline ? <Textarea rows={4} {...control} /> : <Input className="h-9" {...control} />}
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  )
}

// Soft tinted icon tiles, one hue per content type (Mekari/dibimbing-style KPI cards).
const tints = {
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
} as const

export function IconTile({ icon: Icon, tint, className = 'size-10' }: { icon: LucideIcon; tint: keyof typeof tints; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl ${tints[tint]} ${className}`}>
      <Icon className="size-5" />
    </span>
  )
}

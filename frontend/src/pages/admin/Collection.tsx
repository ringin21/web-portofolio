import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2, type LucideIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ImageField } from './ImageField'
import { FormField, PageHeader, type Errors, type SaveResult } from './ui'

export type FieldSpec<T> = {
  key: keyof T & string
  label: string
  placeholder?: string
  description?: string
  multiline?: boolean
  wide?: boolean
  options?: string[]
  image?: boolean
  aspect?: 'portrait' | 'landscape' | 'square'
}

export type ColumnSpec<T> = { header: string; cell: (item: T) => ReactNode; className?: string }

type Editing<T> = { index: number | null; draft: T; errors: Errors; general?: string }

export function Collection<T extends Record<string, string>>({ title, description, noun, icon, items, fields, columns, blank, path, onPersist }: {
  title: string
  description: string
  noun: string
  icon: LucideIcon
  items: T[]
  fields: FieldSpec<T>[]
  columns: ColumnSpec<T>[]
  blank: T
  /** Validation keys from the server are `${path}.${index}.${field}`. */
  path: string
  onPersist: (items: T[], message: string) => Promise<SaveResult>
}) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Editing<T> | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const capitalized = noun[0]!.toUpperCase() + noun.slice(1)
  const q = query.trim().toLowerCase()
  const rows = items.map((item, index) => ({ item, index })).filter(({ item }) => !q || Object.values(item).join(' ').toLowerCase().includes(q))

  async function run(next: T[], message: string) {
    setBusy(true)
    const result = await onPersist(next, message)
    setBusy(false)
    return result
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    const { index, draft } = editing
    // New entries go on top: lists are shown newest-first on the site.
    const next = index === null ? [draft, ...items] : items.map((it, i) => (i === index ? draft : it))
    const result = await run(next, index === null ? `${capitalized} ditambahkan` : `${capitalized} diperbarui`)
    if (result.ok) return setEditing(null)

    const prefix = `${path}.${index ?? 0}.`
    const own = Object.fromEntries(Object.entries(result.errors).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]))
    setEditing({ ...editing, errors: own, general: Object.keys(own).length ? undefined : Object.values(result.errors)[0] })
  }

  const move = (i: number, to: number) => {
    const next = [...items]
    ;[next[i], next[to]] = [next[to]!, next[i]!]
    void run(next, 'Urutan diperbarui')
  }

  const setDraft = (key: keyof T, value: string) => setEditing((e) => e && { ...e, draft: { ...e.draft, [key]: value } })
  const add = () => setEditing({ index: null, draft: { ...blank }, errors: {} })
  const Icon = icon

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description}>
        <Button onClick={add} className="h-9 px-4"><Plus /> Tambah {noun}</Button>
      </PageHeader>

      {items.length === 0 ? (
        <Card className="py-0">
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="size-12 rounded-xl bg-accent text-primary"><Icon className="size-6" /></EmptyMedia>
              <EmptyTitle>Belum ada {noun}</EmptyTitle>
              <EmptyDescription>Tambahkan {noun} pertama Anda agar tampil di situs portofolio.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={add}><Plus /> Tambah {noun}</Button>
            </EmptyContent>
          </Empty>
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <InputGroup className="h-9 max-w-xs bg-background">
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Cari ${noun}…`} aria-label={`Cari ${noun}`} />
            </InputGroup>
            <p className="text-sm text-muted-foreground">
              {q ? `${rows.length} dari ${items.length}` : items.length} {noun}
              {busy && <Loader2 className="ml-2 inline size-4 animate-spin" aria-label="Menyimpan" />}
            </p>
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {columns.map((c) => <TableHead key={c.header} className={`h-10 px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase ${c.className ?? ''}`}>{c.header}</TableHead>)}
                <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ item, index }) => (
                <TableRow key={index} className="group">
                  {columns.map((c, ci) => (
                    <TableCell key={c.header} className={`px-4 py-3 ${c.className ?? ''}`}>
                      {ci === 0 ? (
                        <button className="text-left hover:text-primary" onClick={() => setEditing({ index, draft: { ...item }, errors: {} })}>{c.cell(item)}</button>
                      ) : c.cell(item)}
                    </TableCell>
                  ))}
                  <TableCell className="px-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Aksi" disabled={busy}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => setEditing({ index, draft: { ...item }, errors: {} })}><Pencil /> Edit</DropdownMenuItem>
                        <DropdownMenuItem disabled={index === 0} onSelect={() => move(index, index - 1)}><ArrowUp /> Naikkan</DropdownMenuItem>
                        <DropdownMenuItem disabled={index === items.length - 1} onSelect={() => move(index, index + 1)}><ArrowDown /> Turunkan</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(index)}><Trash2 /> Hapus</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="py-10 text-center text-muted-foreground">Tidak ada {noun} yang cocok dengan "{query}".</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Sheet open={!!editing} onOpenChange={(open) => !open && !busy && setEditing(null)}>
        <SheetContent className="w-full gap-0 sm:max-w-lg">
          <form onSubmit={submit} className="flex h-full flex-col">
            <SheetHeader className="border-b">
              <SheetTitle>{editing?.index === null ? `Tambah ${noun}` : `Edit ${noun}`}</SheetTitle>
              <SheetDescription>Perubahan langsung tersimpan dan tampil di situs.</SheetDescription>
            </SheetHeader>
            {editing && (
              <FieldGroup className="flex-1 overflow-y-auto p-4">
                {editing.general && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{editing.general}</p>}
                {fields.map((f, fi) =>
                  f.image ? (
                    <ImageField key={f.key} aspect={f.aspect} label={f.label} description={f.description} value={editing.draft[f.key]} onChange={(v) => setDraft(f.key, v)} error={editing.errors[f.key]} />
                  ) : f.options ? (
                    <Field key={f.key} data-invalid={!!editing.errors[f.key] || undefined}>
                      <FieldLabel>{f.label}</FieldLabel>
                      <Select value={editing.draft[f.key]} onValueChange={(v) => setDraft(f.key, v)}>
                        <SelectTrigger className="h-9 w-full" aria-invalid={!!editing.errors[f.key] || undefined}><SelectValue placeholder={f.placeholder ?? 'Pilih'} /></SelectTrigger>
                        <SelectContent>
                          {[...new Set([...f.options, editing.draft[f.key]].filter(Boolean))].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FieldError>{editing.errors[f.key]}</FieldError>
                    </Field>
                  ) : (
                    <FormField
                      key={f.key}
                      label={f.label}
                      value={editing.draft[f.key]}
                      placeholder={f.placeholder}
                      description={f.description}
                      multiline={f.multiline}
                      maxLength={f.multiline ? 1000 : undefined}
                      autoFocus={fi === 0}
                      onChange={(v) => setDraft(f.key, v)}
                      error={editing.errors[f.key]}
                    />
                  ),
                )}
              </FieldGroup>
            )}
            <SheetFooter className="flex-row justify-end border-t">
              <Button type="button" variant="outline" className="h-9" onClick={() => setEditing(null)} disabled={busy}>Batal</Button>
              <Button type="submit" className="h-9 px-4" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Simpan</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {noun} ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {capitalized} akan dihapus dari situs. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleting !== null && void run(items.filter((_, i) => i !== deleting), `${capitalized} dihapus`)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

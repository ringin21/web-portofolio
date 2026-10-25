import { useState, type FormEvent } from 'react'
import { Loader2, Plus, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { PageHeader, type SaveResult } from './ui'

const suggestions = ['TypeScript', 'JavaScript', 'React', 'Next.js', 'Vue', 'Node.js', 'PHP', 'Laravel', 'Python', 'Go', 'Tailwind CSS', 'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Git', 'Figma', 'AWS']

export function Skills({ stack, description, onPersist }: {
  stack: string[]
  description: string
  onPersist: (stack: string[], message: string) => Promise<SaveResult>
}) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const has = (tag: string) => stack.some((s) => s.toLowerCase() === tag.toLowerCase())

  async function persist(next: string[], message: string) {
    setBusy(true)
    const result = await onPersist(next, message)
    setBusy(false)
    return result
  }

  async function add(tags: string[]) {
    const fresh = [...new Set(tags.map((t) => t.trim()).filter((t) => t && !has(t)))]
    if (!fresh.length) return setDraft('')
    if ((await persist([...stack, ...fresh], fresh.length > 1 ? `${fresh.length} keahlian ditambahkan` : `${fresh[0]} ditambahkan`)).ok) setDraft('')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void add(draft.split(','))
  }

  const open = suggestions.filter((s) => !has(s))

  return (
    <div className="space-y-6">
      <PageHeader title="Keahlian" description={description} />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Tech stack Anda</CardTitle>
            <CardDescription>Tekan Enter untuk menambah. Tempel beberapa sekaligus dengan pemisah koma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={submit}>
              <InputGroup className="h-10 bg-background">
                <InputGroupAddon><Sparkles /></InputGroupAddon>
                <InputGroupInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="mis. React, Laravel, Docker" aria-label="Keahlian baru" maxLength={200} />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton type="submit" variant="default" disabled={!draft.trim() || busy}>
                    {busy ? <Loader2 className="animate-spin" /> : <Plus />} Tambah
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>

            {stack.length ? (
              <ul className="flex flex-wrap gap-2">
                {stack.map((s) => (
                  <li key={s} className="inline-flex h-9 items-center gap-1 rounded-lg border bg-background pr-1 pl-3 text-sm font-medium">
                    <span className="mr-1 size-1.5 rounded-full bg-primary" />
                    {s}
                    <button
                      aria-label={`Hapus ${s}`}
                      disabled={busy}
                      onClick={() => void persist(stack.filter((t) => t !== s), `${s} dihapus`)}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="border border-dashed py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="size-12 rounded-xl bg-accent text-primary"><Sparkles className="size-6" /></EmptyMedia>
                  <EmptyTitle>Belum ada keahlian</EmptyTitle>
                  <EmptyDescription>Tambahkan manual atau pilih dari saran di samping.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saran populer</CardTitle>
            <CardDescription>Klik untuk menambahkan.</CardDescription>
          </CardHeader>
          <CardContent>
            {open.length ? (
              <div className="flex flex-wrap gap-2">
                {open.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="rounded-full border-dashed" disabled={busy} onClick={() => void add([s])}>
                    <Plus /> {s}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Semua saran sudah ditambahkan.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

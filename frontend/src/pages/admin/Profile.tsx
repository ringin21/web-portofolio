import { useEffect, useEffectEvent, useState, type FormEvent } from 'react'
import { ExternalLink, Loader2, Mail } from 'lucide-react'
import { GithubIcon, LinkedinIcon } from '@/components/brand-icons'
import { SmartImage } from '@/components/smart-image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { Kbd } from '@/components/ui/kbd'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { initials } from '@/lib/api'
import type { Portfolio } from '@/lib/types'
import { ImageField } from './ImageField'
import { FormField, PageHeader, type Errors, type SaveResult } from './ui'

type Draft = Pick<Portfolio, 'name' | 'title' | 'bio' | 'photo' | 'contact'>

const pick = ({ name, title, bio, photo, contact }: Portfolio): Draft => ({ name, title, bio, photo, contact })

export function Profile({ data, description, onPersist, onDirtyChange }: {
  data: Portfolio
  description: string
  onPersist: (next: Portfolio, message: string) => Promise<SaveResult>
  onDirtyChange: (dirty: boolean) => void
}) {
  const [draft, setDraft] = useState(() => pick(data))
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('dasar')
  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(data))

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  async function save(e?: FormEvent) {
    e?.preventDefault()
    setBusy(true)
    const result = await onPersist({ ...data, ...draft }, 'Profil diperbarui')
    setBusy(false)
    if (result.ok) return setErrors({})
    setErrors(result.errors)
    // Jump to the tab holding the first invalid field.
    setTab(Object.keys(result.errors).some((k) => !k.startsWith('contact.')) ? 'dasar' : 'kontak')
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      if (dirty && !busy) void save()
    }
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    addEventListener('keydown', handler)
    return () => removeEventListener('keydown', handler)
  }, [])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const contact = (key: keyof Draft['contact'], label: string, placeholder: string) => (
    <FormField
      label={label}
      value={draft.contact[key]}
      placeholder={placeholder}
      type={key === 'email' ? 'email' : 'url'}
      onChange={(v) => set({ contact: { ...draft.contact, [key]: v } })}
      error={errors[`contact.${key}`]}
    />
  )

  const links = [
    { href: `mailto:${draft.contact.email}`, icon: Mail, label: draft.contact.email },
    { href: draft.contact.github, icon: GithubIcon, label: draft.contact.github.replace(/^https?:\/\/(www\.)?/, '') },
    { href: draft.contact.linkedin, icon: LinkedinIcon, label: draft.contact.linkedin.replace(/^https?:\/\/(www\.)?/, '') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Profil" description={description} />

      <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="gap-0 pt-0 lg:sticky lg:top-20">
          <div className="h-24 bg-linear-to-r from-primary to-blue-400" />
          <CardContent className="-mt-12 flex flex-col items-center text-center">
            <SmartImage
              src={draft.photo}
              alt="Foto profil"
              className="size-24 rounded-2xl object-cover ring-4 ring-card"
              fallback={<div className="grid size-24 place-items-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground ring-4 ring-card">{initials(draft.name)}</div>}
            />
            <p className="mt-3 text-lg font-semibold">{draft.name || 'Nama Anda'}</p>
            <p className="text-sm text-muted-foreground">{draft.title || 'Jabatan'}</p>
            <ul className="mt-5 w-full space-y-2 border-t pt-5 text-left text-sm">
              {links.map(({ href, icon: Icon, label }) => (
                <li key={href} className="flex items-center gap-2.5 text-muted-foreground">
                  <Icon className="size-4 shrink-0" /> <span className="truncate">{label || '—'}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" asChild className="mt-5 h-9 w-full">
              <a href="/" target="_blank" rel="noreferrer"><ExternalLink /> Lihat situs</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <form onSubmit={save}>
            <Tabs value={tab} onValueChange={setTab} className="gap-0">
              <CardHeader className="border-b pt-5 pb-0">
                <CardTitle>Pengaturan profil</CardTitle>
                <CardDescription>Informasi ini tampil di bagian hero dan kontak situs Anda.</CardDescription>
                <TabsList variant="line" className="mt-3 -mb-px h-auto p-0">
                  <TabsTrigger value="dasar" className="pb-3">Informasi dasar</TabsTrigger>
                  <TabsTrigger value="kontak" className="pb-3">Kontak & sosial</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="py-6">
                <TabsContent value="dasar">
                  <FieldGroup className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Nama lengkap" value={draft.name} onChange={(name) => set({ name })} error={errors.name} maxLength={100} />
                    <FormField label="Jabatan" value={draft.title} onChange={(title) => set({ title })} error={errors.title} maxLength={150} placeholder="Full-Stack Developer" />
                    <div className="sm:col-span-2">
                      <ImageField label="Foto profil" aspect="portrait" value={draft.photo} onChange={(photo) => set({ photo })} error={errors.photo} description="Rasio 4:5 terlihat paling baik." />
                    </div>
                    <FormField label="Bio" value={draft.bio} onChange={(bio) => set({ bio })} error={errors.bio} multiline maxLength={2000} className="sm:col-span-2" />
                  </FieldGroup>
                </TabsContent>
                <TabsContent value="kontak">
                  <FieldGroup className="gap-5">
                    {contact('email', 'Email', 'nama@email.com')}
                    {contact('github', 'GitHub', 'https://github.com/username')}
                    {contact('linkedin', 'LinkedIn', 'https://linkedin.com/in/username')}
                  </FieldGroup>
                </TabsContent>
              </CardContent>
            </Tabs>
            <CardFooter className="justify-between gap-3 bg-muted/40 py-4">
              <p className="text-sm text-muted-foreground">
                {dirty ? <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-amber-500" /> Ada perubahan belum disimpan</span> : 'Semua perubahan tersimpan'}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-9" disabled={!dirty || busy} onClick={() => { setDraft(pick(data)); setErrors({}) }}>Batal</Button>
                <Button type="submit" className="h-9 px-4" disabled={!dirty || busy}>
                  {busy && <Loader2 className="animate-spin" />} Simpan <Kbd className="hidden bg-white/20 text-primary-foreground sm:inline-flex">Ctrl S</Kbd>
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

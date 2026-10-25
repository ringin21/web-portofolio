import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Briefcase, CircleCheck, ExternalLink, FolderGit2, GraduationCap, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { AppSidebar } from '@/components/app-sidebar'
import { SmartImage } from '@/components/smart-image'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { api, loadPortfolio } from '@/lib/api'
import type { Account, Portfolio } from '@/lib/types'
import { Collection } from './Collection'
import { Login } from './Login'
import { isSection, nav, type Section } from './nav'
import { Overview } from './Overview'
import { Profile } from './Profile'
import { Skills } from './Skills'
import type { SaveResult } from './ui'

const hashSection = (): Section => {
  const id = location.hash.slice(1)
  return isSection(id) ? id : 'dashboard'
}

const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]

export default function Admin() {
  const [account, setAccount] = useState<Account | null>()
  const [data, setData] = useState<Portfolio>()
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [section, setSection] = useState(hashSection)
  // Only the profile form keeps an unsaved draft; every other action saves immediately.
  const profileDirty = useRef(false)
  const onDirtyChange = useCallback((dirty: boolean) => { profileDirty.current = dirty }, [])

  // Session check and content load run in parallel (the portfolio is public; main.tsx already started it).
  useEffect(() => {
    api('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setAccount, () => setAccount(null))
  }, [])

  useEffect(() => {
    if (data || loadError) return
    loadPortfolio().then(setData, () => setLoadError(true))
  }, [data, loadError])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => profileDirty.current && e.preventDefault()
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [])

  function navigate(s: Section) {
    if (s === section) return
    if (profileDirty.current && !confirm('Perubahan profil belum disimpan. Tinggalkan halaman ini?')) return
    profileDirty.current = false
    setSection(s)
    history.replaceState(null, '', `#${s}`)
    scrollTo({ top: 0 })
  }

  // Every edit sends the whole document; the server validates and returns the stored version.
  async function persist(next: Portfolio, message: string): Promise<SaveResult> {
    setSaving(true)
    const r = await api('/api/admin/portfolio', 'PUT', next).catch(() => null)
    const body = await r?.json().catch(() => ({}))
    setSaving(false)

    if (r?.ok) {
      setData(body)
      setSaved(true)
      toast.success(message)
      return { ok: true }
    }
    if (r?.status === 401 || r?.status === 419) {
      setAccount(null)
      toast.error('Sesi berakhir', { description: 'Silakan masuk kembali, lalu ulangi perubahan Anda.' })
      return { ok: false, errors: {} }
    }
    if (r?.status === 422) {
      const errors = Object.fromEntries(Object.entries(body.errors as Record<string, string[]>).map(([k, v]) => [k, v[0]!]))
      const count = Object.keys(errors).length
      toast.error('Periksa kembali isian Anda', { description: count > 1 ? `${Object.values(errors)[0]} (+${count - 1} isian lain)` : Object.values(errors)[0] })
      return { ok: false, errors }
    }
    toast.error('Gagal menyimpan', { description: 'Tidak dapat terhubung ke server. Coba lagi.' })
    return { ok: false, errors: {} }
  }

  async function logout() {
    if (profileDirty.current && !confirm('Ada perubahan yang belum disimpan. Tetap keluar?')) return
    await api('/api/admin/logout', 'POST').catch(() => {})
    setAccount(null)
  }

  if (account === null) return <Login onLogin={setAccount} />
  if (loadError && !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">Gagal memuat data portofolio.</p>
          <Button variant="outline" onClick={() => setLoadError(false)}><RefreshCw /> Coba lagi</Button>
        </div>
      </main>
    )
  }
  if (!account || !data) {
    return (
      <div className="flex min-h-screen bg-muted/40" aria-busy="true" aria-label="Memuat">
        <Skeleton className="hidden h-screen w-64 rounded-none md:block" />
        <div className="flex-1 space-y-6 p-8">
          <Skeleton className="h-44 rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const current = nav.find((n) => n.id === section)!
  const list = <K extends 'companies' | 'education' | 'projects'>(key: K) =>
    (items: Portfolio[K], message: string) => persist({ ...data, [key]: items }, message)

  const content: Record<Section, ReactNode> = {
    dashboard: <Overview account={account} data={data} onNavigate={navigate} />,
    profil: <Profile data={data} description={current.description} onPersist={persist} onDirtyChange={onDirtyChange} />,
    pengalaman: (
      <Collection
        title="Pengalaman"
        description={current.description}
        noun="pengalaman"
        icon={Briefcase}
        path="companies"
        items={data.companies}
        onPersist={list('companies')}
        blank={{ name: '', role: '', period: '', logo: '' }}
        fields={[
          { key: 'role', label: 'Posisi', placeholder: 'Software Engineer' },
          { key: 'name', label: 'Perusahaan', placeholder: 'PT Contoh Teknologi' },
          { key: 'period', label: 'Periode', placeholder: '2022 – Sekarang' },
          { key: 'logo', label: 'Logo perusahaan', image: true, aspect: 'square', description: 'Opsional. Logo transparan (PNG/WebP) paling bagus.' },
        ]}
        columns={[
          {
            header: 'Posisi',
            cell: (c) => (
              <div className="flex items-center gap-3">
                <SmartImage src={c.logo} alt="" className="size-10 shrink-0 rounded-lg border bg-white object-contain p-1" fallback={<span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Briefcase className="size-4" /></span>} />
                <div><p className="font-medium">{c.role}</p><p className="text-sm text-muted-foreground">{c.name}</p></div>
              </div>
            ),
          },
          { header: 'Periode', cell: (c) => <Badge variant="secondary">{c.period}</Badge>, className: 'hidden sm:table-cell' },
        ]}
      />
    ),
    pendidikan: (
      <Collection
        title="Pendidikan"
        description={current.description}
        noun="pendidikan"
        icon={GraduationCap}
        path="education"
        items={data.education}
        onPersist={list('education')}
        blank={{ institution: '', degree: '', major: '', period: '' }}
        fields={[
          { key: 'institution', label: 'Institusi', placeholder: 'Universitas Indonesia' },
          { key: 'degree', label: 'Jenjang', placeholder: 'Pilih jenjang', options: ['SMA/SMK', 'D3', 'D4', 'S1', 'S2', 'S3', 'Bootcamp', 'Kursus/Sertifikasi'] },
          { key: 'major', label: 'Jurusan / Program', placeholder: 'Teknik Informatika' },
          { key: 'period', label: 'Periode', placeholder: '2016 – 2020' },
        ]}
        columns={[
          { header: 'Institusi', cell: (e) => <><p className="font-medium">{e.institution}</p><p className="text-sm text-muted-foreground">{e.major}</p></> },
          { header: 'Jenjang', cell: (e) => <Badge variant="outline">{e.degree}</Badge>, className: 'hidden sm:table-cell' },
          { header: 'Periode', cell: (e) => <span className="text-muted-foreground">{e.period}</span>, className: 'hidden md:table-cell' },
        ]}
      />
    ),
    proyek: (
      <Collection
        title="Proyek"
        description={current.description}
        noun="proyek"
        icon={FolderGit2}
        path="projects"
        items={data.projects}
        onPersist={list('projects')}
        blank={{ title: '', description: '', url: '', image: '' }}
        fields={[
          { key: 'title', label: 'Judul proyek', placeholder: 'Aplikasi Kasir Online' },
          { key: 'url', label: 'URL', placeholder: 'https://', description: 'Tautan demo, repositori, atau studi kasus.' },
          { key: 'image', label: 'Gambar proyek', image: true, description: 'Rasio 16:10 disarankan.' },
          { key: 'description', label: 'Deskripsi', multiline: true },
        ]}
        columns={[
          { header: 'Proyek', cell: (p) => <><p className="font-medium">{p.title}</p><p className="max-w-md truncate text-sm text-muted-foreground">{p.description}</p></> },
          {
            header: 'Tautan',
            className: 'hidden md:table-cell',
            cell: (p) => (
              <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                {host(p.url)} <ExternalLink className="size-3.5" />
              </a>
            ),
          },
        ]}
      />
    ),
    keahlian: <Skills stack={data.stack} description={current.description} onPersist={(stack, message) => persist({ ...data, stack }, message)} />,
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar account={account} data={data} section={section} onNavigate={navigate} onLogout={logout} />
        <SidebarInset className="bg-muted/40">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden sm:block">Admin</BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem><BreadcrumbPage className="font-medium">{current.label}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-3">
              <span role="status" className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:inline-flex">
                {saving ? <><Loader2 className="size-4 animate-spin" /> Menyimpan…</> : saved && <><CircleCheck className="size-4 text-emerald-500" /> Tersimpan</>}
              </span>
              <Button variant="outline" asChild className="h-9">
                <a href="/" target="_blank" rel="noreferrer"><ExternalLink /> <span className="hidden sm:inline">Lihat situs</span></a>
              </Button>
            </div>
          </header>

          <div className="mx-auto w-full max-w-6xl p-4 md:p-8">{content[section]}</div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  )
}

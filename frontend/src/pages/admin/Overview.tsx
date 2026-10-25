import { ArrowRight, ArrowUpRight, Briefcase, CircleCheck, CircleDashed, ExternalLink, FolderGit2, GraduationCap, ImageIcon, Rocket, Sparkles } from 'lucide-react'
import { SmartImage } from '@/components/smart-image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import type { Account, Portfolio } from '@/lib/types'
import type { Section } from './nav'
import { completeness } from './progress'
import { IconTile } from './ui'

const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]

export function Overview({ account, data, onNavigate }: { account: Account; data: Portfolio; onNavigate: (s: Section) => void }) {
  const { checks, done, score, next } = completeness(data)
  const stats = [
    { label: 'Proyek', value: data.projects.length, icon: FolderGit2, tint: 'blue', section: 'proyek', hint: 'Ditampilkan di galeri' },
    { label: 'Pengalaman', value: data.companies.length, icon: Briefcase, tint: 'violet', section: 'pengalaman', hint: 'Riwayat kerja' },
    { label: 'Pendidikan', value: data.education.length, icon: GraduationCap, tint: 'amber', section: 'pendidikan', hint: 'Riwayat studi' },
    { label: 'Keahlian', value: data.stack.length, icon: Sparkles, tint: 'emerald', section: 'keahlian', hint: 'Teknologi dikuasai' },
  ] as const

  return (
    <div className="space-y-6">
      {/* Brand banner: greeting + completion, the hero of SaaS dashboards (dibimbing/Ruangguru style). */}
      <section className="relative isolate overflow-hidden rounded-2xl bg-linear-to-br from-primary via-primary to-blue-400 p-6 text-primary-foreground sm:p-8">
        <div aria-hidden className="absolute -top-16 -right-10 -z-10 size-64 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -right-24 -bottom-28 -z-10 size-72 rounded-full bg-white/10" />
        <div className="flex items-center justify-between gap-8">
          <div className="max-w-xl">
            <Badge className="bg-white/15 text-primary-foreground">Dashboard</Badge>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Selamat datang kembali, {account.name.split(' ')[0]}!</h1>
            <p className="mt-2 text-primary-foreground/80">
              {score === 100 ? 'Portofolio Anda sudah lengkap. Tetap perbarui proyek terbaru Anda.' : `Portofolio Anda ${score}% lengkap. Lengkapi agar tampil lebih meyakinkan di mata rekruter dan klien.`}
            </p>
            <div className="mt-5 flex max-w-sm items-center gap-3">
              <Progress value={score} className="h-2 bg-white/20 *:data-[slot=progress-indicator]:bg-white" aria-label="Kelengkapan portofolio" />
              <span className="text-sm font-semibold tabular-nums">{score}%</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {next && (
                <Button variant="secondary" className="h-9 px-4" onClick={() => onNavigate(next.section)}>
                  Lengkapi sekarang <ArrowRight />
                </Button>
              )}
              <Button variant="ghost" asChild className="h-9 px-4 text-primary-foreground ring-1 ring-white/30 hover:bg-white/10 hover:text-primary-foreground">
                <a href="/" target="_blank" rel="noreferrer"><ExternalLink /> Lihat situs</a>
              </Button>
            </div>
          </div>
          <div aria-hidden className="hidden size-36 shrink-0 place-items-center rounded-3xl bg-white/15 ring-1 ring-white/20 backdrop-blur md:grid">
            <Rocket className="size-16" strokeWidth={1.5} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="relative transition hover:-translate-y-0.5 hover:shadow-md has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
            <CardHeader>
              <IconTile icon={s.icon} tint={s.tint} />
              <CardAction>
                {/* stretched button: the whole card is clickable without nesting a div in a button */}
                <button onClick={() => onNavigate(s.section)} aria-label={`Kelola ${s.label}`} className="text-muted-foreground outline-none after:absolute after:inset-0">
                  <ArrowUpRight className="size-4" />
                </button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Proyek terbaru</CardTitle>
            <CardDescription>Tiga proyek teratas yang tampil di situs.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('proyek')}>Lihat semua <ArrowRight /></Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {data.projects.length ? (
              <ul className="divide-y">
                {data.projects.slice(0, 3).map((p) => (
                  <li key={p.title} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <SmartImage
                      src={p.image}
                      alt=""
                      loading="lazy"
                      className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-border"
                      fallback={<IconTile icon={ImageIcon} tint="blue" className="size-12" />}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.title}</p>
                      <p className="truncate text-sm text-muted-foreground">{p.description}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                      <a href={p.url} target="_blank" rel="noreferrer">{host(p.url)} <ArrowUpRight /></a>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyTitle>Belum ada proyek</EmptyTitle>
                  <EmptyDescription>Proyek adalah bagian yang paling sering dilihat pengunjung.</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" onClick={() => onNavigate('proyek')}>Tambah proyek</Button>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Langkah selanjutnya</CardTitle>
            <CardDescription>{done} dari {checks.length} selesai</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {checks.map((c) => (
                <li key={c.label}>
                  <button onClick={() => onNavigate(c.section)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted">
                    {c.done ? <CircleCheck className="size-5 shrink-0 text-emerald-500" /> : <CircleDashed className="size-5 shrink-0 text-muted-foreground" />}
                    <span className={c.done ? 'text-muted-foreground' : 'font-medium'}>{c.label}</span>
                    {!c.done && <ArrowRight className="ml-auto size-4 text-muted-foreground" />}
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

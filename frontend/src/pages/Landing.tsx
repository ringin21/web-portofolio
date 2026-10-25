import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowRight, ArrowUpRight, Briefcase, GraduationCap, ImageIcon, Mail, Menu, RefreshCw } from 'lucide-react'
import AnimatedContent from '@/components/AnimatedContent'
import DotGrid from '@/components/DotGrid'
import LogoLoop from '@/components/LogoLoop'
import Magnet from '@/components/Magnet'
import ShinyText from '@/components/ShinyText'
import SplitText from '@/components/SplitText'
import SpotlightCard from '@/components/SpotlightCard'
import TextType from '@/components/TextType'
import { GithubIcon, LinkedinIcon } from '@/components/brand-icons'
import { SmartImage } from '@/components/smart-image'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { initials, loadPortfolio } from '@/lib/api'
import type { Portfolio } from '@/lib/types'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// three.js is heavy: load it after the hero text has rendered.
const Lanyard = lazy(() => import('@/components/Lanyard'))

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
// shortcut: reduced motion just fast-forwards GSAP tweens; scroll-scrubbed headings still follow the scroll.
if (reduceMotion) gsap.globalTimeline.timeScale(1000)

const links = [
  { href: '#perjalanan', label: 'Perjalanan' },
  { href: '#proyek', label: 'Proyek' },
  { href: '#keahlian', label: 'Keahlian' },
  { href: '#kontak', label: 'Kontak' },
]

const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6'
const external = { target: '_blank', rel: 'noreferrer' } as const
const year = new Date().getFullYear()
// React Bits cards default to #111; match them to the theme surface.
const cardSurface = { '--spotlight-card-surface': 'var(--card)' } as CSSProperties
const spot = 'rgba(59, 130, 246, 0.22)'

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useGSAP(() => {
    const n = { v: 0 }
    gsap.to(n, {
      v: value,
      duration: 1.6,
      ease: 'power3.out',
      snap: { v: 1 },
      scrollTrigger: { trigger: ref.current, start: 'top 95%', once: true },
      onUpdate: () => { ref.current!.textContent = String(n.v) },
    })
  }, { dependencies: [value] })
  return <span ref={ref}>0</span>
}

function SectionHeading({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div id={id} className="mx-auto mb-12 max-w-3xl scroll-mt-24 text-center">
      <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
      <SplitText tag="h2" text={title} splitType="words, chars" delay={20} duration={0.8} effect="blur" className="my-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl" />
      {children && <p className="text-muted-foreground text-pretty">{children}</p>}
    </div>
  )
}

function Navbar({ name }: { name: string }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl">
      <div className={`${container} flex h-16 items-center justify-between gap-4`}>
        <a href="#" className="flex items-center gap-2.5 font-bold">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm text-primary-foreground shadow-lg shadow-primary/30">{initials(name)}</span>
          <span className="truncate">{name}</span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Button key={l.href} variant="ghost" asChild>
              <a href={l.href} className="text-muted-foreground hover:text-foreground">{l.label}</a>
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild className="hidden h-9 rounded-full px-4 sm:inline-flex">
            <a href="#kontak">Hubungi Saya</a>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="Buka menu"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
              <nav className="grid gap-1 px-4">
                {links.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted">{l.label}</a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function Hero({ data }: { data: Portfolio }) {
  const scope = useRef<HTMLDivElement>(null)
  const stats = [
    { value: data.projects.length, label: 'Proyek' },
    { value: data.companies.length, label: 'Perusahaan' },
    { value: data.stack.length, label: 'Teknologi' },
  ]
  const phrases = [data.title, `Membangun dengan ${data.stack.slice(0, 3).join(', ')}`, 'Terbuka untuk kolaborasi'].filter(Boolean)


  return (
    <section ref={scope} className="relative isolate flex min-h-svh items-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <DotGrid dotSize={3} gap={26} baseColor="#1f2a44" activeColor="#3b82f6" proximity={140} shockRadius={260} shockStrength={4} glow={0.8} paused={reduceMotion} />
      </div>
      <div aria-hidden className="absolute top-[-10rem] left-1/2 -z-10 size-[42rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[140px]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-linear-to-t from-background to-transparent" />

      <div className={`${container} grid items-center gap-16 py-16 lg:grid-cols-[1.2fr_1fr]`}>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            <ShinyText text="Terbuka untuk proyek baru" speed={3} color="#94a3b8" shineColor="#ffffff" />
          </span>

          <SplitText
            tag="h1"
            text={`Halo, saya ${data.name}`}
            textAlign="left"
            splitType="words, chars"
            trigger="load"
            delay={25}
            duration={0.9}
            className="mt-6 text-5xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl"
          />

          <TextType
            as="p"
            text={phrases}
            className="mt-5 min-h-9 text-2xl font-semibold text-primary sm:text-3xl"
            typingSpeed={55}
            pauseDuration={1800}
            cursorCharacter="▍"
            cursorClassName="text-primary"
          />

          <AnimatedContent trigger="mount" delay={0.6} distance={30} duration={0.8}>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground text-pretty">{data.bio}</p>
          </AnimatedContent>

          <AnimatedContent trigger="mount" delay={0.8} distance={30} duration={0.8} className="mt-9 flex flex-wrap gap-3">
            <Magnet padding={60} magnetStrength={3}>
              <Button asChild className="h-12 rounded-full px-6 text-base shadow-xl shadow-primary/30">
                <a href="#proyek">Lihat Proyek <ArrowRight data-icon="inline-end" /></a>
              </Button>
            </Magnet>
            <Magnet padding={60} magnetStrength={3}>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/5 px-6 text-base backdrop-blur hover:bg-white/10">
                <a href={`mailto:${data.contact.email}`}><Mail data-icon="inline-start" /> Hubungi Saya</a>
              </Button>
            </Magnet>
          </AnimatedContent>

          <AnimatedContent trigger="mount" delay={1} stagger={0.1} className="mt-12 flex gap-10">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-4xl font-bold tabular-nums"><Counter value={s.value} /><span className="text-primary">+</span></p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </AnimatedContent>
        </div>

        <AnimatedContent trigger="mount" delay={0.3} scale={0.9} blur={12} duration={1.1} className="relative mx-auto w-full max-w-xl">
          <div aria-hidden className="absolute -inset-6 -z-10 rounded-[3rem] bg-linear-to-tr from-primary/40 via-sky-400/10 to-transparent blur-2xl" />
          {/* Lanyard fills its parent and draws the photo on a hanging badge; it falls back to the card color if the image is missing. */}
          <div className="relative h-[34rem] w-full sm:h-[40rem]"><div className="absolute inset-y-0 left-1/2 w-[min(100vw,44rem)] -translate-x-1/2">
            <Suspense fallback={<Skeleton className="mx-auto h-full w-56 rounded-3xl" />}>
            <Lanyard
              frontImage={data.photo || undefined}
              cardColor="#0f172a"
              finish="glossy"
              strapColor="#2563eb"
              metal="silver"
              size={innerWidth < 640 ? 0.3 : 0.46}
              breeze={reduceMotion ? 0 : 0.4}
              intro={!reduceMotion}
            />
            </Suspense>
          </div></div>
          
         
        </AnimatedContent>
      </div>
    </section>
  )
}

function Companies({ companies }: Pick<Portfolio, 'companies'>) {
  const gray = 'brightness-0 invert opacity-60 transition duration-300 hover:brightness-100 hover:invert-0 hover:opacity-100'

  return (
    <section aria-label="Perusahaan" className="bg-background py-10">
      {/* Strip on the page background: logos are white until hovered, then show their own colors. */}
      <p className="mb-6 text-center text-sm text-zinc-500">Pernah berkontribusi di</p>
      <LogoLoop
        ariaLabel="Perusahaan"
        speed={reduceMotion ? 0 : 50}
        gap={80}
        logoHeight={48}
        fadeOutColor="var(--background)"
        pauseOnHover
        logos={companies.map((c) => ({
          title: c.name,
          // Logo only; a company without one falls back to its name so it is not silently dropped.
          node: c.logo ? (
            <SmartImage src={c.logo} alt={c.name} className={`h-12 w-auto max-w-44 object-contain ${gray}`} fallback={<span className={`text-xl font-bold whitespace-nowrap ${gray}`}>{c.name}</span>} />
          ) : (
            <span className={`text-xl font-bold whitespace-nowrap ${gray}`}>{c.name}</span>
          ),
        }))}
      />
    </section>
  )
}

function Timeline({ icon: Icon, title, items }: { icon: typeof Briefcase; title: string; items: { key: string; title: string; subtitle: string; period: string; logo?: string }[] }) {
  return (
    <SpotlightCard spotlightColor={spot} style={cardSurface} className="h-full border border-white/10 p-7!">
      <h3 className="flex items-center gap-3 text-lg font-bold">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary"><Icon className="size-5" /></span>
        {title}
      </h3>
      <AnimatedContent stagger={0.12} distance={24} className="relative mt-7 ml-5 space-y-7 border-l border-white/10 pl-8">
        {items.map((it, i) => (
          <div key={it.key} className="relative">
            <span aria-hidden className={`absolute top-1 -left-[2.45rem] size-3.5 rounded-full ring-4 ring-card ${i === 0 ? 'bg-primary shadow-[0_0_12px] shadow-primary' : 'bg-white/20'}`} />
            <Badge variant="secondary" className="mb-2">{it.period}</Badge>
            <p className="font-semibold">{it.title}</p>
            <p className="flex items-center gap-2 text-muted-foreground">
              {it.logo && <SmartImage src={it.logo} alt="" className="size-5 rounded bg-white object-contain p-0.5" fallback={null} />}
              {it.subtitle}
            </p>
          </div>
        ))}
      </AnimatedContent>
    </SpotlightCard>
  )
}

function Journey({ companies, education }: Pick<Portfolio, 'companies' | 'education'>) {
  const columns = [
    { title: 'Pengalaman Kerja', icon: Briefcase, items: companies.map((c) => ({ key: `${c.name}-${c.period}`, title: c.role, subtitle: c.name, period: c.period, logo: c.logo })) },
    { title: 'Pendidikan', icon: GraduationCap, items: education.map((e) => ({ key: `${e.institution}-${e.period}`, title: e.institution, subtitle: `${e.degree} ${e.major}`, period: e.period })) },
  ].filter((c) => c.items.length)

  return (
    <section className="py-28">
      <div className={container}>
        <SectionHeading id="perjalanan" eyebrow="Perjalanan" title="Pengalaman & pendidikan">
          Tempat saya belajar, berkembang, dan memberi dampak.
        </SectionHeading>
        <AnimatedContent stagger={0.15} distance={50} className={`mx-auto grid gap-6 ${columns.length > 1 ? 'max-w-5xl lg:grid-cols-2' : 'max-w-2xl'}`}>
          {columns.map((c) => <Timeline key={c.title} {...c} />)}
        </AnimatedContent>
      </div>
    </section>
  )
}

function Projects({ projects }: Pick<Portfolio, 'projects'>) {
  return (
    <section className="py-28">
      <div className={container}>
        <SectionHeading id="proyek" eyebrow="Proyek" title="Karya pilihan">
          Beberapa produk yang pernah saya bangun dari ide sampai rilis.
        </SectionHeading>
        <AnimatedContent stagger={0.12} distance={60} className="flex flex-wrap justify-center gap-6">
          {projects.map((p) => (
            <a key={p.title} href={p.url} {...external} className="group block w-full rounded-3xl sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              <SpotlightCard spotlightColor={spot} style={cardSurface} className="flex h-full flex-col border border-white/10 p-3! transition duration-300 group-hover:-translate-y-1 group-hover:border-primary/40">
                <div className="aspect-16/10 overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 to-white/5">
                  <SmartImage
                    src={p.image}
                    alt={`Tampilan ${p.title}`}
                    loading="lazy"
                    width={640}
                    height={400}
                    className="size-full object-cover transition duration-700 group-hover:scale-105"
                    fallback={<div className="grid size-full place-items-center text-primary/50"><ImageIcon className="size-10" /></div>}
                  />
                </div>
                <div className="flex flex-1 flex-col p-3 pt-5">
                  <h3 className="text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
                  <div className="mt-auto flex items-center justify-between pt-5 text-sm">
                    <span className="truncate text-muted-foreground">{hostname(p.url)}</span>
                    <span className="grid size-9 place-items-center rounded-full bg-white/5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>
                </div>
              </SpotlightCard>
            </a>
          ))}
        </AnimatedContent>
      </div>
    </section>
  )
}

function Stack({ stack }: Pick<Portfolio, 'stack'>) {
  const pill = (s: string) => ({
    title: s,
    node: (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-base font-semibold whitespace-nowrap">
        <span className="size-1.5 rounded-full bg-primary" /> {s}
      </span>
    ),
  })
  const half = Math.ceil(stack.length / 2)

  return (
    <section className="overflow-hidden py-28">
      <div className={container}>
        <SectionHeading id="keahlian" eyebrow="Keahlian" title="Teknologi yang saya gunakan" />
      </div>
      <div className="space-y-5">
        <LogoLoop ariaLabel="Keahlian" logos={stack.map(pill)} speed={reduceMotion ? 0 : 45} gap={16} logoHeight={44} pauseOnHover />
        {stack.length > 3 && (
          <LogoLoop ariaLabel="Keahlian lainnya" logos={[...stack.slice(half), ...stack.slice(0, half)].map(pill)} speed={reduceMotion ? 0 : 45} direction="right" gap={16} logoHeight={44} pauseOnHover />
        )}
      </div>
    </section>
  )
}

function Contact({ contact }: Pick<Portfolio, 'contact'>) {
  const ghost = 'h-12 rounded-full px-6 text-base text-white ring-1 ring-white/30 hover:bg-white/10 hover:text-white'

  return (
    <section id="kontak" className="scroll-mt-24 pb-28">
      <div className={container}>
        <AnimatedContent scale={0.95} distance={40} className="relative isolate overflow-hidden rounded-[2.5rem] bg-linear-to-br from-primary via-blue-600 to-indigo-700 px-6 py-20 text-center text-white sm:px-12">
          <div aria-hidden className="absolute -top-32 -left-32 -z-10 size-96 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden className="absolute -right-24 -bottom-40 -z-10 size-[28rem] rounded-full bg-sky-300/20 blur-3xl" />
          <SplitText
            tag="h2"
            text="Punya ide proyek? Mari wujudkan bersama."
            splitType="words"
            delay={60}
            className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl"
          />
          <p className="mx-auto mt-5 max-w-xl text-white/80">Saya terbuka untuk kolaborasi, pekerjaan freelance, maupun posisi full-time.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Magnet padding={60} magnetStrength={3}>
              <Button asChild variant="secondary" className="h-12 rounded-full bg-white px-6 text-base text-blue-700 hover:bg-white/90">
                <a href={`mailto:${contact.email}`}><Mail data-icon="inline-start" /> {contact.email}</a>
              </Button>
            </Magnet>
            <Button asChild variant="ghost" className={ghost}>
              <a href={contact.github} {...external}><GithubIcon data-icon="inline-start" /> GitHub</a>
            </Button>
            <Button asChild variant="ghost" className={ghost}>
              <a href={contact.linkedin} {...external}><LinkedinIcon data-icon="inline-start" /> LinkedIn</a>
            </Button>
          </div>
        </AnimatedContent>
      </div>
    </section>
  )
}

function LoadingState() {
  return (
    <div className={`${container} grid min-h-svh items-center gap-14 py-24 lg:grid-cols-[1.2fr_1fr]`} aria-busy="true" aria-label="Memuat">
      <div className="space-y-5">
        <Skeleton className="h-8 w-56 rounded-full" />
        <Skeleton className="h-16 w-4/5" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-20 w-full max-w-xl" />
      </div>
      <Skeleton className="mx-auto aspect-4/5 w-full max-w-sm rounded-[2rem]" />
    </div>
  )
}

export default function Landing() {
  const [data, setData] = useState<Portfolio>()
  const [error, setError] = useState(false)
  const load = () => loadPortfolio().then(setData, () => setError(true))

  useEffect(() => { load() }, [])

  // The landing is dark-only; set it on <html> so portals (mobile menu sheet) follow too.
  useEffect(() => {
    document.documentElement.classList.add('dark')
    return () => document.documentElement.classList.remove('dark')
  }, [])

  useEffect(() => {
    if (!data) return
    document.title = `${data.name} — ${data.title}`
    // Content mounts after the fetch and fonts/images shift layout, so re-measure scroll triggers.
    requestAnimationFrame(() => ScrollTrigger.refresh())
    document.fonts.ready.then(() => ScrollTrigger.refresh())
  }, [data])

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Periksa koneksi Anda lalu coba lagi.</p>
            <Button variant="outline" size="sm" onClick={() => { setError(false); load() }}><RefreshCw /> Coba lagi</Button>
          </AlertDescription>
        </Alert>
      </main>
    )
  }
  if (!data) return <LoadingState />

  return (
    <div className="overflow-x-clip">
      <Navbar name={data.name} />
      <main>
        <Hero data={data} />
        {data.companies.length > 0 && <Companies companies={data.companies} />}
        {(data.companies.length > 0 || data.education.length > 0) && <Journey companies={data.companies} education={data.education} />}
        {data.projects.length > 0 && <Projects projects={data.projects} />}
        {data.stack.length > 0 && <Stack stack={data.stack} />}
        <Contact contact={data.contact} />
      </main>
      <footer className="border-t border-white/5">
        <div className={`${container} flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row`}>
          <p>© {year} {data.name}. Semua hak dilindungi.</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" asChild><a href={`mailto:${data.contact.email}`} aria-label="Email"><Mail /></a></Button>
            <Button variant="ghost" size="icon" asChild><a href={data.contact.github} aria-label="GitHub" {...external}><GithubIcon /></a></Button>
            <Button variant="ghost" size="icon" asChild><a href={data.contact.linkedin} aria-label="LinkedIn" {...external}><LinkedinIcon /></a></Button>
          </div>
        </div>
      </footer>
    </div>
  )
}

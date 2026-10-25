import { useState, type FormEvent } from 'react'
import { ArrowLeft, CircleCheck, Loader2, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { Account } from '@/lib/types'

const year = new Date().getFullYear()
const perks = ['Perbarui profil, proyek, dan pengalaman', 'Perubahan langsung tampil di situs', 'Aman dengan sesi & proteksi CSRF']

export function Login({ onLogin }: { onLogin: (account: Account) => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const r = await api('/api/admin/login', 'POST', Object.fromEntries(new FormData(e.currentTarget))).catch(() => null)
    const body = await r?.json().catch(() => ({}))
    setBusy(false)
    if (r?.ok) onLogin(body)
    else setError(r?.status === 429 ? 'Terlalu banyak percobaan. Tunggu sebentar.' : body?.message ?? 'Tidak dapat terhubung ke server.')
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative isolate hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -top-32 -right-32 -z-10 size-96 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -bottom-40 -left-20 -z-10 size-[28rem] rounded-full bg-white/5" />
        <p className="flex items-center gap-2.5 text-lg font-bold">
          <span className="grid size-9 place-items-center rounded-lg bg-white text-sm text-primary">P</span> Portofolio Admin
        </p>
        <div className="max-w-md">
          <h2 className="text-4xl font-bold tracking-tight text-balance">Kelola portofolio Anda dalam satu dashboard.</h2>
          <ul className="mt-8 space-y-3 text-primary-foreground/85">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-3"><CircleCheck className="size-5 shrink-0" /> {p}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/60">© {year}</p>
      </section>

      <section className="flex flex-col justify-center bg-muted/40 p-4 sm:p-8">
        <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Masuk ke Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gunakan akun admin Anda untuk melanjutkan.</p>
          </div>
          {error && (
            <Alert variant="destructive" role="alert">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="username" placeholder="nama@email.com" className="h-10 bg-background" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" className="h-10 bg-background" required />
          </div>
          <Button className="h-10 w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {busy ? 'Memproses…' : 'Masuk'}
          </Button>
          <Button variant="link" asChild className="w-full text-muted-foreground">
            <a href="/"><ArrowLeft /> Kembali ke situs</a>
          </Button>
        </form>
      </section>
    </main>
  )
}

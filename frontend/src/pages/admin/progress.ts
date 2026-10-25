import type { Portfolio } from '@/lib/types'
import type { Section } from './nav'

export function completeness(d: Portfolio) {
  const checks: { label: string; done: boolean; section: Section }[] = [
    { label: 'Isi nama, jabatan, dan bio', done: !!(d.name && d.title && d.bio), section: 'profil' },
    { label: 'Tambahkan foto profil', done: !!d.photo, section: 'profil' },
    { label: 'Lengkapi email, GitHub, dan LinkedIn', done: !!(d.contact.email && d.contact.github && d.contact.linkedin), section: 'profil' },
    { label: 'Tambahkan pengalaman kerja', done: d.companies.length > 0, section: 'pengalaman' },
    { label: 'Tambahkan riwayat pendidikan', done: d.education.length > 0, section: 'pendidikan' },
    { label: 'Tampilkan minimal 2 proyek', done: d.projects.length >= 2, section: 'proyek' },
    { label: 'Tambahkan minimal 5 keahlian', done: d.stack.length >= 5, section: 'keahlian' },
  ]
  const done = checks.filter((c) => c.done).length
  return { checks, done, score: Math.round((done / checks.length) * 100), next: checks.find((c) => !c.done) }
}

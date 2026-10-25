import { Briefcase, FolderGit2, GraduationCap, LayoutDashboard, Sparkles, UserRound } from 'lucide-react'

export const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Utama', description: 'Ringkasan isi dan kelengkapan portofolio Anda.' },
  { id: 'profil', label: 'Profil', icon: UserRound, group: 'Utama', description: 'Identitas, bio, dan kontak yang tampil di situs.' },
  { id: 'pengalaman', label: 'Pengalaman', icon: Briefcase, group: 'Konten', description: 'Riwayat kerja Anda, urutkan dari yang terbaru.' },
  { id: 'pendidikan', label: 'Pendidikan', icon: GraduationCap, group: 'Konten', description: 'Riwayat pendidikan formal maupun non-formal.' },
  { id: 'proyek', label: 'Proyek', icon: FolderGit2, group: 'Konten', description: 'Karya terbaik yang ingin Anda tampilkan.' },
  { id: 'keahlian', label: 'Keahlian', icon: Sparkles, group: 'Konten', description: 'Teknologi dan tools yang Anda kuasai.' },
] as const

export type Section = (typeof nav)[number]['id']

export const isSection = (s: string): s is Section => nav.some((n) => n.id === s)

// Maps a Laravel validation key like "projects.0.url" to the section that edits it.
const owners: Record<string, Section> = { companies: 'pengalaman', education: 'pendidikan', projects: 'proyek', stack: 'keahlian' }
export const sectionOf = (key: string): Section => owners[key.split('.')[0]!] ?? 'profil'

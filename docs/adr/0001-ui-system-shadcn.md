# ADR-0001: shadcn/ui + design token Tailwind sebagai sistem UI

**Status:** Proposed (sudah diimplementasi, menunggu review)
**Date:** 2026-10-25
**Deciders:** Pemilik proyek

## Context

Landing page dan dashboard admin perlu didesain ulang menjadi gaya SaaS yang minimalis dan modern (acuan: Ruangguru, Mekari, dibimbing.id).

Kondisi sebelumnya:

- Ada dua sistem styling. `index.css` berisi CSS neo-brutalist yang ditulis tangan untuk landing. `admin.css` berisi Tailwind dengan utility class inline untuk dashboard. Tidak ada token yang dipakai bersama, jadi warna, radius, dan font berbeda antar halaman.
- shadcn sudah di-*init* (`components.json`, style `radix-nova`, util `cn`), tapi baru `button.tsx` yang terpasang dan theme token-nya belum ada di CSS.
- Font dimuat dari Google Fonts lewat `<link>` yang memblokir render.
- Aplikasinya kecil: 2 halaman (`/` dan `/admin`), satu admin, konten di bawah 10 KB.

Batasan: harus tetap ringan untuk pengunjung landing, mudah dirawat satu orang, dan tetap memakai Tailwind v4 + React 19 + Vite yang sudah ada.

## Decision

1. Pakai **shadcn/ui** sebagai sistem komponen untuk kedua halaman. Komponen yang dipasang: `sidebar`, `card`, `badge`, `avatar`, `input`, `label`, `textarea`, `separator`, `dropdown-menu`, `sonner`, `alert-dialog`, `breadcrumb`, `skeleton`, `sheet`, `tooltip`, `alert`, ditambah `table`, `dialog`, `tabs`, `progress`, `empty`, `field`, `select`, `kbd`, `input-group` untuk dashboard versi kedua (lihat ADR-0003).
2. Satu file token, `src/index.css`: CSS variables `oklch` dengan warna primer biru SaaS, skala radius, dan font **Plus Jakarta Sans** yang di-*self-host* lewat `@fontsource-variable`. `admin.css` dihapus.
3. Routing tetap memakai switch `pathname` + `lazy()` di `main.tsx`, tanpa react-router.
4. `next-themes` dihapus dari `sonner.tsx` karena situs ini hanya punya light mode dan tidak memakai theme provider.

## Options Considered

### Option A: shadcn/ui (copy-in, berbasis Radix) — dipilih

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low. Sudah di-init, komponennya file biasa di `src/components/ui` |
| Cost | Gratis. Runtime: Radix per primitive, tree-shaken |
| Scalability | Baik. Komponen bisa diubah langsung karena kodenya milik kita |
| Team familiarity | Tinggi. Tailwind sudah dipakai di admin |

**Pros:** aksesibilitas (focus trap, keyboard, ARIA) sudah ditangani Radix. Tema cukup diatur dari CSS variables. Ada `Sidebar` siap pakai (collapsible, versi mobile memakai Sheet, shortcut Ctrl+B).
**Cons:** tidak ada upgrade otomatis, perubahan dari upstream harus ditarik manual dengan `shadcn add --overwrite`. Jumlah file di repo bertambah (17 komponen).

### Option B: Tetap memakai CSS/Tailwind tulisan tangan (status quo)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low untuk mulai, tapi naik setiap kali komponen interaktif baru dibutuhkan |
| Cost | Nol dependency |
| Scalability | Buruk. Dialog, dropdown, dan sheet yang aksesibel harus dibuat sendiri |
| Team familiarity | Tinggi |

**Pros:** bundle paling kecil.
**Cons:** dua gaya tetap terpisah. Konfirmasi hapus, menu user, dan toast harus dibuat dari nol, dan aksesibilitasnya mudah salah.

### Option C: Library komponen penuh (MUI / Ant Design / Mantine)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium. Ada sistem styling kedua di samping Tailwind |
| Cost | Runtime lebih berat (CSS-in-JS atau stylesheet global besar) |
| Scalability | Baik untuk dashboard besar |
| Team familiarity | Rendah di repo ini |

**Pros:** komponen sangat lengkap (data grid, date picker).
**Cons:** tampilan bawaannya khas library dan sulit dibuat terlihat seperti SaaS lokal. Bentrok dengan Tailwind. Terlalu berat untuk 2 halaman.

## Trade-off Analysis

Pilihannya antara bundle minimum (B) dan komponen interaktif yang aksesibel tanpa harus menulis ulang (A). Selisih biaya A dibanding B terukur di build produksi: landing memuat sekitar **103 KB JS gzip** (`index` 69.9 + chunk bersama 28.5 + `Landing` 4.6). Chunk bersama 28.5 KB itu sebagian besar Radix Dialog untuk menu mobile (Sheet). Dashboard memuat tambahan 56 KB gzip, tetapi hanya untuk admin karena di-*lazy load*. C ditolak karena biayanya paling besar dan tampilannya paling sulit dikontrol.

Routing tanpa react-router tetap diterima karena hanya ada 2 halaman. Navigasi section di dashboard memakai `location.hash`, jadi refresh tetap membuka section yang sama.

## Consequences

- **Lebih mudah:** tampilan konsisten di semua halaman lewat satu sumber token. Mengganti warna brand cukup di `:root`. Dashboard mendapat collapsible sidebar, AlertDialog konfirmasi hapus, toast, dan skeleton loading tanpa kode a11y buatan sendiri.
- **Lebih sulit:** komponen di `src/components/ui` harus dirawat sendiri. Jangan diubah sembarangan karena perubahan bisa tertimpa saat menjalankan `shadcn add --overwrite`.
- **Perlu ditinjau ulang:**
  - Kalau halaman bertambah, pindah ke react-router.
  - Kalau 28 KB Radix Dialog di landing terasa berat, Sheet bisa di-*lazy load* karena hanya dipakai di mobile.
  - Dark mode: token `.dark` sudah ada, tetapi belum ada toggle.

## Action Items

1. [x] Pasang komponen shadcn dan pindahkan semua styling ke `index.css`
2. [x] Self-host font, hapus `<link>` Google Fonts
3. [ ] QA visual desktop dan mobile (landing, login, dashboard)
4. [ ] Ganti placeholder `/photo.jpg` dan `/projects/*.jpg` dengan aset asli. Untuk sementara `SmartImage` menampilkan fallback inisial atau ikon
5. [ ] Opsional: lazy-load `Sheet` di landing

# ADR-0003: Pola dashboard SaaS: tabel + drawer, simpan per aksi

**Status:** Proposed (sudah diimplementasi, menunggu review)
**Date:** 2026-10-25
**Deciders:** Pemilik proyek

## Context

Dashboard versi pertama (ADR-0001) dinilai kurang menarik. Semua item ditampilkan sebagai kartu form yang terbuka bertumpuk, dan ada satu tombol "Simpan" global untuk seluruh dokumen. Selain itu dibutuhkan section baru, **Pendidikan**.

Pola yang konsisten di dashboard SaaS acuan (Mekari Talenta/Jurnal, Ruangguru for Business, dibimbing.id):

- Data list ditampilkan sebagai **tabel** dengan toolbar (pencarian, jumlah, tombol "+ Tambah"). Aksi per baris ada di menu `⋯`.
- Form tambah/edit dibuka di **drawer samping** atau dialog, bukan inline.
- **Setiap aksi langsung tersimpan** dan dikonfirmasi lewat toast. Tidak ada tombol simpan global. Pengecualian: halaman pengaturan yang punya footer Batal/Simpan sendiri.
- Halaman beranda berisi **banner brand** (sapaan + progres kelengkapan + CTA), kartu KPI dengan warna aksen berbeda per jenis, kolom utama, dan *right rail* "langkah selanjutnya".
- Halaman profil/pengaturan: **kartu profil di kiri, form bertab di kanan**.
- Sidebar putih dengan grup menu, item aktif diberi tint dan indikator, serta kartu progres di footer.

## Decision

1. Pengalaman, Pendidikan, dan Proyek memakai satu komponen generik `Collection<T>`: Table + pencarian + DropdownMenu (Edit / Naikkan / Turunkan / Hapus) + **Sheet** untuk form + AlertDialog untuk konfirmasi hapus.
2. **Simpan per aksi.** Tambah, edit, hapus, ubah urutan, dan tambah/hapus keahlian langsung memanggil `persist()` (PUT seluruh dokumen) dan menampilkan toast.
3. Profil + Kontak digabung menjadi satu halaman dengan Tabs. Hanya halaman ini yang menyimpan *draft* lokal (footer Batal/Simpan + `Ctrl+S`). Ada peringatan saat pindah halaman atau menutup tab jika *draft* belum disimpan.
4. Error validasi 422 (`education.0.degree`) dipetakan ke field di dalam Sheet atau tab yang sedang terbuka.
5. Data baru: `education[] = { institution, degree, major, period }`. Jenjang memakai Select (SMA/SMK … S3, Bootcamp, Kursus). Di landing ditampilkan sebagai timeline dua kolom "Pengalaman & pendidikan".

## Options Considered

### Option A: Tabel + drawer, simpan per aksi — dipilih

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium. Satu komponen generik dipakai 3 kali |
| Cost | 1 PUT (kurang dari 10 KB) per aksi |
| Scalability | Baik. Tabel tetap ringkas walaupun item puluhan |
| Team familiarity | Pola umum dashboard admin |

**Pros:** cocok dengan ekspektasi pengguna SaaS. Tidak ada keadaan "lupa klik simpan". Halaman tetap ringkas walaupun datanya banyak.
**Cons:** lebih banyak request. Setiap aksi butuh koneksi aktif (tidak bisa mengedit offline lalu menyimpan sekaligus).

### Option B: Form inline + satu tombol simpan global (versi sebelumnya)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | 1 PUT per sesi edit |
| Scalability | Buruk. Halaman memanjang seiring jumlah item |
| Team familiarity | Tinggi |

**Pros:** bisa mengedit banyak hal sekaligus lalu menyimpan sekali.
**Cons:** terlihat seperti form mentah, bukan produk SaaS. Error validasi bisa muncul di section yang sedang tidak dilihat. Perubahan mudah hilang kalau lupa menyimpan.

### Option C: Endpoint CRUD per entitas (`POST /education`, ...)

| Dimension | Assessment |
|-----------|------------|
| Complexity | High. Butuh model atau ID per item di backend |
| Cost | Payload paling kecil |
| Scalability | Terbaik untuk multi-admin |
| Team familiarity | Tinggi |

**Pros:** konkurensi lebih aman.
**Cons:** perlu mengubah penyimpanan (lihat ADR-0002, Option D). UX-nya sama dengan A, dan payload dokumen yang di bawah 10 KB tidak perlu dioptimasi.

## Trade-off Analysis

A memberi UX SaaS tanpa mengubah backend, karena `PUT /api/admin/portfolio` tetap menerima seluruh dokumen. Biayanya beberapa request kecil per sesi edit, dan untuk satu admin itu tidak signifikan. C memberi UX yang sama tetapi menuntut perubahan penyimpanan yang ditolak di ADR-0002.

## Consequences

- **Lebih mudah:** menambah section list baru cukup dengan konfigurasi `fields` + `columns` untuk `Collection`. Toast dan indikator "Tersimpan" di top bar memberi umpan balik yang jelas.
- **Lebih sulit:** setiap aksi mengirim seluruh dokumen. Kalau ada data lain yang tidak valid di server, aksi apa pun akan ditolak. Saat ini tidak mungkin terjadi karena server hanya menyimpan data yang lolos validasi.
- **Perlu ditinjau ulang:** kalau admin lebih dari satu, tambahkan `If-Match` (ADR-0002) supaya simpan per aksi tidak saling menimpa.

## Action Items

1. [x] `Collection`, `Profile` (Tabs), `Skills` (saran populer), `Overview` (banner + KPI + checklist)
2. [x] Backend: validasi `education.*` + test
3. [ ] QA visual desktop dan mobile

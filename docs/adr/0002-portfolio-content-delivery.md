# ADR-0002: Penyimpanan & penyajian konten portofolio (file JSON + ETag)

**Status:** Proposed (sudah diimplementasi, menunggu review)
**Date:** 2026-10-25
**Deciders:** Pemilik proyek

## Context

Konten portofolio (profil, pengalaman, proyek, stack, kontak) diedit oleh **satu admin** dan dibaca oleh semua pengunjung lewat `GET /api/portfolio`. Ukurannya di bawah 10 KB. Edit jarang dilakukan, sedangkan baca terjadi di setiap kunjungan.

Kondisi sebelumnya:

- `routes/api.php` memanggil `Storage::json('portfolio.json') ?? config('portfolio')`. File di-*decode* lalu di-*encode* ulang di setiap request, dan tidak ada header cache sama sekali.
- Validasi update ada di dalam `AdminController::update` bersama login dan logout.
- Frontend menunggu chunk JS halaman selesai diunduh dulu, baru memulai fetch. Akibatnya terjadi waterfall.
- `.env`: `CACHE_STORE=database`, `DB_CONNECTION=sqlite`.

Syarat: setelah admin menyimpan, perubahan harus **langsung** terlihat di situs, dan pembacaan harus semurah mungkin.

## Decision

1. Konten **tetap disimpan di file JSON** (`storage/app/private/portfolio.json`). `config/portfolio.php` menjadi default.
2. `PortfolioController::show` mengirim isi file **apa adanya** (`Content-Type: application/json`) tanpa decode dan encode ulang.
3. Route publik memakai middleware `cache.headers:public;no_cache;etag`. Browser selalu melakukan revalidasi, dan menerima **304** tanpa body kalau konten tidak berubah.
4. Validasi dipindah ke `UpdatePortfolioRequest`. `prepareForValidation` membuang tag stack yang kosong atau duplikat (`array_unique(..., SORT_REGULAR)` supaya input array bersarang tidak memicu error 500). Batas jumlah item ditambahkan (`max:50` / `max:100`).
5. Frontend memulai `loadPortfolio()` (promise yang di-*memoize*) di `main.tsx`, paralel dengan unduhan chunk halaman, ditambah `<link rel="preload" as="fetch">` di `index.html`. Di dashboard, cek sesi (`/me`) dan load konten berjalan paralel.

## Options Considered

### Option A: File JSON + `no-cache` + ETag — dipilih

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low. Satu file, satu middleware bawaan Laravel |
| Cost | 1 baca file + hash xxh128 per request. Kunjungan ulang mendapat 304 tanpa body |
| Scalability | Cukup untuk trafik portofolio. Bisa ditaruh di belakang CDN |
| Team familiarity | Tinggi |

**Pros:** konten baru langsung terlihat setelah disimpan. Tidak perlu migrasi. Tidak ada invalidasi cache yang harus diurus.
**Cons:** tetap ada satu round-trip ke server per kunjungan untuk revalidasi. Tulis bersamaan dari dua admin akan saling menimpa (*last write wins*).

### Option B: `Cache-Control: max-age=N`

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | Paling murah. Tidak ada request selama N detik |
| Scalability | Paling baik |
| Team familiarity | Tinggi |

**Pros:** nol request dalam jendela cache.
**Cons:** pengunjung, termasuk admin di tab lain, melihat data **basi sampai N detik** setelah disimpan. Ini melanggar syarat "langsung terlihat".

### Option C: Laravel Cache (`Cache::rememberForever` + `forget` saat update)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium. Ada invalidasi yang harus diurus |
| Cost | Dengan `CACHE_STORE=database`, ini **menambah query SQLite** untuk menggantikan baca file 10 KB, jadi lebih lambat |
| Scalability | Baru masuk akal dengan Redis/APCu |
| Team familiarity | Tinggi |

**Pros:** berguna kalau sumber datanya mahal.
**Cons:** di sini sumber datanya sudah murah. Menambah satu lapisan lagi yang bisa tidak sinkron.

### Option D: Normalisasi ke tabel database (Eloquent: `projects`, `companies`, ...)

| Dimension | Assessment |
|-----------|------------|
| Complexity | High. Butuh migrasi, model, dan endpoint CRUD per entitas |
| Cost | Beberapa query per request |
| Scalability | Baik kalau ada banyak admin, edit per item, atau riwayat perubahan |
| Team familiarity | Tinggi |

**Pros:** konkurensi aman, update per item, bisa diaudit.
**Cons:** terlalu besar untuk satu dokumen kecil dengan satu editor. Dashboard sudah menyimpan seluruh dokumen sekaligus.

## Trade-off Analysis

Pertimbangan utamanya adalah kesegaran data dibanding jumlah request. B paling hemat, tapi melanggar syarat bahwa hasil edit harus langsung terlihat. A memberi kesegaran penuh, dan biaya per kunjungan ulang hanya satu respons 304 kecil. Ini sudah diverifikasi: request dengan `If-None-Match` mengembalikan 304. C justru lebih lambat dengan cache store yang dipakai sekarang. D menyelesaikan masalah konkurensi yang belum ada.

Mengirim file mentah menghemat satu siklus `json_decode`/`json_encode` per request. File disimpan tanpa `JSON_PRETTY_PRINT` supaya payload lebih kecil.

## Consequences

- **Lebih mudah:** hasil edit admin langsung tampil. Validasi terpusat di FormRequest dan pesan error memakai nama field berbahasa Indonesia. Controller auth dan konten sekarang terpisah. Dashboard bisa menandai field yang salah karena error 422 dipetakan per key (`projects.0.url`).
- **Lebih sulit:** `show` mempercayai isi file karena tidak di-*decode* lagi. File hanya boleh ditulis lewat `update` yang sudah tervalidasi, jangan diedit manual dengan JSON yang tidak valid.
- **Perlu ditinjau ulang:**
  - Kalau ada lebih dari satu admin, tambahkan optimistic locking: kirim ETag lewat `If-Match` saat `PUT`, atau pindah ke D.
  - Kalau trafik besar, tambahkan `s-maxage` pendek untuk CDN.
  - Migrasi file lama: `portfolio.json` yang tersimpan dengan pretty-print tetap valid dan akan dipadatkan saat penyimpanan berikutnya.
  - Field baru (mis. `education`): karena `show` tidak men-*decode* file, file lama tidak otomatis mendapat field itu. Frontend menormalkannya di `loadPortfolio()` (`education ?? []`), dan penyimpanan berikutnya menulis field tersebut. Kalau field baru makin banyak, pindahkan normalisasi ke `show` (decode + merge dengan default), dengan konsekuensi optimasi "kirim apa adanya" hilang.

## Action Items

1. [x] `PortfolioController` + `UpdatePortfolioRequest`, route memakai `cache.headers`
2. [x] Test: stack dibersihkan, revalidasi ETag (304), `Content-Type` (8 test lulus)
3. [x] Frontend: preload + promise yang di-*memoize*, `/me` dan konten diambil paralel
4. [ ] Opsional: optimistic locking `If-Match` kalau admin lebih dari satu

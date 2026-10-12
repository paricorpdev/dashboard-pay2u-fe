# PayGate — Dashboard Frontend

Dashboard pemantauan **payment method** (Virtual Account & QRIS) untuk backend Go (Fiber) `dashboard-pay2u-be`. Dibangun dengan **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS v4**, dan **Recharts**.

## Fitur

- **Autentikasi** — halaman login, sesi JWT (access + refresh token), auto-refresh pada 401, guard route terproteksi.
- **Dashboard Overview** — KPI (total volume, total transaksi, success rate, admin fee) + grafik tren volume, komposisi status, donut **VA vs QRIS**, donut **vendor/bank**, dan tabel rincian metode pembayaran.
- **Analytics** — grafik volume (bulanan/tahunan), tren status bertumpuk, donut VA/QRIS, donut vendor, dan tabel rincian per bulan.
- **Filter Bulanan & Tahunan** — toggle periode + pemilih bulan, tahun, dan merchant.
- **Transaksi** — tabel dengan filter (nama, status, metode, merchant), pagination, dan drawer detail (termasuk riwayat webhook dispatch).
- **Merchants** — CRUD lengkap (tambah, edit, hapus), lihat kredensial (API key & webhook secret), dan regenerate secret.
- **Roles & Akses** — daftar role, permission per role, dan permission yang dikelompokkan berdasarkan resource.

## Menjalankan

Pastikan backend Go berjalan di `http://localhost:8080` (lihat `../dashboard-pay2u-be`).

```bash
# 1. Install dependencies
npm install

# 2. (Opsional) ubah URL backend bila tidak di localhost:8080
#    edit file .env.local
echo "BACKEND_URL=http://localhost:8080" > .env.local

# 3. Jalankan dev server
npm run dev
```

Buka http://localhost:3000 — Anda akan diarahkan ke halaman login.

**Kredensial default (dari seed backend):**
- Username: `admin` · Password: `password123` (ROLE_SUPER_ADMIN)
- `admin_ops` / `password123` (ROLE_ADMIN)
- `staff` / `password123` (ROLE_USER)

## Arsitektur Proxy API

Backend hanya mengizinkan origin `localhost` tanpa port pada CORS. Untuk menghindari masalah CORS, semua request `/api/*` dari browser di-**proxy** oleh Next.js (`next.config.ts` → `rewrites`) ke backend Go. Token JWT dikirim sebagai header `Authorization: Bearer <token>`.

## Struktur

```
src/
├── app/
│   ├── (app)/                 # Route group terproteksi (butuh login)
│   │   ├── layout.tsx         # Auth guard + AppShell
│   │   ├── dashboard/         # Overview + KPI + semua grafik
│   │   ├── analytics/         # Grafik mendalam (bulanan/tahunan)
│   │   ├── transactions/      # Tabel + filter + drawer detail
│   │   ├── merchants/         # CRUD merchant + kredensial
│   │   └── access/            # Roles & permissions
│   ├── login/                 # Halaman login
│   ├── layout.tsx             # Root layout (AuthProvider, font, metadata)
│   ├── page.tsx               # Redirect ke /dashboard
│   └── globals.css            # Tema gelap (aurora, glass, gradient)
├── components/                # UI primitives, charts, dialogs, shell
└── lib/
    ├── api.ts                 # Klien API (semua endpoint) + token store
    ├── auth-context.tsx       # Context autentikasi
    ├── analytics.ts           # Agregasi data bulanan & tahunan
    ├── types.ts               # Tipe TypeScript (mirror payload backend)
    ├── utils.ts               # Formatter (IDR, tanggal, metode bayar)
    ├── chart-colors.ts        # Palet warna grafik
    └── use-merchants.ts       # Hook daftar merchant + opsi tahun
```

## Catatan Mode Tahunan

Endpoint analytics backend hanya menerima parameter `month` + `year`. Untuk mode **tahunan**, frontend melakukan 12 query paralel (satu per bulan) lalu menggabungkannya menjadi satu seri tahunan.

## Script

```bash
npm run dev     # Development server (Turbopack)
npm run build   # Production build
npm run start   # Jalankan hasil build
npm run lint    # ESLint
```

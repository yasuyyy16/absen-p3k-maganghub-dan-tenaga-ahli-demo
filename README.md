# Absensi P3K - MagangHub & Tenaga Ahli

Web aplikasi absensi untuk peserta MagangHub dan Tenaga Ahli pada unit P3K (Pesisir dan Pulau-Pulau Kecil), Kementerian Kelautan dan Perikanan (KKP).

Aplikasi ini digunakan untuk melakukan absensi harian, melihat riwayat kehadiran, mengelola profil pengguna, serta menghasilkan status ALFA secara otomatis pada hari kerja ketika pengguna tidak melakukan absensi.

## ✨ Fitur

### Absensi

- Check-in dan check-out absensi.
- Pencatatan waktu absensi.
- Pencatatan lokasi menggunakan GPS.
- Penyimpanan koordinat latitude dan longitude.
- Penyimpanan akurasi GPS.
- Penyimpanan alamat lokasi.
- Status kehadiran:
  - `HADIR`
  - `IZIN`
  - `SAKIT`
  - `ALFA`

### Riwayat Absensi

- Melihat riwayat absensi pengguna.
- Menampilkan tanggal, waktu masuk, waktu pulang, status, dan informasi lokasi.
- Data absensi tersimpan secara permanen di database.

### Profil

- Melihat informasi profil pengguna.
- Informasi jenis personel.
- Informasi universitas dan jurusan untuk peserta magang.

### Otomatisasi ALFA

Sistem memiliki mekanisme otomatis untuk menghasilkan status `ALFA` bagi pengguna yang memenuhi kondisi tertentu tetapi tidak melakukan absensi pada hari kerja.

Proses otomatis dijalankan menggunakan Vercel Cron melalui endpoint:

```text
/api/cron/alfa
```

Endpoint dilindungi menggunakan `CRON_SECRET` sehingga tidak dapat dipanggil tanpa autentikasi yang valid.

### Autentikasi

- Login menggunakan username dan password.
- Password disimpan dalam bentuk hash.
- Session menggunakan session token.
- Session memiliki masa berlaku.
- Pengguna dapat dinonaktifkan tanpa menghapus data historis.

## 🛠️ Teknologi

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **Tailwind CSS**
- **Leaflet**
- **Argon2**
- **bcryptjs**
- **Jose**
- **Vercel**

## 📁 Struktur Project

```text
absen-p3k-maganghub-dan-tenaga-ahli/
│
├── app/
│   ├── absensi/
│   │   ├── login/
│   │   ├── profil/
│   │   └── riwayat/
│   │
│   └── api/
│       └── cron/
│           └── alfa/
│
├── lib/
│   ├── attendance/
│   │   └── alfa/
│   ├── auth.ts
│   ├── prisma.ts
│   └── time.ts
│
├── prisma/
│   └── schema.prisma
│
├── scripts/
│
├── public/
│
├── .env
├── vercel.json
├── package.json
└── tsconfig.json
```

## 🗄️ Database

Aplikasi menggunakan **PostgreSQL** sebagai database dan **Prisma** sebagai ORM.

Model utama yang digunakan:

- `attendance_users`
- `attendances`
- `sessions`

Jenis personel:

```text
MAGANG
TENAGA_AHLI
```

Status absensi:

```text
HADIR
IZIN
SAKIT
ALFA
```

### Relasi Data

Setiap data absensi dikaitkan dengan pengguna berdasarkan:

```text
person_type
person_id
```

Sistem juga menerapkan unique constraint pada:

```text
person_type + person_id + date
```

sehingga satu pengguna tidak dapat memiliki lebih dari satu record absensi pada tanggal yang sama.

## 🔐 Environment Variables

Buat file `.env` pada environment development:

```env
DATABASE_URL="your-postgresql-connection-string"
SESSION_SECRET="your-session-secret"
CRON_SECRET="your-cron-secret"
```

### `DATABASE_URL`

Connection string PostgreSQL yang digunakan Prisma untuk mengakses database.

### `SESSION_SECRET`

Secret yang digunakan untuk keamanan session aplikasi.

Gunakan nilai acak yang kuat pada production.

### `CRON_SECRET`

Secret untuk mengamankan endpoint otomatisasi ALFA.

Contoh:

```env
CRON_SECRET="your-random-cron-secret"
```

## 🚀 Menjalankan Project Secara Lokal

### 1. Clone Repository

```bash
git clone https://github.com/yasuyyy16/absen-p3k-maganghub-dan-tenaga-ahli.git
cd absen-p3k-maganghub-dan-tenaga-ahli
```

### 2. Install Dependencies

```bash
npm install
```

Prisma Client akan otomatis digenerate melalui script:

```text
prisma generate
```

### 3. Konfigurasi Environment

Buat file:

```text
.env
```

Kemudian isi environment variables yang diperlukan.

### 4. Generate Prisma Client

Jika diperlukan, jalankan:

```bash
npx prisma generate
```

### 5. Jalankan Development Server

```bash
npm run dev
```

Aplikasi dapat diakses melalui:

```text
http://localhost:3000
```

## 🏗️ Production Build

Untuk memastikan aplikasi dapat dibuild:

```bash
npm run build
```

Kemudian jalankan production server:

```bash
npm run start
```

## 🧪 Validation

Beberapa pemeriksaan yang dapat dijalankan:

### TypeScript

```bash
npx tsc --noEmit
```

### ESLint

```bash
npm run lint
```

### Prisma

```bash
npx prisma validate
```

### Production Build

```bash
npm run build
```

## ⏰ Vercel Cron

Konfigurasi cron berada pada:

```text
vercel.json
```

Konfigurasi saat ini:

```json
{
  "crons": [
    {
      "path": "/api/cron/alfa",
      "schedule": "59 16 * * 1-5"
    }
  ]
}
```

Cron menggunakan timezone UTC. Jadwal `59 16 * * 1-5` setara dengan pukul 23:59 WIB setiap Senin–Jumat.

Endpoint cron ini menjalankan fungsi otomatis:
- **Pembuatan absensi ALFA otomatis** untuk pengguna aktif yang belum presensi pada hari kerja yang telah ditutup.

> **Kebijakan Dokumen Bukti (Izin/Sakit)**: Dokumen bukti presensi (Izin/Sakit) disimpan secara permanen tanpa batas waktu (*retained indefinitely*). Tidak ada pembersihan atau penghapusan otomatis file bukti berdasarkan usia absensi. Batas ukuran file yang diunggah adalah maksimal 1 MB per file, dengan kompresi dan penyesuaian resolusi gambar secara otomatis pada sisi klien (*client-side compression*) sebelum pengunggahan.

Endpoint cron:

```text
GET /api/cron/alfa
POST /api/cron/alfa
```

Endpoint dilindungi menggunakan `CRON_SECRET`.

### 🐧 Scheduler untuk Deployment VPS / PaaS / Docker (Non-Vercel)

Jika aplikasi di-deploy di VPS (Ubuntu/Debian) atau PaaS tanpa dukungan native Vercel Cron, gunakan cron Linux atau scheduler internal. **Jangan membuat scheduler kedua**, cukup trigger endpoint yang sama:

Contoh konfigurasi `crontab -e`:

```bash
# Jalankan setiap hari kerja Senin-Jumat pukul 23:59 WIB (Asia/Jakarta)
59 23 * * 1-5 curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/alfa > /dev/null 2>&1
```

Atau menggunakan systemd timer dengan curl serupa.


## 🔒 Keamanan

Beberapa mekanisme keamanan yang diterapkan:

- Password tidak disimpan dalam bentuk plaintext.
- Session menggunakan token yang disimpan dalam database.
- Endpoint cron dilindungi menggunakan secret.
- Pengguna dapat dinonaktifkan.
- Unique constraint mencegah duplikasi absensi pada tanggal yang sama.
- Validasi file bukti dilakukan secara otoritatif di sisi server (ukuran $\le$ 1 MB, MIME type, dan ekstensi file).
- Environment variables digunakan untuk menyimpan credential dan secret.
- Credential database tidak disimpan di repository.

## 🌐 Deployment & Storage

Aplikasi dapat dideploy menggunakan platform yang mendukung Next.js dan PostgreSQL.

### Konfigurasi Penyimpanan Bukti (Vercel Blob)
- **Production (Vercel)**: Menggunakan `@vercel/blob` dengan konfigurasi `BLOB_READ_WRITE_TOKEN`. URL absolut dokumen bukti disimpan di database (`proof_file_url`).
- **Local Development**: Jika `BLOB_READ_WRITE_TOKEN` tidak dikonfigurasi, sistem secara otomatis menggunakan fallback ke penyimpanan filesystem lokal (`public/uploads/proofs/`).

Untuk deployment menggunakan Vercel:

1. Push repository ke GitHub.
2. Import repository ke Vercel.
3. Tambahkan environment variables:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `CRON_SECRET`
   - `BLOB_READ_WRITE_TOKEN` (dibuat via menu Vercel Storage -> Blob)
4. Deploy project.
5. Pastikan Vercel Cron aktif.
6. Verifikasi endpoint `/api/cron/alfa`.

### Environment Production

Gunakan secret yang berbeda dari environment development.

Contoh:

```env
DATABASE_URL="production-database-url"
SESSION_SECRET="production-session-secret"
CRON_SECRET="production-cron-secret"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

## 📌 Catatan

Aplikasi ini merupakan sistem internal yang dikembangkan untuk mendukung kebutuhan administrasi dan monitoring kehadiran peserta MagangHub dan Tenaga Ahli pada unit P3K.

Data absensi mencakup informasi waktu dan lokasi sehingga konfigurasi database, authentication secret, dan environment production harus dijaga dengan baik.

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

Cron menggunakan timezone UTC. Pastikan jadwal cron disesuaikan dengan timezone dan kebutuhan operasional aplikasi.

Endpoint cron:

```text
GET /api/cron/alfa
POST /api/cron/alfa
```

Endpoint membutuhkan `CRON_SECRET`.

## 🔒 Keamanan

Beberapa mekanisme keamanan yang diterapkan:

- Password tidak disimpan dalam bentuk plaintext.
- Session menggunakan token yang disimpan dalam database.
- Endpoint cron dilindungi menggunakan secret.
- Pengguna dapat dinonaktifkan.
- Unique constraint mencegah duplikasi absensi pada tanggal yang sama.
- Environment variables digunakan untuk menyimpan credential dan secret.
- Credential database tidak disimpan di repository.

## 🌐 Deployment

Aplikasi dapat dideploy menggunakan platform yang mendukung Next.js dan PostgreSQL.

Untuk deployment menggunakan Vercel:

1. Push repository ke GitHub.
2. Import repository ke Vercel.
3. Tambahkan environment variables:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `CRON_SECRET`
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
```

## 📌 Catatan

Aplikasi ini merupakan sistem internal yang dikembangkan untuk mendukung kebutuhan administrasi dan monitoring kehadiran peserta MagangHub dan Tenaga Ahli pada unit P3K.

Data absensi mencakup informasi waktu dan lokasi sehingga konfigurasi database, authentication secret, dan environment production harus dijaga dengan baik.

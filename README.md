# Web Presensi P3K (MagangHub, Magang Biasa & Tenaga Ahli)

Aplikasi web presensi mandiri internal untuk peserta Magang (MagangHub & Magang Biasa) serta Tenaga Ahli pada unit P3K (Pesisir dan Pulau-Pulau Kecil), Kementerian Kelautan dan Perikanan (KKP).

Aplikasi ini mencatat kehadiran harian berbasis waktu Indonesia Barat (WIB), memvalidasi lokasi GPS dan radius kerja, mengelola pengajuan izin/sakit beserta bukti dokumen, mencatat aktivitas rapat dan surat tugas dinas, serta menyediakan rekap riwayat kehadiran personal.

---

## Fitur Utama

### 1. Autentikasi dan Manajemen Akun
- **Login Terpusat**: Masuk menggunakan username dan kata sandi yang telah didaftarkan administrator.
- **Keamanan Sandi**: Hash kata sandi menggunakan Argon2id (dengan dukungan verifikasi bcrypt untuk kompatibilitas data lama).
- **Session Aman**: Sesi berbasis token JWT (`jose`) yang disimpan dalam cookie `httpOnly` dengan masa berlaku 12 jam.
- **Wajib Ubah Kata Sandi**: Flag `must_change_password` untuk mewajibkan pengguna memperbarui kata sandi awal saat pertama kali login.
- **Pengaturan Profil**: Pengguna dapat memperbarui nama lengkap, jenis personel (`Tenaga Ahli`, `MagangHub`, `Magang Biasa`), universitas asal (wajib untuk Magang Biasa), dan username unik.

### 2. Alur Presensi Harian (Senin - Jumat)
Sistem beroperasi pada zona waktu bisnis **Asia/Jakarta (WIB)** dengan jendela presensi pukul **00:01 WIB - 23:58 WIB**. Presensi ditutup otomatis pada hari Sabtu dan Minggu.

- **Absen Pagi (HADIR)**:
  - **Senin - Kamis (WFO)**: Memerlukan koordinat GPS aktif dan memvalidasi jarak pengguna berada dalam radius maksimal 100 meter dari Gedung Mina Bahari 3 KKP (Jakarta Pusat).
  - **Jumat (WFA)**: Kebijakan Work From Anywhere, validasi geofence dinonaktifkan dan GPS bersifat opsional.
  - Alamat lokasi dicatat secara otomatis melalui reverse geocoding server-side (OpenStreetMap Nominatim).
- **Absen Pulang**:
  - Menggunakan interaksi geser untuk konfirmasi (*slide-to-confirm*) disertai dialog konfirmasi.
  - Dapat dilakukan kapan saja setelah Absen Pagi berhasil dicatat.
  - Bersifat bebas lokasi (*location-independent*) di semua hari kerja.
- **Pengingat Presensi**:
  - Banner peringatan aktif otomatis mulai pukul 17:00 WIB jika pengguna berstatus HADIR namun belum melakukan Absen Pulang.

### 3. Pengajuan Izin dan Sakit
- Pengguna dapat mengajukan status **IZIN** atau **SAKIT** sebelum absen pagi atau mengubah status dari HADIR ke IZIN/SAKIT (jika belum absen pulang).
- **Wajib Dokumen Bukti**: Pengunggahan file bukti (surat dokter, surat izin) wajib dilampirkan:
  - Format yang didukung: JPG, JPEG, PNG, PDF.
  - Batas ukuran file maksimal 1 MB (dengan kompresi gambar otomatis pada sisi klien sebelum diunggah).
  - Penyimpanan menggunakan `@vercel/blob` pada production dengan fallback otomatis ke filesystem lokal (`public/uploads/proofs/`) pada development.
- Keterangan pengajuan maksimal 500 karakter.

### 4. Presensi Khusus: Rapat
- Status **RAPAT** digunakan untuk penugasan rapat atau pertemuan dinas yang tidak memerlukan jam pulang terpisah.
- Dapat dicatat langsung saat belum presensi, atau dikonversi langsung dari status HADIR.
- Wajib menyertakan catatan/keterangan agenda rapat (maksimal 500 karakter).

### 5. Presensi Khusus: Surat Tugas
- Status **SURAT_TUGAS** digunakan untuk penugasan luar kota atau kegiatan dinas multi-hari.
- **Formulir Surat Tugas**: Mencakup nomor surat tugas, lokasi penugasan, tanggal terbit, tanggal mulai, dan tanggal selesai.
- **Pembuatan Rekap Otomatis**: Sistem secara otomatis membuat baris presensi berstatus `SURAT_TUGAS` untuk seluruh hari kerja (Senin - Jumat) dalam rentang tanggal penugasan (hari libur akhir pekan dilewati).
- **Validasi Integritas**:
  - Mencegah tumpang tindih (*overlap*) antar periode surat tugas.
  - Menolak pembuatan jika pada rentang tanggal tersebut sudah terdapat catatan presensi lain.
- **Detail dan Penghapusan**: Pengguna dapat melihat detail surat tugas atau menghapusnya (penghapusan otomatis membersihkan seluruh baris presensi terkait dan mencatat audit pada log aktivitas).

### 6. Otomatisasi ALFA (Vercel Cron & Webhook)
- Pengguna aktif yang tidak melakukan presensi hingga batas waktu hari kerja ditutup akan otomatis diberi status **ALFA**.
- Proses dijalankan setiap hari kerja (Senin - Jumat) pukul 23:59 WIB (16:59 UTC) melalui endpoint cron:
  `GET /api/cron/alfa` atau `POST /api/cron/alfa`
- Endpoint dilindungi dengan otorisasi `CRON_SECRET`.

### 7. Riwayat Presensi dan Log Aktivitas
- **Riwayat Personal**: Menampilkan tabel presensi pengguna yang sedang login dengan filter per bulan kalender dan pagination server-side (10 data per halaman).
- **Modal Lokasi dan Peta**: Menampilkan visualisasi peta interaktif (Leaflet) untuk titik koordinat masuk dan pulang.
- **Modal Bukti Dokumen**: Preview langsung file bukti izin/sakit (gambar atau PDF).
- **Log Aktivitas**: Riwayat audit aktivitas pengguna (login, absen masuk/pulang, pengajuan izin/sakit, pembuatan/penghapusan surat tugas) yang tersimpan di tabel `user_activities`.

---

## Status Presensi

| Status | Deskripsi | Kebutuhan Lokasi | Bukti Dokumen |
|---|---|---|---|
| `HADIR` | Presensi masuk dan pulang reguler di kantor | GPS & Geofence 100m (Senin-Kamis), Bebas (Jumat) | Tidak |
| `IZIN` | Pengajuan izin tidak masuk kerja | Bebas | Wajib (Maks 1 MB) |
| `SAKIT` | Pengajuan istirahat karena sakit | Bebas | Wajib (Maks 1 MB) |
| `RAPAT` | Penugasan rapat dinas | Bebas | Catatan Agenda |
| `SURAT_TUGAS` | Penugasan dinas luar kota multi-hari | Bebas | Dokumen Surat Tugas |
| `ALFA` | Tidak hadir tanpa keterangan pada hari kerja | Otomatis oleh Cron | Tidak |

---

## Teknologi yang Digunakan

- **Framework**: Next.js 16.3.3 (App Router, Turbopack)
- **UI Library**: React 19.2.8 & React DOM 19.2.8
- **Bahasa**: TypeScript 5
- **Styling**: Tailwind CSS v4 & `@tailwindcss/postcss`
- **Database & ORM**: PostgreSQL & Prisma ORM 5.22.0
- **Autentikasi & Keamanan**: Argon2, bcryptjs, Jose (JWT)
- **Peta & Geolocation**: Leaflet 1.9.4 & OpenStreetMap Nominatim
- **File Storage**: `@vercel/blob` (Cloud) dengan fallback lokal
- **Linter**: ESLint 9

---

## Struktur Direktori

```text
absen-p3k-maganghub-dan-tenaga-ahli/
├── app/
│   ├── absensi/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx               # Dashboard utama presensi
│   │   │   ├── layout.tsx             # Layout navigasi mobile
│   │   │   ├── profil/page.tsx        # Halaman profil pengguna
│   │   │   ├── riwayat/page.tsx       # Riwayat presensi & filter bulan
│   │   │   └── surat-tugas/baru/      # Formulir pembuatan Surat Tugas
│   │   ├── login/                     # Halaman login
│   │   └── layout.tsx
│   ├── actions/                       # Server Actions (auth, attendance, profile)
│   ├── api/
│   │   └── cron/alfa/route.ts         # Endpoint otomatisasi ALFA harian
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── dashboard/                     # Kartu aksi presensi, jam live, modal izin/sakit
│   ├── history/                       # Tabel riwayat, modal lokasi & detail surat tugas
│   ├── layout/                        # Bottom navigation bar mobile
│   ├── map/                           # Komponen peta Leaflet
│   └── profile/                       # Formulir edit data profil & sandi
├── lib/
│   ├── attendance/                    # Logika bisnis ALFA & riwayat
│   ├── constants/                     # Aturan validasi file bukti & waktu
│   ├── auth.ts                        # Manajemen JWT session & cookie
│   ├── geolocation.ts                 # Handler GPS browser
│   ├── location.ts                    # Haversine formula, radius, & reverse geocode
│   ├── password.ts                    # Hash & verifikasi Argon2 / bcrypt
│   ├── prisma.ts                      # Prisma client singleton
│   ├── storage.ts                     # Upload Vercel Blob / filesystem lokal
│   └── time.ts                        # Utilitas waktu Asia/Jakarta (WIB)
├── prisma/
│   └── schema.prisma                  # Skema database PostgreSQL
├── public/
├── vercel.json                        # Jadwal Vercel Cron
├── package.json
└── tsconfig.json
```

---

## Konfigurasi Lingkungan (.env)

Buat file `.env` pada direktori root proyek:

```env
# Koneksi Database PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/db_p3k?schema=public"

# Rahasia Sesi JWT (Gunakan string acak minimal 32 karakter)
SESSION_SECRET="your-secure-random-session-secret"

# Rahasia Endpoint Cron Otomatisasi ALFA
CRON_SECRET="your-secure-random-cron-secret"

# (Opsional) Token Vercel Blob untuk penyimpanan bukti di cloud
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# (Opsional) Konfigurasi Titik Koordinat Kantor & Radius (Default: Gedung Mina Bahari 3 KKP)
ABSENSI_OFFICE_LATITUDE="-6.1791728"
ABSENSI_OFFICE_LONGITUDE="106.8350564"
ABSENSI_OFFICE_RADIUS_METERS="100"

# (Hanya Development) Override waktu untuk simulasi skenario pengujian
# DEV_TIME_OVERRIDE="2026-09-10T08:00:00+07:00"
```

---

## Panduan Menjalankan Proyek

### 1. Pasang Dependensi
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Jalankan Server Development
```bash
npm run dev
```
Aplikasi berjalan secara default di [http://localhost:3000](http://localhost:3000) (atau port 3001 jika port 3000 sedang digunakan). Akses rute `/absensi` untuk memulai.

### 4. Pengecekan Type & Build Produksi
```bash
# Validasi TypeScript
npx tsc --noEmit

# Linting
npm run lint

# Build Produksi
npm run build

# Menjalankan Build Produksi
npm run start
```

---

## Konfigurasi Scheduler Cron (Otomatisasi ALFA)

### Vercel Deployment
File `vercel.json` telah dikonfigurasi untuk menjalankan cron otomatis:
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
*Catatan: Waktu `16:59 UTC` setara dengan pukul `23:59 WIB` setiap hari Senin hingga Jumat.*

### Non-Vercel Deployment (VPS / Linux Cron)
Jika aplikasi dideploy pada VPS, jalankan cron job berikut pada crontab server:
```bash
# Eksekusi setiap Senin - Jumat pukul 23:59 WIB
59 23 * * 1-5 curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/alfa > /dev/null 2>&1
```

---

## Keamanan Data
- Password disimpan dalam bentuk hash Argon2id (dan bcrypt legacy), tidak pernah disimpan dalam format teks biasa.
- Validasi otoritas identitas pengguna, status aktif, koordinat, dan integritas file bukti selalu dieksekusi di sisi server (*Server Actions*).
- File kredensial `.env` diabaikan oleh git dan tidak boleh diikutsertakan dalam commit repositori.

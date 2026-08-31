# PRD — Sistem Absensi MagangHub & Tenaga Ahli P3K

**Versi:** 4.0  
**Status:** Baseline reconstruction dan pengembangan  
**Timezone bisnis:** Asia/Jakarta (WIB)

## 1. Tujuan

Membangun sistem absensi internal untuk peserta MagangHub dan Tenaga Ahli pada unit P3K. Sistem mencatat kehadiran harian secara terstruktur dan menyediakan riwayat absensi personal, menggunakan database PostgreSQL existing yang juga dipakai sistem kepegawaian.

Tujuan utama:
- Authentication khusus aplikasi absensi.
- Absen Pagi dan Absen Pulang.
- Pengajuan Izin dan Sakit.
- Pencegahan duplikasi absensi.
- Riwayat absensi personal.
- Identity terikat ke session server-side.
- UI mobile-first yang sederhana.

## 2. Scope

### In Scope
- Authentication dan session.
- Account provisioning oleh admin.
- Absen Pagi.
- Absen Pulang.
- Izin dan Sakit.
- Reminder lupa Absen Pulang.
- Riwayat, filter bulan, pagination.
- Timezone WIB.
- Development time simulation.
- Server-side validation.
- Database concurrency protection.
- Mobile-first UI.

### Out of Scope
- Public registration.
- Login nomor telepon.
- OTP sebagai login utama.
- Google/Microsoft login.
- Reset password mandiri.
- User memilih `person_id`/`person_type`.
- User mengajukan ALFA melalui UI.
- User menghapus atau mengubah timestamp absensi.
- Geolocation, selfie, face recognition, QR attendance, dan fitur masa depan lain tanpa perubahan PRD.

## 3. Terminologi UI

| Istilah teknis | Istilah UI |
|---|---|
| Check-in | Absen Pagi |
| Check-out | Absen Pulang |
| Attendance | Absensi |
| Leave | Izin |
| Sick | Sakit |

UI tidak boleh menggunakan "Check In" atau "Check Out" sebagai label aksi utama.

## 4. User Roles

### 4.1 Peserta
Jenis:
- `MAGANG`
- `TENAGA_AHLI`

Dapat:
- Login.
- Absen Pagi.
- Absen Pulang sesuai syarat.
- Mengajukan Izin/Sakit.
- Melihat riwayat sendiri.

Tidak dapat:
- Registrasi mandiri.
- Melihat absensi orang lain.
- Menentukan identity attendance sendiri.
- Menghapus attendance.
- Mengajukan ALFA.

### 4.2 Administrator
Dapat:
- Membuat akun peserta.
- Menentukan mapping akun ke person.
- Mengaktifkan/menonaktifkan akun.

Menonaktifkan akun tidak boleh menghapus data person atau riwayat absensi.

## 5. Authentication

### 5.1 Attendance User

Tabel `attendance_users`:
- `id`
- `username`
- `password_hash`
- `person_type`
- `person_id`
- `is_active`
- `created_at`
- `updated_at`

Constraint:
- `username` unik.
- `person_type + person_id` unik.

Satu person hanya memiliki satu akun absensi.

### 5.2 Account Provisioning

Akun dibuat administrator. Tidak ada public registration route.

Flow:

```text
Admin
  ↓
Buat akun
  ↓
Username + password awal
  ↓
person_type + person_id
  ↓
Akun aktif
  ↓
Credential diberikan ke peserta
  ↓
Peserta login
```

Akun yang selesai digunakan sebaiknya dinonaktifkan dengan `is_active = false`, bukan menghapus data.

### 5.3 Credential

Login menggunakan username + password.

Nomor telepon bukan credential login utama. Jika diperlukan, nomor telepon dapat menjadi data kontak terpisah.

Password wajib menggunakan bcrypt hash dan tidak boleh disimpan plaintext.

## 6. Mapping Person

Jika `person_type = MAGANG`:
`person_id → interns.id`

Jika `person_type = TENAGA_AHLI`:
`person_id → non_nip_employees.id`

Data Tenaga Ahli harus memiliki `status_kepegawaian = "Tenaga Ahli"`.

Client tidak boleh menjadi sumber kebenaran untuk `person_id`, `person_type`, atau identitas person.

## 7. Session

Session menggunakan JWT.

Payload minimal:
- `userId`
- `username`
- `personId`
- `personType`
- `nama`

Cookie:
- `httpOnly`
- `secure` pada production
- `SameSite=Strict`
- `path=/`

Lifetime: 12 jam.

## 8. Login dan Route Protection

Route login: `/absensi/login`

Form:
- Username
- Password
- Masuk

Credential salah:
> Login gagal. Username atau password salah.

Tujuan: mencegah username enumeration.

Login berhasil → `/absensi`.

Session valid yang membuka `/absensi/login` → redirect `/absensi`.

Akun inactive → login ditolak.

Semua `/absensi/*` dilindungi server/proxy.

Unauthenticated:
`/absensi → /absensi/login`

Authenticated:
`/absensi/login → /absensi`

## 9. Absen Pagi

UI: **Absen Pagi**.

Boleh dilakukan kapan saja. Tidak ada batas minimum.

Server mencatat timestamp saat aksi berhasil diproses menggunakan business timezone Asia/Jakarta.

Satu person hanya boleh memiliki satu attendance record per tanggal:

```text
UNIQUE(person_type, person_id, date)
```

Jika belum ada record:
- Buat attendance.
- `status = HADIR`.
- Isi `check_in`.

Jika sudah ada:
- Jangan membuat record kedua.
- Jangan menimpa status.

Concurrency tidak boleh hanya mengandalkan SELECT lalu INSERT. Database unique constraint menjadi enforcement terakhir.

Prisma `P2002` harus dipetakan menjadi pesan bisnis, bukan 500.

Pesan:
> Kamu sudah absen pagi hari ini

Setelah berhasil, tombol disabled dan state berhasil harus terlihat.

## 10. Absen Pulang

UI: **Absen Pulang**.

Hanya dapat dilakukan mulai **16:00 WIB**.

Sebelum 16:00:
- Tombol disabled.
- Server tetap menolak request yang dimanipulasi.

Syarat:
1. Sudah Absen Pagi.
2. `status = HADIR`.
3. `check_in != null`.
4. `check_out == null`.
5. Waktu server >= 16:00 WIB.

Timestamp dibuat server. Client tidak boleh memasok timestamp yang dipercaya.

Hanya satu Absen Pulang. Setelah berhasil:
- `check_out != null`.
- Tombol tidak dapat digunakan lagi.
- UI mengonfirmasi bahwa user sudah Absen Pulang.

## 11. Izin dan Sakit

User dapat mengajukan:
- `IZIN`
- `SAKIT`

Catatan/keterangan opsional.

Identity berasal dari session.

Jika attendance hari tersebut sudah ada, submission ditolak. Status tidak boleh ditimpa.

ALFA:
- Tetap ada di enum database.
- Tidak muncul di UI.
- Tidak boleh dikirim melalui endpoint pengajuan.
- Request ALFA harus ditolak server.

## 12. Aturan Attendance Harian

Satu person memiliki maksimal satu record per tanggal:

```text
UNIQUE(person_type, person_id, date)
```

Tidak boleh ada kombinasi status berbeda pada tanggal sama, misalnya:
- HADIR + IZIN
- HADIR + SAKIT
- IZIN + SAKIT

Record pertama yang berhasil dibuat menjadi record attendance hari tersebut.

## 13. Reminder Lupa Absen Pulang

Mulai **17:00 WIB**, tampilkan reminder jika:

```text
currentWibHour >= 17
AND status = HADIR
AND check_in IS NOT NULL
AND check_out IS NULL
```

UI:
> 🔔 Anda lupa absen pulang hari ini

Setelah `check_out` terisi, reminder harus hilang.

## 14. Timezone dan Date Handling

Business timezone selalu `Asia/Jakarta`.

Gunakan native `Intl.DateTimeFormat` untuk menentukan tanggal dan jam WIB. Jangan bergantung pada timezone komputer, browser, atau server.

Tanggal PostgreSQL `@db.Date` harus diperlakukan sebagai calendar date agar tidak bergeser karena timezone.

## 15. Development Time Simulation

Gunakan `DEV_TIME_OVERRIDE` hanya untuk development/testing.

Contoh CMD:

```cmd
set DEV_TIME_OVERRIDE=2026-08-27T15:30:00+07:00
npm run dev
```

Production harus menggunakan waktu server aktual.

Test:
- 15:30 → Absen Pulang disabled dan server menolak.
- 16:30 → Absen Pulang aktif dan timestamp sekitar 16:30.
- 17:30 + HADIR + belum pulang → reminder muncul.
- Setelah pulang → reminder hilang.

## 16. Riwayat Absensi

Route: `/absensi/riwayat`

Hanya tampilkan data user login. Identity wajib berasal dari:
- `session.person_id`
- `session.person_type`

Bukan dari URL atau client.

Minimal:
- Tanggal
- Status
- Absen Pagi
- Absen Pulang
- Keterangan

Filter:
- Bulan (`YYYY-MM`)

Gunakan range:
```text
>= first day of month
< first day of next month
```

Pagination: 10 record/halaman.

Urutan: terbaru → terlama.

Pagination dilakukan server/database.

## 17. Database

Database: PostgreSQL existing.

Model absensi utama:
- `attendance_users`
- `attendances`
- `interns`
- `non_nip_employees`

`attendances`:
- `id`
- `person_type`
- `person_id`
- `date`
- `check_in`
- `check_out`
- `status`
- `notes`
- `created_at`
- `updated_at`

Constraint:
```text
UNIQUE(person_type, person_id, date)
```

Index relevan:
```text
(date)
(person_type, person_id)
(status)
```

Model existing lain tidak boleh dirusak atau direcreate tanpa requirement terpisah.

## 18. Security

Server adalah source of truth.

Server wajib memvalidasi:
- Session.
- Identity.
- Account active state.
- Status.
- Waktu Absen Pulang.
- Duplicate attendance.
- Input whitelist.

Jangan percaya:
- hidden `person_id`.
- hidden `person_type`.
- query parameter identity.
- timestamp client.
- disabled button sebagai security.

Password:
- bcrypt.
- plaintext dilarang.
- jangan dicetak ke log.

Error internal/database tidak boleh diekspos mentah. Map error ke pesan aman.

## 19. Concurrency

Dua request simultan untuk attendance yang sama hanya boleh menghasilkan satu record.

Database unique constraint wajib menjadi lapisan integritas terakhir.

Duplicate constraint harus ditangani graceful, bukan 500.

## 20. UI / Anti-Slop

Target:
- ENERGY 2
- RHYTHM 1
- MOTION 1

Karakteristik:
- sederhana
- high contrast
- mobile-first
- clean
- tanpa gradient biru-ungu generik
- tanpa glassmorphism berlebihan
- tanpa animasi berlebihan
- tombol minimal 44×44 px
- focus state jelas
- error tidak hanya dibedakan dengan warna
- layout tidak padat
- informasi mudah dipindai

Gunakan `min-h-dvh`, bukan memaksakan `100vh` pada layout mobile utama.

## 21. Dashboard

Route: `/absensi`

Minimal menampilkan:
1. Identitas pengguna.
2. Tanggal/hari berjalan.
3. Status hari ini.
4. Absen Pagi.
5. Absen Pulang.
6. Reminder bila diperlukan.
7. Link Riwayat.
8. Logout.

State UI berasal dari state server yang sudah divalidasi.

State umum:
```text
Belum Absen
  → Absen Pagi aktif

Sudah Absen Pagi
  → Absen Pagi disabled
  → menunggu 16:00

>= 16:00 + memenuhi syarat
  → Absen Pulang aktif

Sudah Absen Pulang
  → Absen Pulang disabled
  → tampilkan konfirmasi

>= 17:00 + belum pulang
  → tampilkan reminder
```

## 22. Data Integrity

Prinsip: jangan merusak database existing.

Jangan menjalankan destructive command terhadap shared database, termasuk:
- `migrate reset`
- drop database
- `db push` sembarangan

Reconstruction:
1. Pastikan `.env` dan `DATABASE_URL`.
2. `npx prisma db pull`.
3. `npx prisma validate`.
4. `npx prisma generate`.
5. Implementasi application logic.

Migration hanya jika diperlukan dan disetujui.

## 23. Reconstruction Status dan Workflow

GitHub saat reconstruction hanya memiliki commit awal, sehingga source code lama tidak boleh dianggap tersedia di repository.

Database berhasil di-introspect dengan `npx prisma db pull` dan menghasilkan 11 model.

Urutan:
```text
Existing PostgreSQL
  ↓
DATABASE_URL
  ↓
prisma db pull
  ↓
prisma/schema.prisma
  ↓
prisma validate
  ↓
prisma generate
  ↓
Authentication
  ↓
Attendance
  ↓
Testing
  ↓
Cleanup
  ↓
Commit
  ↓
GitHub
```

Schema aktual adalah sumber kebenaran. AGY/Claude wajib membaca `prisma/schema.prisma` sebelum implementasi.

Nama hasil introspection seperti `attendance_users` tidak boleh diasumsikan menjadi `attendanceUser`.

## 24. Test User

Untuk manual testing dapat digunakan:
```text
username: tester
password: password123
person_type: MAGANG
person_id: ID intern testing
is_active: true
```

Test user harus menunjuk ke person valid. Jika tidak ada record `interns`, boleh dibuat synthetic test record khusus testing.

Test data dan credential testing harus dibersihkan bila sudah tidak diperlukan dan tidak boleh digunakan sebagai credential production.

## 25. Acceptance Criteria

### Authentication
- [ ] Username + password berhasil.
- [ ] Tidak ada public registration.
- [ ] Password hash bcrypt.
- [ ] Session identity server-side.
- [ ] Inactive user ditolak.
- [ ] Authenticated user tidak kembali ke login.

### Absen Pagi
- [ ] Dapat kapan saja.
- [ ] Satu kali/hari.
- [ ] Timestamp server.
- [ ] Duplicate ditolak.
- [ ] Concurrency aman.
- [ ] Tombol disabled setelah berhasil.
- [ ] Pesan "Kamu sudah absen pagi hari ini".

### Absen Pulang
- [ ] Sebelum 16:00 ditolak.
- [ ] Mulai 16:00 aktif jika syarat terpenuhi.
- [ ] Harus Absen Pagi.
- [ ] Status HADIR.
- [ ] Satu kali.
- [ ] Timestamp server.
- [ ] UI mengonfirmasi Absen Pulang.

### Reminder
- [ ] Tidak muncul sebelum 17:00.
- [ ] Muncul pada kondisi HADIR + sudah pagi + belum pulang.
- [ ] Hilang setelah pulang.

### Izin/Sakit
- [ ] IZIN tersedia.
- [ ] SAKIT tersedia.
- [ ] Catatan opsional.
- [ ] ALFA tidak tersedia di UI.
- [ ] ALFA ditolak server.
- [ ] Status tidak dapat ditimpa pada hari sama.

### Riwayat
- [ ] Hanya data sendiri.
- [ ] Identity tidak dapat diganti via URL.
- [ ] Filter bulan.
- [ ] Pagination 10.
- [ ] Terbaru → terlama.

### Timezone
- [ ] Asia/Jakarta.
- [ ] Tanggal mengikuti WIB.
- [ ] DEV_TIME_OVERRIDE bekerja untuk testing.
- [ ] Production memakai waktu aktual.

### UI
- [ ] Mobile-first.
- [ ] Touch target minimal 44×44 px.
- [ ] Istilah Absen Pagi/Absen Pulang.
- [ ] Focus state jelas.
- [ ] Error mudah dipahami.
- [ ] Tidak ada UI berlebihan.

## 26. Non-Functional Requirements

### Reliability
Duplicate request tidak menghasilkan error 500 yang tidak perlu.

### Security
Identity attendance selalu berdasarkan authenticated session.

### Maintainability
Timezone logic terpusat. Business rules attendance berada di server-side action/service.

### Performance
History menggunakan pagination dan query terfilter; jangan mengambil seluruh history ke browser.

### Compatibility
Target:
- Desktop browser.
- Mobile browser.
- Windows development environment.

## 27. Current Dependency Baseline

Baseline reconstruction saat ini:
- Next.js 16.3.3
- React 19.2.8
- TypeScript
- Tailwind CSS
- Prisma 5.22.0
- PostgreSQL
- bcryptjs
- jose

Jangan melakukan major dependency upgrade hanya karena tersedia versi lebih baru. Upgrade harus memiliki alasan dan verifikasi compatibility.

## 28. Current Database Schema

Hasil introspection memiliki 11 model:
1. `attendance_users`
2. `attendances`
3. `employees`
4. `intern_batches`
5. `interns`
6. `kenaikan_pangkats`
7. `kgbs`
8. `non_nip_employees`
9. `sections`
10. `sessions`
11. `users`

Enum:
- `AttendanceStatus`
- `EmployeeStatus`
- `PersonnelType`
- `Role`

Model utama aplikasi absensi:
- `attendance_users`
- `attendances`
- `interns`
- `non_nip_employees`

## 29. Reconstruction Rules

1. Database existing adalah sumber kebenaran schema.
2. Baca `prisma/schema.prisma` aktual sebelum coding.
3. Jangan membuat model berdasarkan ingatan source code lama.
4. Jangan rename model introspection tanpa alasan teknis.
5. Jangan melakukan destructive DB command pada shared database.
6. Jangan menyimpan credential test dalam production.
7. Jangan mempercayai client untuk identity, status, atau timestamp.
8. Jangan menjadikan disabled button sebagai security.
9. Jangan memakai timezone komputer sebagai business timezone.
10. Jangan menambahkan login nomor telepon tanpa requirement baru.
11. Jangan mengimplementasikan fitur future enhancement tanpa perubahan PRD.

## 30. Definition of Done

Phase selesai jika:
- Requirement terimplementasi.
- Server validation lengkap.
- Database constraint mendukung business rule.
- Concurrency dipertimbangkan.
- Timezone diuji.
- Authentication diuji.
- Attendance flow diuji.
- Mobile UI diuji.
- `npx tsc --noEmit` pass.
- `npm run build` pass.
- `git diff --check` pass.
- Tidak ada perubahan schema/migration tidak disengaja.
- Test data yang tidak diperlukan dibersihkan.
- Perubahan di-commit.

## 31. Future Enhancements

Fitur berikut tidak boleh diimplementasikan tanpa perubahan PRD:
- Login nomor telepon.
- OTP.
- Password reset mandiri.
- Email/WhatsApp notification.
- Geolocation/GPS.
- Selfie.
- Face recognition.
- Device binding.
- QR attendance.
- Admin attendance dashboard.
- Export Excel/PDF.
- Rekap otomatis.
- Audit log khusus attendance.
- Approval workflow Izin/Sakit.

## 32. Ringkasan Arsitektur

```text
ADMIN
  │
  ├── membuat akun
  │
  ▼
attendance_users
  ├── username
  ├── password_hash
  ├── person_type
  ├── person_id
  └── is_active
  │
  ▼
PESERTA
  │
  └── Login
       ↓
    /absensi
       ├── Absen Pagi
       ├── Absen Pulang
       ├── Izin
       ├── Sakit
       └── Riwayat
```

Prinsip utama:

**Server adalah source of truth.**

Identitas, status, waktu, dan integritas attendance harus divalidasi di server/database.

**Business timezone:** Asia/Jakarta (WIB).  
**Login:** username + password.  
**Registration:** tidak tersedia untuk peserta.  
**Account provisioning:** dilakukan administrator.  
**Attendance:** maksimal satu record per person per tanggal.

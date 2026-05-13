# ARCHITECTURE.md — Refactor ke Laravel + MySQL

Dokumen ini adalah **blueprint arsitektur target** untuk merefaktor aplikasi *Sistem Presensi SD N 01 Jatipurwo* dari stack saat ini (React/Vite + Supabase/Postgres) ke **Laravel 11 + MySQL 8** **tanpa mengubah** tampilan, fitur, keamanan, dan fungsi yang sudah berjalan.

> Dokumen pendamping:
> - `AI_CONTRACT.md` — kontrak/aturan untuk AI (Codex) saat membangun ulang.
> - `PROJECT_MAP.md` — peta 1:1 antara file/komponen lama → file/komponen baru.

---

## 1. Tujuan Refactor

1. Mengganti **Supabase (Postgres + Auth + Storage + Edge Functions)** dengan **Laravel 11** (Auth, Eloquent, Storage, Queue, Policies) di atas **MySQL 8**.
2. Menjaga **paritas 100%** terhadap aplikasi lama:
   - UI/UX identik (warna, layout, font Inter, bottom nav mobile dengan FAB di tengah, dialog wajah lebar di desktop, dsb).
   - Fitur identik (lihat §9 `arsitektur.md` lama — semuanya wajib ada).
   - Logika bisnis identik (5 status presensi, cutoff 06:30, FIFO 10 wajah, cooldown 5 detik, upsert per (student, date), dsb).
   - Tingkat keamanan setara RLS lewat **Policy + Gate Laravel** + middleware role.
3. Backend self-hosted, dapat berjalan tanpa layanan eksternal (selain SMTP opsional & object storage opsional).

---

## 2. Stack Target

| Lapisan | Teknologi |
|---|---|
| Bahasa BE | PHP 8.3 |
| Framework BE | Laravel 11 |
| DB | MySQL 8.0 (utf8mb4_unicode_ci) |
| Auth | Laravel Sanctum (SPA cookie-based, same-site) |
| Otorisasi | Spatie laravel-permission **atau** custom `user_roles` + Gate (lihat §6) |
| Storage | Filesystem `local` (private) + signed temporary URL Laravel |
| Queue | database driver (default), Redis opsional |
| Frontend | **TETAP** React 18 + Vite 5 + TS 5 + Tailwind 3 + shadcn/ui + TanStack Query + face-api.js |
| Build FE | `npm run build` → `public/build` (Vite manifest) atau di-serve via Laravel + `@vite` blade |
| HTTP | Axios (FE) ↔ REST JSON `/api/*` (BE), CSRF via Sanctum |
| PWA | `vite-plugin-pwa` (sama persis) |
| Excel/PDF | FE: `exceljs` + `jspdf` (tetap). BE opsional: `maatwebsite/excel` untuk backup. |
| Backup | Admin dapat unduh full dump `JSON` dan `SQL` |
| Face Recognition | **TETAP** client-side `face-api.js` (model dari CDN) |
| Realtime live refresh | TanStack Query polling 10 dtk (sama). Opsional Laravel Reverb bila perlu push. |
| Hosting | Single VPS (Nginx + PHP-FPM + MySQL) atau Laravel Forge/Vercel-FE + API server |

> **Wajib**: Jangan ganti library FE manapun yang sudah dipakai. Semua refactor terjadi di **BE + lapisan akses data**, bukan presentasi.

---

## 3. Diagram Arsitektur Target

```text
                       ┌─────────────────────────────┐
                       │        Pengguna             │
                       │  (Admin / Siswa / Ortu)     │
                       └──────────────┬──────────────┘
                                      │ HTTPS
                                      ▼
              ┌────────────────────────────────────────────┐
              │   PWA Frontend (React + Vite + Tailwind)   │
              │   (TIDAK BERUBAH dari versi lama)          │
              │   • React Router + ProtectedRoute          │
              │   • TanStack Query                         │
              │   • face-api.js (CDN, client-side)         │
              │   • Web Audio API, exceljs, jsPDF          │
              │   • Axios → /api/* (Sanctum cookie)        │
              └─────────┬─────────────────────┬────────────┘
                        │ XHR JSON            │ XHR (signed URL)
                        ▼                     ▼
        ┌─────────────────────────┐   ┌──────────────────────┐
        │   Laravel 11 API        │   │   Laravel Storage    │
        │   • Sanctum SPA Auth    │   │   • disk: local      │
        │   • Policies + Gates    │   │   • TemporaryURL     │
        │   • FormRequest valid.  │   │   • student-photos/  │
        │   • Controllers + Svc   │   └──────────────────────┘
        │   • Eloquent ORM        │
        │   • Jobs/Schedule       │
        └────────────┬────────────┘
                     │ PDO
                     ▼
              ┌──────────────────┐
              │   MySQL 8        │
              │   • InnoDB       │
              │   • FK + index   │
              │   • Triggers     │
              └──────────────────┘
```

---

## 4. Struktur Direktori Laravel

```
app/
  Http/
    Controllers/Api/
      AuthController.php
      DashboardController.php
      StudentController.php
      AttendanceController.php
      FaceDescriptorController.php
      LeaveRequestController.php
      HolidayController.php
      AppSettingController.php
      UserAccountController.php   # admin only (replaces edge functions)
      BackupController.php
      ReportController.php
      ParentChildrenController.php
    Requests/                     # FormRequest validation (zod-equivalent)
    Middleware/
      EnsureRole.php              # role:admin|student|parent
      ForceJsonResponse.php
  Models/
    User.php
    Role.php
    UserRole.php
    Student.php
    ClassRoom.php
    FaceDescriptor.php
    AttendanceRecord.php
    LeaveRequest.php
    Holiday.php
    AppSetting.php
    StudentUserLink.php
    ParentStudentLink.php
  Policies/
    StudentPolicy.php
    AttendancePolicy.php
    FaceDescriptorPolicy.php
    LeaveRequestPolicy.php
    HolidayPolicy.php
    AppSettingPolicy.php
  Services/
    AttendanceService.php         # status calc, 06:30 cutoff, upsert
    FaceDescriptorService.php     # FIFO max 10
    LeaveApprovalService.php      # auto-write attendance on approve
    BackupService.php             # full DB dump → JSON/SQL
    BrandingService.php           # app_settings cache
  Jobs/
    AutoArrivalJob.php            # daily 06:30 auto-mark
database/
  migrations/                     # mirror Supabase schema (lihat §5)
  seeders/
    RoleSeeder.php
    AdminUserSeeder.php           # sdn01jatipurwo@gmail.com
    ClassSeeder.php               # Kelas 1..6
    AppSettingSeeder.php
routes/
  api.php
  web.php                         # serve SPA fallback
resources/
  js/                             # ← Salin src/ React lama ke sini
  views/app.blade.php             # @vite('resources/js/main.tsx')
public/
  build/                          # Vite output
config/
  sanctum.php, filesystems.php, app.php
```

---

## 5. Skema Database MySQL (Paritas 1:1 dengan Supabase)

Semua tabel pakai `id BIGINT UNSIGNED AUTO_INCREMENT` **kecuali** tabel domain memakai **UUID `CHAR(36)` PRIMARY KEY** agar identik dengan ID Supabase saat migrasi data. Default UUID via `DEFAULT (UUID())` (MySQL 8.0+).

### 5.1 Tabel & Kolom

| Tabel | Kolom (tipe) | Catatan |
|---|---|---|
| `users` | id CHAR(36) PK, email VARCHAR(255) UNIQUE, password VARCHAR(255), email_verified_at TIMESTAMP NULL, remember_token, created_at, updated_at | Laravel default + UUID |
| `roles` | id TINYINT PK, name ENUM('admin','student','parent') UNIQUE | enum role |
| `user_roles` | id CHAR(36) PK, user_id FK→users, role ENUM('admin','student','parent'), created_at, UNIQUE(user_id, role) | **WAJIB tabel terpisah** untuk cegah privilege escalation |
| `classes` | id CHAR(36) PK, name VARCHAR(50) UNIQUE, created_at | Kelas 1..6 |
| `students` | id CHAR(36) PK, nis VARCHAR(50) UNIQUE NOT NULL, name VARCHAR(255), class_id FK→classes NULL, photo_url TEXT NULL, has_embedding BOOLEAN DEFAULT 0, created_at, updated_at | |
| `face_descriptors` | id CHAR(36) PK, student_id FK→students ON DELETE CASCADE, descriptor JSON NOT NULL, created_at, INDEX(student_id, created_at) | descriptor 128-dim |
| `attendance_records` | id CHAR(36) PK, student_id FK→students ON DELETE CASCADE, date DATE NOT NULL, time TIME NOT NULL, status ENUM('Hadir','Terlambat','Izin','Sakit','Tidak Hadir') NOT NULL, created_at, UNIQUE(student_id, date) | 5 status PASTI |
| `leave_requests` | id CHAR(36) PK, student_id FK→students, request_date DATE NOT NULL, leave_type ENUM('Izin','Sakit'), reason TEXT, status ENUM('pending','approved','rejected') DEFAULT 'pending', admin_note TEXT NULL, created_at, updated_at | |
| `holidays` | id CHAR(36) PK, name VARCHAR(255), description TEXT NULL, date DATE NOT NULL, is_recurring BOOLEAN DEFAULT 0, created_at | |
| `app_settings` | id CHAR(36) PK, `key` VARCHAR(100) UNIQUE, value JSON NOT NULL, updated_at | branding, schedule, dst |
| `student_user_links` | id CHAR(36) PK, user_id FK→users, student_id FK→students, created_at, UNIQUE(user_id), UNIQUE(student_id) | 1:1 siswa↔akun |
| `parent_student_links` | id CHAR(36) PK, parent_user_id FK→users, student_id FK→students, created_at, UNIQUE(parent_user_id, student_id) | 1:N ortu→anak |
| `personal_access_tokens` | (Sanctum default) | |

### 5.2 Trigger / Logika DB

- **Trigger `face_descriptors_after_insert` & `_after_delete`**: sinkronkan `students.has_embedding` (= EXISTS subquery). Setara `sync_student_has_embedding()` lama.
- **Trigger `face_descriptors_before_insert`**: enforce **FIFO max 10**/siswa — hapus record terlama jika sudah 10. (Alternatif: lakukan di `FaceDescriptorService` dalam transaksi).
- **Tidak boleh** pakai CHECK constraint untuk validasi waktu (sama seperti aturan lama). Pakai validasi di FormRequest/service.

### 5.3 Indeks

- `attendance_records (date)`, `(student_id, date)` UNIQUE.
- `face_descriptors (student_id, created_at)`.
- `holidays (date)`.
- `leave_requests (status, request_date)`.

---

## 6. Otorisasi (Setara RLS)

RLS Postgres digantikan oleh **lapisan aplikasi** di Laravel:

1. **Middleware `auth:sanctum`** untuk semua `/api/*` kecuali login/branding publik.
2. **Middleware `role:admin|student|parent`** — baca dari `user_roles`.
3. **Policy per Model** — meniru tiap RLS policy lama (lihat tabel mapping di `PROJECT_MAP.md`):
   - `StudentPolicy::view` → admin OR linked student OR linked parent.
   - `AttendancePolicy::view` → idem.
   - `AttendancePolicy::create` → admin OR linked student (untuk self-attendance).
   - `AttendancePolicy::update|delete` → admin only.
   - `FaceDescriptorPolicy::create|delete` → admin OR linked student.
   - `LeaveRequestPolicy::create` → admin OR linked student.
   - `LeaveRequestPolicy::update|delete` → admin only.
   - `HolidayPolicy::*write` → admin only; `view` publik.
   - `AppSettingPolicy::write` → admin only; `view` publik.
4. **Helper `Gate::has_role($user, 'admin')`** identik dengan fungsi `has_role()` SECURITY DEFINER lama.
5. **Endpoint admin sensitif** (create/manage akun, backup) tambahan: `EnsureRole:admin` + `abort_unless` di controller.
6. **Pesan error generic** ke FE (jangan bocorkan detail internal) — sama aturan lama.

> **Privilege escalation** dicegah: kolom role TIDAK ADA di `users`/profile. Hanya di `user_roles`. Tidak ada endpoint yang mengizinkan user mengubah role-nya sendiri.

---

## 7. Auth Flow

- **Sanctum SPA**: FE & BE same-domain (atau subdomain dengan `SESSION_DOMAIN=.example.com`).
- Endpoint:
  - `GET  /sanctum/csrf-cookie`
  - `POST /api/auth/login`  → set cookie session
  - `POST /api/auth/logout`
  - `GET  /api/auth/me`     → user + roles + linked student/parents
  - `POST /api/auth/password` → ganti password sendiri
- Admin-only:
  - `POST /api/admin/users` (buat akun siswa/ortu — ganti `create-user-account`)
  - `PATCH /api/admin/users/{id}` (reset pwd, ubah link — ganti `manage-user-account`)
  - `DELETE /api/admin/users/{id}`
- Validasi duplikasi (1 siswa = 1 akun) di service, dengan **transaction** + unique constraint.
- **Tidak ada anonymous sign-up**. **Tidak ada auto-confirm email** kecuali user minta eksplisit.

---

## 8. Storage Aman

- Disk `local` (private), root `storage/app/private/student-photos/`.
- Endpoint `GET /api/storage/student-photos/{path}` mengembalikan URL signed sementara via `URL::temporarySignedRoute()` (TTL 5 menit) — diganti komponen `SignedImage` di FE (tetap dipakai apa adanya, hanya fungsi `useSignedUrl` ganti panggilan ke endpoint baru).
- Validasi MIME (image/jpeg|png|webp), max 5 MB.
- Path scheme: `students/{student_id}/{uuid}.jpg`.

- Legacy app juga memakai aset branding terpisah untuk `schoolLogo` dan `favicon`.
  Aset ini saat ini bersifat public-read dan dipakai oleh halaman login, tab browser,
  `apple-touch-icon`, dan ikon manifest. Pada Laravel boleh disajikan dari folder public
  atau endpoint public, tetapi perilaku akhirnya harus tetap sama.

---

## 9. Pemetaan Edge Functions → Laravel

| Edge Function lama | Pengganti Laravel |
|---|---|
| `create-user-account` | `POST /api/admin/users` → `UserAccountController@store` + `UserAccountService` |
| `manage-user-account` | `PATCH/DELETE /api/admin/users/{id}` → `UserAccountController@update/destroy` |
| `database-backup` | `GET /api/admin/backup?format=json|sql` → `BackupController@dump` (stream file, admin only) |

Semua dijalankan dalam **DB transaction**, validasi `FormRequest`, policy `admin`.

Catatan kompatibilitas legacy:
- `database-backup` pada aplikasi lama mendukung `format=json` dan `format=sql`.
- Refactor Laravel tidak boleh menurunkan cakupan ekspor ini hanya ke JSON saja.

---

## 10. Logika Bisnis Kritis (Wajib Identik)

1. **Status presensi**: 5 nilai pasti — `Hadir, Terlambat, Izin, Sakit, Tidak Hadir`. Enum DB + `enum` PHP.
2. **Cutoff jam masuk**: default `06:30` (override via `app_settings.attendance_cutoff`). Service `AttendanceService::computeStatus(time)` mengembalikan `Hadir` / `Terlambat`.
3. **Upsert** attendance per `(student_id, date)`.
4. **Approval izin** → `LeaveApprovalService` menulis `attendance_records` (Izin/Sakit) untuk tanggal pengajuan dalam transaksi yang sama.
5. **FIFO 10 face_descriptors** per siswa (trigger + service guard).
6. **Cooldown 5 dtk** di FE (tidak berubah).
7. **Auto-arrival** jam 06:30: `AutoArrivalJob` dijadwalkan via `app/Console/Kernel.php` (`->dailyAt('06:30')`) — menulis `Tidak Hadir` untuk siswa yang belum punya record (kecuali libur).
8. **Hari libur** (one-off & recurring) menonaktifkan presensi & memunculkan banner global.
9. **Jadwal sekolah** 5/6 hari (Sabtu opsional libur) — disimpan di `app_settings.schedule`.
10. **PWA manifest dinamis** — endpoint `GET /manifest.webmanifest` di Laravel meng-render JSON dari `app_settings` (warna, nama, logo). Ikon maskable tetap di-generate runtime di FE (`lib/maskableIcon.ts`).
11. **Notifikasi**: toast 10 detik + tombol close (X) — komponen FE tidak berubah.
12. **Audio synth** Web Audio API — tidak berubah.

13. **Kompatibilitas nilai status legacy**: FE lama saat ini membaca/menulis payload `hadir`, `terlambat`, `izin`, `sakit`, `tidak-hadir`. Jika enum internal Laravel memakai bentuk lain, adapter API wajib melakukan mapping tanpa mengubah kontrak FE.

---

## 11. Performa

- Eloquent eager-loading (`with()`) untuk dashboard live (refetch 10 dtk).
- Query batas default **1000 baris** — pakai paginate (`->paginate(50)`) untuk daftar besar (samakan dengan aturan lama).
- Index seperti §5.3.
- HTTP cache: `Cache-Control: no-store` untuk endpoint data; manifest publik di-cache 5 menit.
- Model face-api.js tetap dimuat dari CDN (~6 MB, cached browser).

---

## 12. Hosting & Deployment

- **Nginx + PHP-FPM + MySQL** di 1 VPS.
- `npm run build` menghasilkan `public/build`. Laravel route fallback (`Route::fallback`) mengembalikan `app.blade.php` agar SPA routing jalan.
- `.env`: `APP_URL`, `DB_*`, `SESSION_DRIVER=cookie`, `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, `FILESYSTEM_DISK=local`.
- Cron: `* * * * * php artisan schedule:run`.
- Backup harian: `php artisan backup:dump` ke `storage/app/backups/`.

---

## 13. Testing & QA

- **Pest/PHPUnit** untuk:
  - Policy tests (admin/student/parent untuk tiap model).
  - Service tests (`AttendanceService::computeStatus`, FIFO descriptors, LeaveApproval).
  - Feature tests endpoint kritis (login, attendance upsert, leave approve, backup admin-only).
- **Vitest** FE (jika ada test lama dipertahankan).
- Smoke test paritas UI: bandingkan screenshot per halaman antara lama vs baru — **harus identik**.

---

## 14. Migrasi Data dari Supabase ke MySQL

1. Export tabel via `pg_dump --data-only --column-inserts` atau via edge function `database-backup` (JSON).
2. Script `php artisan migrate-from-supabase` (custom command) yang membaca JSON dan insert ke MySQL **mempertahankan UUID** semua row (agar relasi tetap).
3. Hash password user: bawa hash Supabase tidak kompatibel. Solusi:
   - Force password reset untuk semua user lama (kirim email atau reset manual oleh admin), ATAU
   - Implement compat layer (tidak direkomendasikan).
4. Salin file storage `student-photos/*` 1:1.

---

## 15. Aturan Anti-Drift (sama dengan project lama)

- **Jangan** ubah palet warna, font (Inter), spacing, layout, atau komponen UI.
- **Jangan** ganti library FE (exceljs, jsPDF, face-api.js, sonner, recharts, dst).
- Toast wajib 10 dtk + tombol X.
- Bahasa UI **Indonesia**; istilah produk berbahasa Inggris (Lovable Cloud → cukup ganti label menjadi "Backend" / nama internal proyek).
- Setiap fitur baru menyentuh data → **Policy + FormRequest + Auth** wajib.
- Tidak boleh menyimpan role di `users` atau `profiles` — hanya `user_roles`.
- Tidak boleh percaya input client; semua validasi server-side.

---

## 15A. Key `app_settings` Legacy yang Wajib Kompatibel

Refactor harus tetap menyediakan key berikut karena dipakai langsung oleh FE lama:

- `attendance`
- `camera`
- `notifications`
- `school`
- `appearance`
- `site`

Default payload legacy yang perlu tetap kompatibel:

- `attendance`: `attendanceStart=06:00`, `lateThreshold=07:05`, `attendanceEnd=12:00`, `timezone=Asia/Jakarta`, `cooldownSeconds=5`, `enableSelfAttendance=false`, `schoolDays=5`
- `camera`: `cameraResolution=720p`, `autoCapture=true`, `captureDelay=1`
- `notifications`: `enableSound=true`, `enableNotifications=true`, `notifyLateStudents=true`
- `appearance`: `theme=light`
- `school`: `schoolName`, `schoolAddress`, `adminName`, `schoolLogo`
- `site`: `siteTitle`, `siteDescription`, `favicon`, `appTitle`, `appSubtitle`, `welcomeMessage`

Manifest PWA legacy dibentuk dari kombinasi setting `site` + `school`.

---

## 16. Checklist Paritas Fitur (ringkas)

Semua item di §9 `arsitektur.md` lama (12 modul: Auth, Portal Admin, Portal Siswa, Portal Ortu, Modul Wajah, Sistem Presensi, Notifikasi, PWA, Tema, Keamanan, Integrasi/Ekspor, Lain-lain) **harus** ada di project baru. Lihat `PROJECT_MAP.md` untuk pemetaan file per file.

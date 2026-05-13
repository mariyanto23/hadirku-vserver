# PROJECT_MAP.md — Peta 1:1 Project Lama → Project Baru

Dokumen ini memetakan **setiap file/komponen/tabel/endpoint** dari project lama (React + Supabase) ke lokasi & padanannya di project baru (Laravel 11 + MySQL 8 + React FE yang sama). Tujuan: AI/developer dapat membangun ulang **tanpa missing item**.

> Pendamping: `ARCHITECTURE.md`, `AI_CONTRACT.md`.

---

## 1. Folder Top-Level

| Lama | Baru | Catatan |
|---|---|---|
| `src/` | `resources/js/` | Salin apa adanya, hanya layer akses data yang diganti. |
| `public/` | `public/` | Sama. |
| `index.html` | `resources/views/app.blade.php` | Pakai `@vite('resources/js/main.tsx')`. |
| `vite.config.ts` | `vite.config.ts` (root) | Sesuaikan input ke `resources/js/main.tsx`, output `public/build`. |
| `supabase/migrations/` | `database/migrations/` | Konversi SQL Postgres → MySQL (lihat §5). |
| `supabase/functions/` | `app/Http/Controllers/Api/` (Admin) | Lihat §6. |
| `supabase/config.toml` | `config/sanctum.php`, `.env`, `config/auth.php` | Tidak ada padanan satu-satu. |
| `vercel.json` | Nginx config + `Route::fallback` | SPA routing fallback. |
| `.env` (auto Supabase) | `.env` Laravel + `.env` Vite (`VITE_API_BASE_URL`) | |

---

## 2. Halaman (FE) — `src/pages/*` → `resources/js/pages/*`

Semua file dipindah apa adanya. Yang berubah hanya import data layer.

| File lama | File baru | Padanan endpoint baru |
|---|---|---|
| `pages/Dashboard.tsx` (Admin) | `pages/Dashboard.tsx` | `GET /api/dashboard/stats`, `GET /api/attendance?date=today` |
| `pages/Index.tsx` (Admin Attendance) | `pages/Index.tsx` | `GET /api/attendance`, `POST /api/attendance` |
| `pages/Students.tsx` | `pages/Students.tsx` | `/api/students` CRUD, `/api/students/{id}/faces` |
| `pages/Reports.tsx` | `pages/Reports.tsx` | `GET /api/reports/attendance` |
| `pages/Settings.tsx` | `pages/Settings.tsx` | `GET/PUT /api/settings` |
| `pages/Login.tsx` | `pages/Login.tsx` | `POST /api/auth/login`, `GET /manifest.webmanifest` |
| `pages/Install.tsx` | `pages/Install.tsx` | — |
| `pages/NotFound.tsx` | `pages/NotFound.tsx` | — |
| `pages/StudentDashboard.tsx` | `pages/StudentDashboard.tsx` | `GET /api/auth/me`, attendance siswa |
| `pages/StudentAttendance.tsx` | `pages/StudentAttendance.tsx` | `POST /api/attendance` (self) |
| `pages/StudentHistory.tsx` | `pages/StudentHistory.tsx` | `GET /api/attendance?student_id=me` |
| `pages/StudentProfile.tsx` | `pages/StudentProfile.tsx` | `POST /api/auth/password` |
| `pages/student/StudentHome.tsx` | idem | dashboard siswa |
| `pages/student/StudentAttendancePage.tsx` | idem | self-attendance + leave request |
| `pages/student/StudentProfilePage.tsx` | idem | profil siswa |
| `pages/ParentDashboard.tsx` | idem | layout ortu |
| `pages/parent/ParentHome.tsx` | idem | tren 14 hari (`/api/reports/parent-trend`) |
| `pages/parent/ParentChildren.tsx` | idem | `GET /api/parent/children` |
| `pages/parent/ParentReports.tsx` | idem | `GET /api/reports/attendance?student_id=...` |
| `pages/parent/ParentProfile.tsx` | idem | profil ortu |

---

## 3. Komponen — `src/components/*` → `resources/js/components/*`

Semua dipertahankan **sama persis**. Daftar lengkap:

| Komponen | Catatan refactor |
|---|---|
| `AccountManagement.tsx` | Ganti panggilan ke endpoint admin users. |
| `ActionButtons.tsx` | — |
| `AttendanceStats.tsx` | Konsumsi `GET /api/dashboard/stats`. |
| `AttendanceTrendChart.tsx` | Konsumsi `GET /api/reports/trend`. |
| `BackupExport.tsx` | `GET /api/admin/backup?format=json|sql` (download full dump). |
| `BottomNav.tsx` | Tetap. FAB di tengah. |
| `CameraView.tsx` | Tetap. |
| `FaceCamera.tsx` | Tetap; pakai `face-api.js` CDN. |
| `FaceRegistrationDialog.tsx` | Tetap (lebar di desktop, tanpa scroll). |
| `Header.tsx` | Tetap (sticky). |
| `HolidayBanner.tsx` | Konsumsi `GET /api/holidays?upcoming=true`. |
| `HolidaySettings.tsx` | `/api/holidays` admin write. |
| `Layout.tsx` | Tetap. |
| `LeaveRequestsAdmin.tsx` | `/api/leave-requests`, action approve/reject. |
| `NavLink.tsx` | Tetap. |
| `ProtectedRoute.tsx` | Tetap; `useAuth`/`useRole` ganti panggilan ke `/api/auth/me`. |
| `RecentAttendance.tsx` | Tetap. |
| `RoleLayout.tsx` | Tetap. |
| `Sidebar.tsx` | Tetap. |
| `SignedImage.tsx` | `useSignedUrl` ganti panggil `GET /api/storage/sign`. |
| `StudentImportDialog.tsx` | `POST /api/students/import` (CSV). |
| `StudentInfoCard.tsx` | Tetap. |
| `ThemeToggle.tsx` | Tetap. |
| `UserAccountsList.tsx` | `/api/admin/users` list/manage. |
| `ui/*` (shadcn) | **Tetap semua**, jangan diubah. |

---

## 4. Hooks — `src/hooks/*` → `resources/js/hooks/*`

| Hook lama | Implementasi baru |
|---|---|
| `useAuth.ts` | Polling `/api/auth/me`, login/logout via Sanctum cookie. |
| `useRole.ts` | Baca `roles[]` dari `/api/auth/me`. |
| `useStudents.ts` | TanStack Query → `StudentsApi`. |
| `useAttendance.ts` | TanStack Query → `AttendanceApi`, polling 10 dtk. |
| `useHolidays.ts` | `HolidaysApi`. |
| `useSettings.ts` | `SettingsApi` (GET publik, PUT admin). |
| `usePWASettings.ts` | Fetch `/manifest.webmanifest` + apply ke document. |
| `useFaceDetection.ts` | Tetap (face-api.js client-side). |
| `useTheme.ts` | Tetap (next-themes). |
| `use-mobile.tsx`, `use-toast.ts` | Tetap. |

---

## 5. Tabel & Migrations

| Migration lama (Supabase SQL) | Migration baru (Laravel) | Catatan |
|---|---|---|
| `*_classes` | `2026_01_01_000001_create_classes_table.php` | UUID PK, name unik. |
| `*_students` | `..._create_students_table.php` | Termasuk `has_embedding`, `photo_url`. |
| `*_face_descriptors` | `..._create_face_descriptors_table.php` | + 2 trigger sync `has_embedding` + 1 trigger FIFO 10. |
| `*_attendance_records` | `..._create_attendance_records_table.php` | ENUM 5 status, `UNIQUE(student_id, date)`. |
| `*_leave_requests` | `..._create_leave_requests_table.php` | ENUM tipe & status. |
| `*_holidays` | `..._create_holidays_table.php` | `is_recurring`. |
| `*_app_settings` | `..._create_app_settings_table.php` | `key` unik, `value JSON`. |
| `*_user_roles` | `..._create_user_roles_table.php` | ENUM role; UNIQUE(user_id, role). |
| `*_student_user_links` | `..._create_student_user_links_table.php` | UNIQUE(user_id) & UNIQUE(student_id). |
| `*_parent_student_links` | `..._create_parent_student_links_table.php` | UNIQUE(parent_user_id, student_id). |
| RLS policies (semua tabel) | **Laravel Policies** di `app/Policies/*` | Lihat §7. |
| Function `has_role()` | `Gate::define('admin', fn($u) => $u->hasRole('admin'))` | helper `User::hasRole()`. |
| Trigger `sync_student_has_embedding` | Trigger MySQL di migration `face_descriptors`. | |

---

## 6. Edge Functions → Controller

| Edge function lama | Endpoint baru | Controller / Service |
|---|---|---|
| `create-user-account` | `POST /api/admin/users` | `UserAccountController@store` + `UserAccountService::create` (transaksi, cek duplikasi, assign role, buat link siswa/ortu). |
| `manage-user-account` | `PATCH /api/admin/users/{id}` (reset pwd, edit link), `DELETE /api/admin/users/{id}` | `UserAccountController@update/destroy` + `UserAccountService`. |
| `database-backup` | `GET /api/admin/backup?format=json|sql` | `BackupController@dump` → stream full dump JSON/SQL. |

Semua endpoint admin: middleware `auth:sanctum` + `role:admin`, validasi `FormRequest`, `try/catch` dengan response error generik.

---

## 7. Pemetaan RLS → Policy Laravel

| RLS lama | Policy method | Aturan |
|---|---|---|
| `Settings viewable by everyone` | `AppSettingPolicy::view` | true (publik via controller). |
| `Admins can insert/update settings` | `AppSettingPolicy::create/update` | `$user->hasRole('admin')`. |
| `Attendance viewable by authorized users` | `AttendancePolicy::view($user, $record)` | admin OR linked student OR linked parent. |
| `Admin or linked student can insert attendance` | `AttendancePolicy::create($user, $record)` | admin OR linked student. |
| `Admins can update/delete attendance` | `AttendancePolicy::update/delete` | admin only. |
| `Classes viewable by authenticated users` | `ClassPolicy::viewAny` | `auth()`. |
| `Face descriptors viewable by authenticated users` | `FaceDescriptorPolicy::view` | `auth()`. |
| `Admin or linked student can insert/delete face descriptors` | `FaceDescriptorPolicy::create/delete` | admin OR linked student. |
| `Holidays viewable by everyone` | `HolidayPolicy::view` | true. |
| `Admins write holidays` | `HolidayPolicy::create/update/delete` | admin. |
| `Leave requests viewable by authorized users` | `LeaveRequestPolicy::view` | admin OR linked student OR linked parent. |
| `Admin or linked student can insert leave_requests` | `LeaveRequestPolicy::create` | admin OR linked student. |
| `Admins update/delete leave_requests` | `LeaveRequestPolicy::update/delete` | admin. |
| `Students viewable by authorized users` | `StudentPolicy::view` | admin OR linked student OR linked parent. |
| `Admins insert/update/delete students` | `StudentPolicy::create/update/delete` | admin. |
| `Admins manage parent_student_links` | `ParentLinkPolicy::*` | admin. |
| `Parents view own links` | `ParentLinkPolicy::view($user, $link)` | `$user->id === $link->parent_user_id`. |
| `Admins manage student_user_links` | `StudentLinkPolicy::*` | admin. |
| `Users view own student link` | `StudentLinkPolicy::view($user, $link)` | `$user->id === $link->user_id`. |
| `Admins manage all roles` | `UserRolePolicy::*` | admin only. |
| `Users view own roles` | `UserRolePolicy::view($user, $row)` | `$user->id === $row->user_id`. |

---

## 8. Library `src/lib/*` → `resources/js/lib/*`

| File | Catatan |
|---|---|
| `audio.ts` | Tetap. Web Audio API. |
| `constants.ts` | Tetap. SCHOOL_INFO, CLASSES (Kelas 1–6). |
| `database.ts` | **Diganti** menjadi `resources/js/integrations/api/*` (StudentsApi, AttendanceApi, dst). |
| `imageUtils.ts` | Tetap. |
| `maskableIcon.ts` | Tetap (padding 15%). |
| `utils.ts` | Tetap. |

---

## 9. Integrasi Supabase → Integrasi API

| Lama | Baru |
|---|---|
| `src/integrations/supabase/client.ts` | `resources/js/integrations/api/client.ts` (Axios instance). |
| `src/integrations/supabase/types.ts` | `resources/js/integrations/api/types.ts` (TS types manual atau di-generate dari OpenAPI). |

---

## 10. Service FE Wajib (baru)

```
resources/js/integrations/api/
  client.ts
  types.ts
  auth.ts
  dashboard.ts
  students.ts
  attendance.ts
  faces.ts
  leaveRequests.ts
  holidays.ts
  settings.ts
  reports.ts
  storage.ts
  adminUsers.ts
  backup.ts
```

Setiap modul mengekspor satu objek `*Api` dengan method `list / get / create / update / delete / ...`.

---

## 11. Service BE & Job

| File | Tujuan |
|---|---|
| `app/Services/AttendanceService.php` | `computeStatus(time, cutoff)`, `upsert(student, date, status, time)`. |
| `app/Services/FaceDescriptorService.php` | `add(student, descriptor)` dengan FIFO 10 + sync flag. |
| `app/Services/LeaveApprovalService.php` | `approve(request)` → tulis attendance dalam transaksi. |
| `app/Services/UserAccountService.php` | create/update/delete akun siswa/ortu. |
| `app/Services/BackupService.php` | dump semua tabel ke JSON/SQL stream. |
| `app/Services/BrandingService.php` | cache `app_settings`. |
| `app/Jobs/AutoArrivalJob.php` | dijadwalkan `dailyAt('06:30')`, skip libur & non-school day. |
| `app/Console/Commands/MigrateFromSupabase.php` | import data lama (JSON) ke MySQL mempertahankan UUID. |

---

## 12. Routing — `routes/api.php` (urutan rekomendasi)

```php
Route::middleware('guest')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::post('auth/password', [AuthController::class, 'changePassword']);

    Route::apiResource('students', StudentController::class);
    Route::post('students/import', [StudentController::class, 'import']);
    Route::get('students/{student}/faces', [FaceDescriptorController::class, 'index']);
    Route::post('students/{student}/faces', [FaceDescriptorController::class, 'store']);
    Route::delete('faces/{face}', [FaceDescriptorController::class, 'destroy']);

    Route::apiResource('attendance', AttendanceController::class)->only(['index','store','update','destroy']);
    Route::apiResource('leave-requests', LeaveRequestController::class);
    Route::post('leave-requests/{leaveRequest}/approve', [LeaveRequestController::class, 'approve']);
    Route::post('leave-requests/{leaveRequest}/reject', [LeaveRequestController::class, 'reject']);

    Route::get('holidays', [HolidayController::class, 'index']);
    Route::get('settings', [AppSettingController::class, 'index']);
    Route::get('dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('reports/attendance', [ReportController::class, 'attendance']);
    Route::get('reports/trend', [ReportController::class, 'trend']);
    Route::get('reports/parent-trend', [ReportController::class, 'parentTrend']);
    Route::get('parent/children', [ParentChildrenController::class, 'index']);
    Route::get('storage/sign', [StorageController::class, 'sign']);

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::apiResource('users', UserAccountController::class);
        Route::get('backup', [BackupController::class, 'dump']);
        Route::put('settings', [AppSettingController::class, 'update']);
        Route::apiResource('holidays', HolidayController::class)->except(['index']);
    });
});
```

---

## 13. Konfigurasi Auth & PWA

| Komponen | Lokasi baru |
|---|---|
| Sanctum stateful domain | `.env` `SANCTUM_STATEFUL_DOMAINS` |
| Manifest dinamis | `routes/web.php` → `Route::get('/manifest.webmanifest', ...)` render JSON dari `app_settings` |
| Service worker | tetap di-handle `vite-plugin-pwa` |
| Ikon maskable | runtime `lib/maskableIcon.ts` (FE) |

---

## 14. Seeder Wajib

| Seeder | Isi |
|---|---|
| `RoleSeeder` | (jika pakai tabel roles); pastikan enum `admin`, `student`, `parent` tersedia. |
| `AdminUserSeeder` | user `sdn01jatipurwo@gmail.com` + role `admin`. |
| `ClassSeeder` | Kelas 1, 2, 3, 4, 5, 6. |
| `AppSettingSeeder` | branding default, `attendance_cutoff="06:30"`, `school_days=5`. |

---

## 15. Test Wajib (Pest/PHPUnit)

| Test | Coverage |
|---|---|
| `AuthTest` | login, logout, me, changePassword. |
| `StudentPolicyTest` | admin/student/parent visibility. |
| `AttendanceServiceTest` | `computeStatus` di `06:29`/`06:30`/`06:31`, upsert idempotent. |
| `FaceDescriptorServiceTest` | FIFO 10, sync `has_embedding`. |
| `LeaveApprovalServiceTest` | approve menulis attendance dalam 1 transaksi. |
| `BackupAdminOnlyTest` | non-admin → 403. |
| `ManifestTest` | JSON manifest dirender dari settings. |

---

## 16. Checklist Migrasi Per Halaman

Untuk tiap halaman lama, lakukan urutan ini:

1. Salin file ke `resources/js/pages/...`.
2. Ganti import `@/integrations/supabase/client` → `@/integrations/api/*`.
3. Sesuaikan hook agar memanggil API baru (signature hook tidak berubah).
4. Jalankan halaman, bandingkan visual & perilaku dengan project lama.
5. Tambah/perbaiki Policy & FormRequest untuk endpoint terkait.
6. Tulis 1 happy-path test endpoint.

Selesai untuk halaman tersebut bila checklist Definition of Done di `AI_CONTRACT.md` §9 terpenuhi.

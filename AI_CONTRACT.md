# AI_CONTRACT.md — Kontrak Implementasi untuk AI (Codex)

Dokumen ini adalah **aturan mutlak** yang harus dipatuhi oleh AI (Codex / agen pembangun) saat merefaktor *Sistem Presensi SD N 01 Jatipurwo* ke **Laravel 11 + MySQL 8**. Tujuan: hasil akhir **identik** dengan aplikasi lama dari sisi UI, fitur, keamanan, dan logika.

> Baca juga: `ARCHITECTURE.md` (blueprint), `PROJECT_MAP.md` (pemetaan file).

---

## 0. Prinsip Utama

1. **Paritas Total**. Setiap layar, tombol, label, status, alur, dan aturan bisnis dari aplikasi lama **harus ada persis sama** di aplikasi baru.
2. **Frontend tidak diubah**. Salin folder `src/` lama ke `resources/js/`. Hanya **lapisan akses data** (yang sebelumnya `@/integrations/supabase/client`) yang diganti dengan **Axios + endpoint Laravel**.
3. **Keamanan setara RLS**. Setiap akses data wajib lewat **Policy/Gate Laravel** + middleware role.
4. **Tidak menambah fitur** yang tidak ada di aplikasi lama, dan **tidak menghilangkan** satupun fitur lama.
5. **Tidak mengganti library**. Semua dependency FE (face-api.js, exceljs, jsPDF, sonner, recharts, shadcn, TanStack Query, react-hook-form, zod, dst) **tetap**.

---

## 1. Larangan Mutlak (DO NOT)

- ❌ Mengubah palet warna, font (Inter), bayangan, radius, spacing, atau token desain di `index.css` & `tailwind.config.ts`.
- ❌ Mengganti komponen shadcn/ui dengan library lain.
- ❌ Mengganti `exceljs` dengan `xlsx` (alasan keamanan — sama seperti aturan project lama).
- ❌ Menyimpan `role` di tabel `users` atau `profiles`. **Hanya** di tabel `user_roles`.
- ❌ Membuat endpoint yang mengizinkan user mengubah role-nya sendiri.
- ❌ Memakai CHECK constraint MySQL untuk validasi waktu (`now()`-based). Pakai service/FormRequest.
- ❌ Memakai `ALTER DATABASE` di migration.
- ❌ Anonymous sign-up. Auto-confirm email signup (kecuali user minta eksplisit).
- ❌ Menyembunyikan tombol close (X) pada toast. Toast **wajib** durasi 10 detik + close manual.
- ❌ Mengubah 5 status presensi resmi: `Hadir, Terlambat, Izin, Sakit, Tidak Hadir`.
- ❌ Mengubah cutoff default `06:30` tanpa konfigurasi via `app_settings`.
- ❌ Mengubah batas FIFO 10 face descriptors per siswa & cooldown 5 detik.
- ❌ Membuka bucket `student-photos` ke publik. Hanya signed URL.
- ❌ Memakai bahasa selain **Indonesia** untuk teks UI.
- ❌ Menambahkan analytics, tracking pihak ketiga, atau telemetry tanpa diminta.

---

## 2. Wajib (DO)

- ✅ Pakai **Laravel 11**, PHP 8.3, MySQL 8 (utf8mb4).
- ✅ Pakai **UUID `CHAR(36)`** sebagai PK untuk seluruh tabel domain (mirror Supabase).
- ✅ Pakai **Sanctum SPA cookie auth**.
- ✅ Validasi semua input server-side via `FormRequest`. Pesan error generik untuk user.
- ✅ Setiap Model wajib punya **Policy**; daftarkan di `AuthServiceProvider`.
- ✅ Bungkus operasi multi-step (approve izin, create akun, FIFO descriptors) dalam **DB transaction**.
- ✅ Pakai **trigger MySQL** atau service guard untuk:
  - sinkronisasi `students.has_embedding`.
  - FIFO 10 `face_descriptors` per siswa.
- ✅ Endpoint **`/manifest.webmanifest`** dinamis dari `app_settings` (branding sekolah).
- ✅ Schedule `AutoArrivalJob` `->dailyAt('06:30')` untuk auto-mark "Tidak Hadir" (skip hari libur & jadwal libur).
- ✅ Approval izin (admin) **otomatis** menulis `attendance_records` (status Izin/Sakit) untuk tanggal pengajuan.
- ✅ Tetap pakai **face-api.js client-side** dengan model dari CDN.
- ✅ Tetap pakai **TanStack Query polling 10 detik** untuk dashboard live.
- ✅ Bahasa UI: **Indonesia**. Branding produk dapat memakai nama internal sekolah.
- ✅ Setiap PR/commit refactor wajib menyertakan: migration, policy, FormRequest, controller, route, dan (jika menyentuh data baru) test.

---

## 2A. Catatan Kompatibilitas Legacy (wajib dipertahankan)

- Nilai status presensi yang tampil ke user tetap 5 label resmi:
  `Hadir`, `Terlambat`, `Izin`, `Sakit`, `Tidak Hadir`.
- Namun **kontrak payload FE lama** saat ini memakai nilai lowercase:
  `hadir`, `terlambat`, `izin`, `sakit`, `tidak-hadir`.
  Jika enum internal Laravel memakai bentuk lain, lakukan mapping di layer API/service
  tanpa mengubah kontrak komponen FE lama.
- Key `app_settings` yang dipakai aplikasi lama dan wajib tetap tersedia:
  `attendance`, `camera`, `notifications`, `school`, `appearance`, `site`.
- Default payload legacy yang wajib kompatibel:
  - `attendance`: `attendanceStart=06:00`, `lateThreshold=07:05`, `attendanceEnd=12:00`,
    `timezone=Asia/Jakarta`, `cooldownSeconds=5`, `enableSelfAttendance=false`, `schoolDays=5`
  - `camera`: `cameraResolution=720p`, `autoCapture=true`, `captureDelay=1`
  - `notifications`: `enableSound=true`, `enableNotifications=true`, `notifyLateStudents=true`
  - `appearance`: `theme=light`
  - `site`: `siteTitle`, `siteDescription`, `favicon`, `appTitle`, `appSubtitle`, `welcomeMessage`
  - `school`: `schoolName`, `schoolAddress`, `adminName`, `schoolLogo`
- Aplikasi lama membedakan dua jenis aset:
  - `student-photos`: private, dibuka lewat signed URL
  - `school-assets`: public, dipakai untuk logo sekolah, favicon, apple-touch-icon, dan ikon PWA
- Fitur backup admin pada aplikasi lama mendukung **dua format**:
  `JSON` dan `SQL full dump`. Refactor tidak boleh menurunkan cakupan ini.
- Manifest PWA lama saat ini dibentuk dinamis dari setting `site` + `school`.
  Jika implementasi dipindah ke endpoint Laravel, output akhirnya harus tetap ekuivalen
  dari sisi nama aplikasi, ikon, warna, dan `start_url`.

---

## 3. Aturan Pemetaan Akses Data

Aplikasi lama memakai pola:

```ts
import { supabase } from "@/integrations/supabase/client";
const { data } = await supabase.from("students").select("*");
```

**Aplikasi baru wajib** memakai client HTTP terpusat:

```ts
// resources/js/integrations/api/client.ts
import axios from "axios";
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  withXSRFToken: true,
});
```

Dan layer service per domain (pengganti `src/lib/database.ts`):

```ts
// resources/js/integrations/api/students.ts
export const StudentsApi = {
  list: () => api.get("/students").then(r => r.data),
  create: (payload) => api.post("/students", payload).then(r => r.data),
  // ...
};
```

> **Setiap file FE lama** yang `import { supabase }` harus diganti dengan import dari `integrations/api/*`. Hook (`useStudents`, `useAttendance`, dst) **tidak berubah signature**, hanya isi implementasinya yang ganti panggilan.

---

## 4. Standar Endpoint (REST JSON)

| Resource | Endpoint | Method | Role |
|---|---|---|---|
| Auth | `/api/auth/login`, `/logout`, `/me`, `/password` | POST/POST/GET/POST | guest/auth |
| Dashboard Stats | `/api/dashboard/stats` | GET | admin |
| Students | `/api/students` | GET/POST | admin (POST), siswa lihat sendiri |
| Students/{id} | `/api/students/{id}` | GET/PATCH/DELETE | policy |
| Students Import | `/api/students/import` | POST | admin |
| Attendance | `/api/attendance` | GET/POST | policy |
| FaceDescriptors | `/api/students/{id}/faces` | GET/POST/DELETE | policy |
| LeaveRequests | `/api/leave-requests` | GET/POST | siswa (POST), admin (review) |
| LeaveRequests/{id}/approve|reject | POST | admin |
| Holidays | `/api/holidays` | GET/POST/DELETE | view publik, write admin |
| AppSettings | `/api/settings` | GET/PUT | view publik subset, write admin |
| Reports | `/api/reports/attendance?...` | GET | admin/parent (anaknya) |
| Reports Trend | `/api/reports/trend` | GET | admin |
| Parent Trend | `/api/reports/parent-trend` | GET | parent |
| Admin Users | `/api/admin/users` | GET/POST/PATCH/DELETE | admin |
| Backup | `/api/admin/backup?format=json|sql` | GET (stream file) | admin |
| Manifest | `/manifest.webmanifest` | GET | publik |
| Storage | `/api/storage/sign?path=...` | GET (return signed URL) | auth |

Format response standar:

```json
{ "data": ..., "meta": { ... }, "error": null }
```

Error format:

```json
{ "data": null, "error": { "message": "Pesan generik", "code": "FORBIDDEN" } }
```

HTTP status: 200/201/204 sukses; 400 validasi; 401 unauth; 403 policy; 404 not-found; 409 conflict; 422 validation detail; 500 error.

---

## 5. Aturan Migrasi Skema

- 1 file migration per perubahan. Jangan edit migration lama setelah dijalankan di lingkungan lain.
- Nama tabel & kolom **identik** dengan Supabase (lihat `ARCHITECTURE.md` §5).
- ENUM presensi: `('Hadir','Terlambat','Izin','Sakit','Tidak Hadir')`.
- `UNIQUE(student_id, date)` di `attendance_records`.
- `UNIQUE(user_id)` di `student_user_links`.
- Trigger MySQL ditulis di migration via `DB::unprepared(...)`.

---

## 6. Aturan UI (tidak boleh drift)

- Komponen-komponen kunci yang **wajib tetap** seperti aplikasi lama:
  - `BottomNav` (FAB di tengah, mobile only).
  - `Header` (sticky).
  - `FaceRegistrationDialog` lebar di desktop (preview kiri, kontrol kanan, **tanpa scroll**).
  - `HolidayBanner`.
  - `ProtectedRoute` + `RoleLayout`.
  - `SignedImage`.
  - `ThemeToggle` (light/dark).
- Toast (`sonner`) durasi 10000ms, `closeButton: true`.
- Audio synth lewat Web Audio API (`lib/audio.ts`) — biarkan apa adanya.
- Halaman `/install` & manifest dinamis tetap.

---

## 7. Aturan Keamanan Tambahan

- Setiap controller admin wajib `$this->authorize('admin')` atau middleware `role:admin`.
- `FormRequest::rules()` selalu memvalidasi tipe, panjang, dan whitelist enum.
- Sanitasi nama file upload; jangan trust ekstensi.
- Rate-limit (`throttle:60,1`) di endpoint login & write attendance.
- Logging: jangan log password / token / descriptor wajah.
- CORS: hanya origin FE yang diizinkan.
- Headers: `X-Content-Type-Options`, `X-Frame-Options`, CSP minimal.

---

## 8. Aturan Output AI

Saat AI menambah/mengubah kode, harus:

1. Tidak men-generate file baru di `src/integrations/supabase/*` (file ini tidak ada di project baru).
2. Tidak menulis ulang komponen UI lama tanpa alasan teknis.
3. Setiap perubahan skema **selalu** disertai migration baru + update Policy + update FormRequest.
4. Setiap penambahan endpoint **selalu** dijelaskan di `routes/api.php` dengan urutan terkelompok per domain.
5. Tidak menambah dependency tanpa alasan jelas; cek dulu `composer.json` & `package.json`.

---

## 9. Definisi "Selesai" (Definition of Done)

Sebuah refactor halaman/fitur dianggap selesai jika:

- ✅ Migration jalan tanpa error di MySQL fresh.
- ✅ Seeder admin (`sdn01jatipurwo@gmail.com`) berjalan.
- ✅ Endpoint terkait sudah ada Policy + FormRequest + test minimal.
- ✅ Halaman FE terkait render identik dengan project lama (perbandingan visual).
- ✅ Alur end-to-end (login → aksi → hasil) berjalan tanpa error console.
- ✅ Tidak ada panggilan ke `supabase` tersisa di kode FE.
- ✅ Lulus `php artisan test` (paling tidak smoke).

---

## 10. Eskalasi

Jika AI menemukan ambiguitas atau konflik antara `ARCHITECTURE.md`, `PROJECT_MAP.md`, dan kode lama, urutan prioritas keputusan:

1. **Perilaku aplikasi lama yang berjalan** (truth-of-record).
2. `ARCHITECTURE.md`.
3. `AI_CONTRACT.md` (dokumen ini).
4. `PROJECT_MAP.md`.
5. Praktik umum Laravel.

Jika tetap ambigu, **tanyakan pengguna** dan jangan berasumsi.

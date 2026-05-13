# Hadirku Laravel 11

Target refactor Hadirku berbasis Laravel 11, Sanctum session auth, dan React/Vite. Folder ini adalah aplikasi baru; folder root lama tetap dipakai sebagai sumber perilaku/fitur sampai migrasi divalidasi.

## Status Migrasi

- Backend domain Laravel sudah tersedia: siswa, kelas, presensi, izin/sakit, hari libur, setting aplikasi, akun siswa/orang tua, face descriptors, backup JSON/SQL, storage privat, manifest PWA dinamis.
- Frontend React lama sudah dipindah ke `resources/js` dan dipasang melalui Vite Laravel.
- Adapter `resources/js/integrations/supabase/client.ts` mempertahankan pola pemanggilan Supabase lama, tetapi mengarah ke API Laravel lokal.
- Test backend lulus dengan `php artisan test`.

## Setup Lokal

```bash
composer install
php artisan key:generate
php artisan migrate --seed
npm install
npm run build
php artisan serve
```

Untuk Laragon/MySQL, sesuaikan `.env`:

```env
APP_NAME=Hadirku
APP_TIMEZONE=Asia/Jakarta
APP_URL=http://hadirku.test

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hadirku
DB_USERNAME=root
DB_PASSWORD=
```

Admin seed default:

```text
Email: sdn01jatipurwo@gmail.com
Password: password
```

Ganti password seed dengan `ADMIN_PASSWORD` di `.env` sebelum deploy.

## Verifikasi

```bash
php artisan test
php artisan route:list --except-vendor
npm run build
```

Catatan: jika `npm install` gagal karena optional dependency Rollup/SWC di Windows, hapus `node_modules` lalu jalankan ulang `npm install` dari root project ini.

## Instalasi cPanel Shared Hosting

Rekomendasi struktur hosting:

```text
/home/username/hadirku        # isi project Laravel, di luar public_html
/home/username/public_html    # isi dari folder public Laravel
```

Langkah deploy:

1. Build asset di lokal atau server:

```bash
composer install --no-dev --optimize-autoloader
npm install
npm run build
```

2. Upload semua file project ke folder di luar web root, misalnya `/home/username/hadirku`.

3. Pindahkan isi folder `public/` Laravel ke `/home/username/public_html`.

4. Edit `/home/username/public_html/index.php` agar menunjuk ke folder Laravel:

```php
require __DIR__.'/../hadirku/vendor/autoload.php';
$app = require_once __DIR__.'/../hadirku/bootstrap/app.php';
```

5. Buat database MySQL dari cPanel, lalu isi `.env` di `/home/username/hadirku`:

```env
APP_NAME=Hadirku
APP_ENV=production
APP_DEBUG=false
APP_URL=https://domain-anda.com
APP_TIMEZONE=Asia/Jakarta

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=username_hadirku
DB_USERNAME=username_hadirku
DB_PASSWORD=password_database

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local
```

6. Jalankan perintah Laravel lewat Terminal cPanel atau SSH:

```bash
cd /home/username/hadirku
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

7. Pastikan permission folder berikut bisa ditulis PHP:

```text
storage/
bootstrap/cache/
database/      # hanya jika memakai SQLite; untuk MySQL tidak wajib writable
```

Jika hosting tidak menyediakan Terminal/SSH, jalankan `composer install --no-dev`, `npm run build`, dan `php artisan key:generate` di lokal. Upload folder `vendor/`, folder `public/build/`, dan isi `.env` manual. Untuk migrasi database, import SQL dari hasil migrasi lokal atau gunakan fitur phpMyAdmin.

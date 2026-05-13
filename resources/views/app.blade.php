<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sistem Presensi - SD N 01 Jatipurwo</title>
    <meta name="description" content="Sistem Presensi Wajah" />
    <meta name="author" content="SD N 01 Jatipurwo" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/favicon.ico" />
    @unless(app()->environment('testing'))
      @viteReactRefresh
      @vite(['resources/js/main.tsx'])
    @endunless
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>

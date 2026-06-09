# Panduan Menjalankan HLM Order Manager (untuk pemula, tanpa basic programming)

Aplikasi ini sudah tersimpan di folder `hlm-app`. Ikuti langkah-langkah berikut secara berurutan — santai saja, tidak perlu paham kodenya, cukup ikuti.

## Bagian 1 — Siapkan "mesin" untuk menjalankan aplikasi (Node.js)

Aplikasi ini butuh program bernama **Node.js** untuk berjalan di komputer Anda.

1. Buka https://nodejs.org
2. Download versi **LTS** (yang direkomendasikan, biasanya tombol besar di tengah)
3. Install seperti install aplikasi biasa (next-next-finish)
4. Buka **Terminal** (Mac: cari "Terminal" di Spotlight / search)
5. Ketik `node -v` lalu Enter — kalau muncul angka versi (misal `v20.x.x`), berarti berhasil

## Bagian 2 — Buat "database" gratis di Supabase

Database adalah tempat menyimpan semua data (customer, buku, order, dll). Kita pakai Supabase — gratis untuk skala kecil.

1. Buka https://supabase.com → klik **Start your project** → daftar pakai email/Google
2. Klik **New Project**
   - Nama project: bebas, misal `hlm-order`
   - Database Password: buat password, **catat & simpan baik-baik**
   - Region: pilih yang paling dekat (Singapore biasanya paling cepat untuk Indonesia)
3. Tunggu 1-2 menit sampai project selesai dibuat
4. Di sidebar kiri, klik ikon **SQL Editor** (gambar seperti `</>`)
5. Klik **New query**
6. Buka file `supabase/schema.sql` yang ada di folder `hlm-app` (bisa pakai TextEdit/Notepad), **copy semua isinya**
7. **Paste** ke kotak SQL Editor di Supabase, lalu klik tombol **Run** (atau Ctrl/Cmd+Enter)
8. Kalau muncul "Success. No rows returned" — berarti tabel-tabel sudah berhasil dibuat ✅

### Ambil "kunci" untuk menghubungkan aplikasi ke database
1. Di sidebar kiri Supabase, klik ikon ⚙️ **Project Settings** → **API**
2. Anda akan melihat dua hal yang perlu dicatat:
   - **Project URL** (contoh: `https://xxxxx.supabase.co`)
   - **anon public key** (deretan huruf/angka panjang)

## Bagian 3 — Hubungkan aplikasi ke database

1. Di folder `hlm-app`, cari file bernama `.env.local.example`
2. **Duplikat/copy** file itu, lalu **rename hasil copy-annya** menjadi `.env.local` (hilangkan `.example`)
   - Di Mac: klik kanan file → Duplicate, lalu rename
3. Buka file `.env.local` dengan TextEdit/Notepad, lalu ganti isinya:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=isi-dengan-anon-key-dari-supabase
   ```
   (ganti dengan **Project URL** dan **anon public key** yang Anda catat di Bagian 2)
4. Simpan file

## Bagian 4 — Jalankan aplikasinya

1. Buka **Terminal**
2. Ketik perintah berikut satu per satu (Enter setelah masing-masing baris):
   ```
   cd Claude/hlm-app
   npm install
   ```
   Tunggu sampai selesai (muncul tulisan-tulisan proses download, ini normal, bisa beberapa menit)
3. Setelah selesai, ketik:
   ```
   npm run dev
   ```
4. Tunggu sampai muncul tulisan seperti `Local: http://localhost:3000`
5. Buka browser (Chrome/Safari), ketik di address bar: `localhost:3000`
6. Aplikasi akan terbuka! 🎉

> Untuk menghentikan aplikasi: kembali ke Terminal, tekan `Ctrl + C`
> Untuk menjalankan lagi besok: ulangi langkah 1, 3-5 di Bagian 4 (tidak perlu `npm install` lagi kecuali ada perubahan)

## Bagian 5 — Mulai mencoba

Urutan mencoba yang disarankan (ikuti alur kerja nyata Anda):
1. **Master Customer** → tambahkan beberapa data customer dulu (nama WA, no WA, alamat, grup)
2. **Buku/PO** → masukkan daftar buku dari satu batch PO (bisa contek dari file Excel yang Anda kirim sebelumnya)
3. **Compile Order** → catat siapa pesan buku apa (seperti biasa Anda rekap dari WA)
4. **Invoice** → pilih customer, lihat preview invoice otomatis, coba klik "Salin Invoice" lalu paste ke Notes/WA untuk lihat hasilnya
5. **Antrian Pengiriman** & **Tracking Number** → coba setelah ada order yang sudah "Lunas"

## Kalau ada masalah / error

- **`npm install` atau `npm run dev` gagal** → screenshot pesan errornya, kirimkan ke saya, saya bantu cari solusinya
- **Halaman aplikasi muncul tapi data tidak bisa disimpan** → kemungkinan `.env.local` belum benar, cek lagi Bagian 3
- **Lupa mematikan**: aplikasi hanya jalan selama Terminal terbuka & `npm run dev` aktif — tutup terminal = aplikasi berhenti (data di Supabase tetap aman, tersimpan di cloud)

## Tahap selanjutnya (nanti, setelah Anda nyaman)

Setelah Anda terbiasa menjalankan & mencoba aplikasi ini di komputer sendiri ("local"), langkah berikutnya adalah **deploy** — supaya bisa diakses dari HP/komputer lain dan oleh tim Anda (Deasy, Vita) tanpa harus install apa-apa. Untuk itu nanti kita pakai **Vercel** (gratis, prosesnya tidak jauh berbeda — connect akun, klik deploy). Kita bahas ini setelah Anda sudah nyaman mencoba versi local-nya dulu.

Selamat mencoba! Jangan ragu tanya kalau ada langkah yang membingungkan — tidak ada pertanyaan yang terlalu dasar. 🙌

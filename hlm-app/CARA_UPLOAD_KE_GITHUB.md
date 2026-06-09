# Cara Mengunggah Folder Ini ke Repository GitHub HLM

Folder `hlm-app` ini sudah lengkap dan siap diunggah (sudah di-"commit" dengan Git, tinggal dikirim ke GitHub).

## Opsi A — Lewat Website GitHub (paling mudah, tanpa Terminal)

1. Buka https://github.com, login ke akun HLM
2. Klik tombol hijau **New** (atau ikon `+` di kanan atas → New repository)
3. Isi nama repo, misal `hlm-order-app`, pilih **Private** (supaya tidak publik), klik **Create repository**
4. Di halaman repo baru, klik link **uploading an existing file**
5. Buka folder `hlm-app` di komputer Anda lewat Finder
   - **PENTING**: jangan upload folder `node_modules` dan `.next` (ukurannya besar & tidak perlu — sudah otomatis diabaikan kalau pakai cara B di bawah, tapi kalau upload manual lewat website, jangan ikut pilih 2 folder ini)
6. Pilih semua file & folder LAIN (selain `node_modules` dan `.next`), drag ke kotak upload di GitHub
7. Klik **Commit changes**

## Opsi B — Lewat Terminal dengan Git (lebih rapi, sedikit lebih teknis)

1. Buat repository baru di GitHub (langkah 1-3 di Opsi A), **jangan centang** "Add a README file"
2. Setelah dibuat, GitHub akan menampilkan sebuah alamat/link repo, bentuknya seperti:
   `https://github.com/nama-akun-hlm/hlm-order-app.git`
   — copy alamat ini
3. Buka Terminal, lalu ketik:
   ```
   cd Claude/hlm-app
   git remote add origin PASTE-ALAMAT-REPO-DI-SINI
   git branch -M main
   git push -u origin main
   ```
4. Kalau diminta login, ikuti instruksi di layar (biasanya akan membuka browser untuk login GitHub)
5. Setelah selesai, refresh halaman repo di GitHub — semua file akan muncul di sana

> Catatan: file `.env.local` (yang berisi kunci rahasia Supabase) **TIDAK akan ikut terupload** — itu memang sengaja, supaya kunci rahasia Anda aman. Setiap orang yang menjalankan aplikasi ini harus membuat `.env.local` sendiri (lihat `CARA_MENJALANKAN.md`).

## Setelah berhasil di GitHub

Kalau sudah ada di GitHub, langkah deploy ke Vercel jadi sangat mudah — Anda tinggal:
1. Buka https://vercel.com, login pakai akun GitHub yang sama
2. Klik **Add New → Project**, pilih repo `hlm-order-app`
3. Vercel akan minta isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sama seperti isi `.env.local`)
4. Klik **Deploy** — selesai, aplikasi bisa diakses online dari mana saja

Kita bahas detail deploy ini kapan-kapan setelah repo sudah berhasil terunggah ya.

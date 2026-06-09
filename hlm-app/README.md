# HLM Order Manager

Aplikasi internal untuk menggantikan proses manual rekap pesanan buku import (WhatsApp → Excel → Invoice → Antrian Kirim) milik HLM.

## Modul
- **Master Customer** — data WA, alamat, penerima paket, grup
- **Buku / PO** — daftar buku per batch, harga (GBP & Rupiah), ETA, status OOS
- **Compile Order** — rekap pesanan customer (pengganti rekap manual dari grup WA)
- **Invoice DP & Pelunasan** — generate teks invoice siap kirim ke WhatsApp
- **Antrian Pengiriman** — antrian first-pay-first-queue + format kemas untuk tim packing
- **Tracking Number** — input & rekap resi per bulan

## Tech Stack
- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com) (Postgres + Auth) sebagai backend/database

## Menjalankan secara lokal
Lihat panduan lengkap (untuk pemula, tanpa basic programming) di [`CARA_MENJALANKAN.md`](./CARA_MENJALANKAN.md).

Ringkas:
1. Buat project di Supabase, jalankan `supabase/schema.sql` di SQL Editor
2. Salin `.env.local.example` → `.env.local`, isi `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `npm install`
4. `npm run dev` lalu buka `http://localhost:3000`

## Struktur Database
Skema tabel ada di [`supabase/schema.sql`](./supabase/schema.sql): `customers`, `books`, `orders`, `payments`, `shipments`.

## Deploy
Direkomendasikan deploy frontend ke [Vercel](https://vercel.com) (gratis, tinggal connect repo GitHub ini) dan database tetap di Supabase cloud.

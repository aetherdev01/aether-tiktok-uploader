# Aether TikTok Uploader — Panduan Setup

Web app untuk login ke TikTok (via OAuth resmi) dan upload video langsung
dari iPhone (Safari) ke akun TikTok kamu, menggunakan **Content Posting API**.

## Kenapa ada folder `api/`?

TikTok mewajibkan Client Secret untuk dua hal:
1. Menukar kode login jadi access token (`api/callback.js`)
2. Memperbarui token yang kedaluwarsa (`api/_session.js`)

Client Secret **tidak boleh** ada di kode yang berjalan di browser (Safari) —
siapa pun bisa melihatnya lewat "View Source". Karena itu dua proses di atas
dijalankan di **Vercel Serverless Functions**, bukan di `index.html`.

Video yang kamu upload **tidak** ikut lewat server ini — begitu upload
diinisialisasi, video dikirim langsung dari iPhone ke server TikTok.

## Langkah 1 — Siapkan App di TikTok Developer Portal

1. Buka https://developers.tiktok.com/apps/ → pilih app kamu
2. Tambahkan produk **Login Kit** dan **Content Posting API** jika belum ada
3. Di pengaturan Login Kit, isi **Redirect URI** — nanti diisi setelah deploy
   (lihat Langkah 3), contoh: `https://nama-app-kamu.vercel.app/api/callback`
4. Catat **Client Key** dan **Client Secret** dari halaman Basic Information

## Langkah 2 — Install Vercel CLI (di iPhone bisa pakai app seperti
   a-Shell/iSH, atau paling gampang: upload folder ini ke GitHub lalu
   import lewat vercel.com dari browser mana saja)

**Cara termudah (tanpa command line):**
1. Buat akun gratis di https://vercel.com (bisa daftar pakai GitHub)
2. Upload folder project ini ke repository GitHub baru
3. Di dashboard Vercel: **Add New → Project** → pilih repo tadi → Deploy

## Langkah 3 — Isi Environment Variables di Vercel

Di Vercel Dashboard → Project kamu → **Settings → Environment Variables**,
tambahkan tiga variabel ini (isi sesuai `.env.example`):

| Key | Value |
|---|---|
| `TIKTOK_CLIENT_KEY` | dari TikTok Developer Portal |
| `TIKTOK_CLIENT_SECRET` | dari TikTok Developer Portal |
| `TIKTOK_REDIRECT_URI` | `https://nama-app-kamu.vercel.app/api/callback` |

Setelah itu, **redeploy** project (Vercel → Deployments → tombol "Redeploy").

Balik lagi ke TikTok Developer Portal, pastikan Redirect URI yang didaftarkan
di produk **Login Kit** **sama persis** (termasuk domain, path `/api/callback`,
`https://`, dan ada/tidaknya trailing slash) dengan `TIKTOK_REDIRECT_URI` di atas.
Jangan memakai URL deployment preview jika kamu login lewat domain production.

### Jika muncul `We couldn't log in with TikTok` / `client_key`

1. Buka `https://domain-kamu.vercel.app/api/config-check`. Semua nilai pada
   `checks` harus `true`. Endpoint ini tidak menampilkan Client Key maupun Secret.
2. Jika semua `true` tetapi TikTok masih menampilkan error `client_key`, buka
   TikTok Developer Portal → **Manage apps** → pilih aplikasi yang sama →
   **Basic Information**. Salin ulang **Client Key** ke Vercel sebagai
   `TIKTOK_CLIENT_KEY`. Jangan memasukkan App ID, Client Secret, atau key dari
   aplikasi TikTok yang berbeda. Hindari spasi saat menyalin.
3. Pastikan produk **Login Kit** sudah ditambahkan/dikonfigurasi pada aplikasi itu
   dan Redirect URI production yang persis sama sudah disimpan di Login Kit.
4. Simpan Environment Variables untuk environment yang dipakai (Production jika
   situs production), lalu lakukan **Redeploy**. Coba login lagi dari domain itu.

Catatan: `api/config-check` hanya memeriksa format dan keberadaan Environment
Variables; ia tidak bisa memverifikasi apakah Client Key masih aktif atau terdaftar
untuk aplikasi yang benar. Pemeriksaan akhir dilakukan oleh TikTok saat login.

## Langkah 4 — Buka di iPhone

1. Buka Safari, akses `https://nama-app-kamu.vercel.app`
2. Tap **Login TikTok** → login seperti biasa di halaman TikTok asli → izinkan akses
3. Setelah kembali ke app, pilih video dari galeri, isi caption, pilih privasi, tap **Post ke TikTok**
4. Buka notifikasi di **inbox TikTok** (app TikTok asli) untuk menyelesaikan proses posting

Opsional: tap tombol Share di Safari → **Add to Home Screen** supaya terasa seperti app.

## Batasan penting yang perlu kamu tahu

- **Sebelum app lolos full audit TikTok**, postingan dari API biasanya hanya
  bisa berstatus privat/draf ke inbox, tidak langsung publik ke publik.
- **Rate limit**: maksimal 6 request/menit per user token, dan maksimal
  sekitar 5 video "pending" dalam 24 jam untuk mencegah spam.
- **Access token** berlaku 24 jam, **refresh token** berlaku 365 hari — app
  ini otomatis refresh token di background, jadi kamu tidak perlu login
  ulang tiap hari, hanya kalau refresh token juga kedaluwarsa (1 tahun) atau
  kamu revoke akses lewat pengaturan TikTok.
- Video besar (misalnya di atas ~64MB) idealnya dikirim dalam beberapa
  chunk, bukan sekali kirim. Versi ini mengirim sebagai 1 chunk penuh —
  cukup untuk video pendek TikTok standar, tapi untuk file sangat besar
  beri tahu saya supaya saya tambahkan logika chunking-nya.

## Struktur file

```
tiktok-uploader/
├── public/
│   └── index.html          # UI: login, pilih video, caption, publish
├── api/
│   ├── auth.js              # redirect ke halaman login TikTok
│   ├── config-check.js      # cek konfigurasi tanpa menampilkan key/secret
│   ├── callback.js          # tukar code -> access_token (pakai Client Secret)
│   ├── _session.js          # baca/refresh session dari cookie
│   ├── session.js           # cek status login untuk UI
│   ├── creator-info.js      # ambil opsi privasi yang diizinkan
│   ├── publish.js           # inisialisasi upload video ke TikTok
│   ├── status.js            # cek status posting (opsional)
│   └── logout.js
├── vercel.json
├── package.json
└── .env.example
```

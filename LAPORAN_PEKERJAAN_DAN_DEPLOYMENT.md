# Laporan Pekerjaan Sistem EventPass & Panduan Deployment Production

**Tanggal Laporan:** 4 November 2026  
**Project:** EventPass — Sistem Manajemen Registrasi Event, RSVP QR Code & Doorprize  
**Repository GitHub:** [https://github.com/dafnzxy/project-regostrations](https://github.com/dafnzxy/project-regostrations)  
**Author / Admin:** Daffa (`dafnzxy` — `daffaabdulj@gmail.com`)

---

## BAGIAN 1: Laporan Lengkap Pekerjaan Hari Ini

### 1. Setup Repository GitHub & Proteksi Keamanan File (`.gitignore`)
- Menginisialisasi Git repository lokal dengan branch utama `main` dan menghubungkannya ke repository GitHub `https://github.com/dafnzxy/project-regostrations.git`.
- Mengamankan konfigurasi [`.gitignore`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/.gitignore) agar file sensitif tidak ikut ter-upload ke publik:
  - Kredensial `.env` (berisi password SMTP dan URL database) di-ignore, sementara [`.env.example`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/.env.example) tetap disertakan sebagai template.
  - File database lokal SQLite (`*.db`, `prisma/dev.db`) dan file unggahan peserta/admin (`public/uploads/*`) di-exclude dari Git.

---

### 2. Penghapusan Landing Webpage & Akses Langsung ke Dashboard App
- Menghapus halaman promosi/landing page di [`src/app/page.tsx`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/app/page.tsx) dan menghapus komponen `Navbar.tsx` yang sudah tidak diperlukan.
- Mengatur agar saat pengguna membuka aplikasi utama (`/`), sistem langsung mengarahkan ke **Dashboard Admin (`/dashboard`)** atau halaman **Autentikasi PIN (`/dashboard/login`)**.
- Membersihkan tautan kembali ke halaman depan pada sidebar [`src/app/dashboard/(admin)/layout.tsx`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/app/dashboard/(admin)/layout.tsx) dan halaman login [`src/app/dashboard/login/page.tsx`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/app/dashboard/login/page.tsx).

---

### 3. Pengamanan Berlapis (6 Lapis Defense-in-Depth) & Isolasi Link Registrasi
Untuk memastikan peserta yang membuka link registrasi (`/e/[slug]`) atau link tiket (`/ticket/[token]`) **tidak bisa masuk atau membobol Dashboard Admin**, telah diterapkan 6 lapis pengamanan:

```mermaid
flowchart TD
    A["Peserta Membuka Link Registrasi (/e/slug)"] --> B["Proxy Layer (src/proxy.ts)"]
    B --> C["Set Cookie Penanda Peserta & Security Headers"]
    C --> D["Tampilan Form Registrasi (Tanpa Link ke Dashboard)"]
    A -. "Coba Otak-Atik URL ke /" .-> E["Otomatis Dikembalikan ke /e/slug"]
    A -. "Coba Paksa Buka /dashboard" .-> F["Diblokir Proxy & Dicek Token HMAC-SHA256"]
    F --> G["Wajib Lewati PIN Login + Anti Brute-Force (Max 5x)"]
```

1. **Isolasi Navigasi UI ([`PublicNavbar.tsx`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/components/PublicNavbar.tsx))**: Header pada halaman registrasi dan halaman tiket dibuat statis (tidak bisa diklik) dan tidak memiliki link apa pun ke `/` atau `/dashboard`.
2. **Anti-Manipulasi URL di Browser Peserta ([`src/proxy.ts`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/proxy.ts))**:
   - Saat peserta membuka `/e/[slug]`, sistem menyimpan penanda `eventpass_public_slug`. Jika peserta menghapus URL menjadi `/`, sistem langsung mengembalikan mereka ke halaman `/e/[slug]` dan **tidak menampilkan halaman login admin**.
   - Akses ke `/e` atau `/ticket` tanpa parameter langsung diarahkan ke halaman 404 terisolasi ([`src/app/not-found.tsx`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/app/not-found.tsx)).
3. **Token Sesi Admin Terenkripsi HMAC-SHA256 ([`src/lib/auth-token.ts`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/lib/auth-token.ts))**:
   - Cookie sesi admin (`eventpass_admin_auth`) ditandatangani secara kriptografis menggunakan algoritma **HMAC-SHA256** dengan atribut `HttpOnly` dan `SameSite=Strict`, sehingga tidak dapat dipalsukan melalui *Inspect Element / Browser DevTools*.
4. **Anti Brute-Force PIN Login ([`src/actions/auth.ts`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/actions/auth.ts))**:
   - Menghapus *backdoor* password bawaan dan memvalidasi PIN menggunakan `crypto.timingSafeEqual`.
   - Membatasi percobaan login maksimal **5 kali gagal**, setelah itu IP pengakses dikunci otomatis selama **5 menit**.
5. **Kunci Ganda pada Seluruh Halaman Dashboard, Server Actions, & API Routes**:
   - Setiap halaman di `/dashboard/*`, seluruh fungsi admin di [`events.ts`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/actions/events.ts), [`registrations.ts`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/actions/registrations.ts), [`doorprize.ts`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/actions/doorprize.ts), [`settings.ts`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/actions/settings.ts), serta endpoint `/api/upload` dan `/api/events/[id]/export` wajib melewati `requireAdminAuth()`.
6. **Proteksi QR Code Sebelum Disetujui ([`src/app/ticket/[token]/page.tsx`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/app/ticket/%5Btoken%5D/page.tsx))**:
   - Peserta yang masih berstatus `PENDING` atau `REJECTED` tidak mendapatkan `qrToken` di respons form dan halaman tiket tidak akan merender gambar QR Code sampai di-ACC oleh Admin.

---

### 4. Fitur Export Data Peserta ke Microsoft Excel Asli (`.xlsx`)
- Membangun generator OpenXML `.xlsx` mandiri di [`src/lib/excel.ts`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/lib/excel.ts) dan API Route [`src/app/api/events/[id]/export/route.ts`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/app/api/events/%5Bid%5D/export/route.ts).
- Menghasilkan file Excel `.xlsx` rapi dengan 2 *worksheet*:
  - **Sheet 1 (`Data Peserta`)**: Banner judul acara, header tabel berwarna Indigo, lebar kolom otomatis, badge warna sesuai status (`HADIR`, `DISETUJUI`, `MENUNGGU`, `DITOLAK`), data lengkap peserta + seluruh field kustom Form Builder, Token QR, Link E-Tiket, waktu daftar, waktu ACC, dan waktu check-in.
  - **Sheet 2 (`Rekap & Doorprize`)**: Ringkasan statistik kuota & kehadiran serta tabel riwayat pemenang undian Doorprize.

---

### 5. Fitur Template Email E-Tiket Siap Pakai & Pengujian Pengiriman Nyata
- Membuat modul [`src/lib/email-templates.ts`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/lib/email-templates.ts) dengan **4 Preset Template Email Profesional Siap Pakai**:
  1. *Resmi & Profesional (Default)*
  2. *Ramah & Antusias (Workshop / Komunitas)*
  3. *Undangan Eksklusif / VIP Pass*
  4. *Pengingat Hari-H (Reminder)*
- Menambahkan modal **Pratinjau (Live Preview) & Kirim E-Tiket** di [`RegistrationsClient.tsx`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/src/app/dashboard/(admin)/events/%5Bid%5D/registrations/RegistrationsClient.tsx) sehingga admin tinggal memilih template dan klik **Kirim E-Tiket Sekarang** (atau kirim via Gmail Web).
- **Hasil Pengujian End-to-End (Berhasil 100%)**:
  - Event Uji Coba: `Grand Launching & Networking Night 2026` (`/e/grand-launching-networking-2026`)
  - Peserta 1: `Daffa Abdul J` (`daffaabdulj@gmail.com`) — `EventPass Indonesia` (`APPROVED`)
  - Peserta 2: `Daffa Asep` (`daffaasep12@gmail.com`) — `PT Nusantara Digital Inovasi` (`APPROVED` oleh `Admin Daffa`, E-Tiket & QR Code sukses terkirim ke inbox Gmail dengan `MessageId: <6683680e-2a92-d011-e4af-fc94ed1cdbec@eventorganizer.com>`).

---

## BAGIAN 2: Panduan & Tahapan Deployment ke Production

Saat ini aplikasi menggunakan database lokal **SQLite (`file:./dev.db`)** untuk mempermudah pengembangan di laptop. Ketika masuk ke tahap **Deployment (Online)** agar link registrasi bisa diakses peserta dari mana saja (dan kamera HP bisa melakukan scan QR via HTTPS), berikut adalah tahapan resminya:

> [!IMPORTANT]
> **Mengapa Database Perlu Diperhatikan Saat Deploy?**
> Platform serverless seperti **Vercel** memiliki sistem file sementara (*ephemeral filesystem*), artinya file SQLite `dev.db` akan ter-reset setiap kali ada update. Oleh karena itu, untuk production online sangat disarankan menggunakan **PostgreSQL Cloud Gratis (Neon.tech / Supabase)** agar data peserta dan event tersimpan permanen.

---

### Tahap 1: Siapkan Database PostgreSQL Cloud Gratis (5 Menit)
1. Buka [https://neon.tech](https://neon.tech) atau [https://supabase.com](https://supabase.com) lalu daftar/login (bisa menggunakan akun GitHub `dafnzxy`).
2. Buat project baru (misalnya: `eventpass-db`, Region: `Singapore`).
3. Salin **Connection String PostgreSQL** yang diberikan, contohnya:
   ```env
   postgresql://neondb_owner:password@ep-cool-cloud.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Pada file [`prisma/schema.prisma`](file:///c:/Users/daffa/OneDrive/Dokumen/project%20barcode%20end%202026/prisma/schema.prisma) baris 8-10, ubah `provider` dari `"sqlite"` menjadi `"postgresql"`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

---

### Tahap 2: Push Kode Terbaru ke GitHub
Setelah revisi desain selesai nantinya, jalankan perintah berikut di terminal untuk meng-upload seluruh perubahan terbaru ke GitHub kamu:
```powershell
git add .
git commit -m "chore: persiapan deployment production, fitur excel & keamanan"
git push origin main
```

---

### Tahap 3: Deploy Aplikasi ke Vercel (Gratis & Otomatis HTTPS)
1. Buka [https://vercel.com](https://vercel.com) dan login menggunakan akun **GitHub (`dafnzxy`)**.
2. Klik **"Add New..."** -> **"Project"**.
3. Pilih repository **`project-regostrations`** lalu klik **Import**.
4. Pada bagian **Build and Output Settings**, ubah **Build Command** menjadi:
   ```bash
   npx prisma generate && npx prisma db push && next build
   ```
5. Pada bagian **Environment Variables**, masukkan variabel berikut satu per satu:

| Nama Variabel (`Key`) | Nilai (`Value`) | Keterangan |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...` | Connection string PostgreSQL dari Neon / Supabase |
| `AUTH_SECRET` | `rahasia-super-aman-eventpass-2026-xyz` | Kunci rahasia enkripsi token login Admin (bebas, minimal 32 karakter) |
| `SMTP_HOST` | `smtp.gmail.com` | Server SMTP Google |
| `SMTP_PORT` | `587` | Port TLS Gmail |
| `SMTP_USER` | `daffaabdulj@gmail.com` | Email pengirim tiket |
| `SMTP_PASS` | `cxsjakwtzjudhfhf` | 16-digit Google App Password kamu |
| `SMTP_FROM` | `EventPass Official <daffaabdulj@gmail.com>` | Nama & alamat pengirim di inbox peserta |
| `NEXT_PUBLIC_APP_URL` | `https://nama-project-kamu.vercel.app` | URL domain Vercel setelah deploy (agar link QR di email mengarah ke domain online) |

6. Klik tombol **Deploy** dan tunggu sekitar 1–2 menit hingga proses selesai.

---

### Tahap 4: Checklist Setelah Aplikasi Online (Go-Live Checklist)
Setelah domain Vercel kamu aktif (misalnya `https://project-regostrations.vercel.app`):
1. **Perbarui `NEXT_PUBLIC_APP_URL`**: Pastikan nilai `NEXT_PUBLIC_APP_URL` di pengaturan Environment Variables Vercel sudah sesuai dengan domain publik kamu, lalu klik *Redeploy* jika diubah.
2. **Ganti PIN Admin Default**:
   - Buka `https://domain-kamu.vercel.app/dashboard/login` (login pertama kali dengan PIN `123456`).
   - Masuk ke menu **Pengaturan Email & PIN** (`/dashboard/settings`), lalu ganti PIN `123456` menjadi PIN rahasia kamu sendiri dan klik **Simpan**.
3. **Tes Alur Lengkap di Domain Online**:
   - Buat 1 event dan salin link publik `/e/nama-event`.
   - Buka link `/e/nama-event` di HP (mode penyamaran/incognito) dan coba daftar menggunakan email pribadimu.
   - Pastikan E-Tiket QR Code masuk ke email dan fitur kamera **Scanner Hari-H** berjalan lancar di browser HP melalui koneksi HTTPS.


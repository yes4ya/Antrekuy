# Sistem Antrian Online (Antrekuy)

Aplikasi web manajemen antrian digital modern yang dirancang dengan prinsip **Utilitarian / Anti-Slop** (fungsional, bersih, responsif, tanpa dekorasi berlebihan) untuk kebutuhan operasional klinik, instansi, maupun layanan publik.

---

## Fitur Utama

1. **Jalur Akses Publik (Pelanggan)**
   - **Ambil Nomor Tiket:** Pendaftaran mandiri dengan memasukkan nama, memilih jenis layanan (*Umum, Administrasi, Keuangan, Akademik*), dan kategori (*Normal* atau *Prioritas*).
   - **Tiket Digital:** Menampilkan nomor antrian besar, estimasi waktu tunggu, dan sisa antrian.
   - **Cek Status Real-Time:** Pelanggan dapat melacak status tiket mereka secara langsung tanpa *refresh* halaman.

2. **Panel Petugas & Administrator**
   - **Autentikasi Berbasis Peran (RBAC):** Hak akses terpisah antara Admin dan Petugas Loket.
   - **Kontrol Panggilan:** Tombol untuk memanggil antrian berikutnya, mengubah status (*Menunggu → Dilayani → Selesai*), menghapus, atau mereset data.
   - **Integrasi Suara (TTS & Chime):** Otomatis membacakan nomor antrian dan loket tujuan menggunakan Web Speech API dan Audio Chime.

3. **Layar Display TV Ruang Tunggu**
   - Tampilan kontras tinggi (*Dark Mode*) yang dirancang khusus untuk layar TV 16:9 di ruang tunggu.
   - Menampilkan nomor yang sedang dipanggil secara mencolok beserta daftar 5 antrian berikutnya.

4. **Statistik & Laporan (Admin)**
   - Rekapitulasi jumlah tiket harian (Menunggu, Dilayani, Selesai).
   - Fitur **Export Laporan CSV** untuk keperluan arsip dan rekap Excel.

---

## Teknologi yang Digunakan

- **React 18** & **Vite** (Frontend Framework & Bundler)
- **CSS Murni (Custom Properties)** untuk desain bersih dan performa tinggi
- **LocalStorage & Storage Event** untuk sinkronisasi *real-time* antar tab browser tanpa backend server

---

## Cara Penggunaan & Instalasi

### 1. Prasyarat
Pastikan komputer Anda telah menginstal **Node.js** (versi 16 atau lebih baru).

### 2. Kloning / Unduh Repository
```bash
git clone https://github.com/yes4ya/Antrekuy.git
cd Antrekuy
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Menjalankan Mode Development
```bash
npm run dev
```
Buka browser dan akses: `http://localhost:5173`

### 5. Membangun untuk Produksi (Build)
```bash
npm run build
```

---

## Kredensial Login Petugas & Admin

Untuk masuk ke panel petugas/admin, gunakan akun berikut pada menu **Login Petugas**:

| Peran (Role) | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Akses penuh (Kontrol, Statistik, Reset, Export CSV) |
| **Petugas Loket 1** | `loket1` | `loket123` | Mengelola antrian khusus Loket 1 |
| **Petugas Loket 2** | `loket2` | `loket234` | Mengelola antrian khusus Loket 2 |
| **Petugas Loket 3** | `loket3` | `loket345` | Mengelola antrian khusus Loket 3 |

---

## Lisensi
MIT License

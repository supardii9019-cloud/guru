# 🏫 Sekolah Digital - School Management App

Aplikasi manajemen sekolah berbasis web mobile (PWA-ready) menggunakan React + Supabase.

## ✨ Fitur Lengkap

| No | Fitur | Keterangan |
|----|-------|------------|
| 1 | 🔐 Login/Logout | Auth via Supabase |
| 2 | 🏠 Dashboard | Semua menu utama |
| 3 | 📋 Absensi Kelas | Input & rekap absensi siswa |
| 4 | 📓 Jurnal Mengajar | CRUD jurnal lengkap |
| 5 | 📊 Penilaian | Multi jenis nilai + KKM |
| 6 | 👨‍🎓 Data Siswa | CRUD + filter kelas |
| 7 | 🏫 Data Kelas | CRUD kelas |
| 8 | ☁️ Materi | Upload & kelola materi |
| 9 | 📄 Raport | Generate otomatis + print |
| 10 | ⚠️ Pelanggaran | Sistem poin pelanggaran |
| 11 | 🗂️ Absensi Pegawai | Jam masuk/keluar |
| 12 | ✅ Izin Pegawai | Approval sistem |
| 13 | 🗓️ Jadwal Piket | Per hari |
| 14 | 📝 Ujian Online | Soal pilihan ganda |
| 15 | 👨‍👩‍👧 Jurnal Wali Kelas | Jurnal khusus wali kelas |
| 16 | 📚 Modul Pembelajaran | Upload modul |
| 17 | 🏗️ Struktur Kelas | Organisasi kelas |
| 18 | 👤 Profil | Edit profil guru |
| 19 | 🚀 Auto Deploy | GitHub Actions |

## 🚀 Setup Cepat

### 1. Clone & Install

```bash
git clone https://github.com/USERNAME/school-management.git
cd school-management
npm install
```

### 2. Setup Supabase

1. Buka [supabase.com](https://supabase.com) dan buat project baru
2. Buka **SQL Editor** dan jalankan isi file `supabase-setup.sql`
3. Di **Authentication > Settings**, pastikan Email Auth aktif
4. Copy **Project URL** dan **anon key** dari Settings > API

### 3. Konfigurasi Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Jalankan Lokal

```bash
npm run dev
# Buka http://localhost:5173/school-management
```

### 5. Buat Akun Admin

Di Supabase **Authentication > Users**, klik **Add User**:
- Email: `admin@sekolah.com`
- Password: `Admin123!`

Lalu di **SQL Editor** jalankan:
```sql
INSERT INTO pegawai (email, nama, role, jabatan)
VALUES ('admin@sekolah.com', 'Administrator', 'admin', 'Kepala Sekolah');
```

### 6. Deploy ke GitHub Pages

```bash
# Push ke GitHub
git add .
git commit -m "Initial commit"
git push origin main

# Di GitHub Repo:
# Settings > Secrets > Actions > Tambahkan:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY

# Settings > Pages > Source: gh-pages branch
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Routing**: React Router v6
- **Toast**: React Hot Toast
- **Deploy**: GitHub Pages + GitHub Actions

## 📁 Struktur Project

```
src/
├── components/        # Komponen reusable
│   ├── Layout.jsx
│   ├── Modal.jsx
│   └── LoadingSpinner.jsx
├── context/
│   └── AuthContext.jsx
├── lib/
│   └── supabase.js
└── pages/             # Semua halaman
    ├── Login.jsx
    ├── Dashboard.jsx
    ├── AbsensiKelas.jsx
    ├── Jurnal.jsx
    ├── Penilaian.jsx
    ├── Siswa.jsx
    ├── Kelas.jsx
    ├── Materi.jsx
    ├── Raport.jsx
    ├── PelanggaranSiswa.jsx
    ├── AbsensiPegawai.jsx
    ├── JurnalWali.jsx
    ├── ModulPembelajaran.jsx
    ├── StrukturKelas.jsx
    ├── JadwalPiket.jsx
    ├── UjianOnline.jsx
    ├── IzinPegawai.jsx
    └── Profil.jsx
```

## 📱 Mobile First

Aplikasi didesain mobile-first dengan max-width 430px, cocok untuk digunakan di smartphone.

---

© 2024 Sekolah Digital

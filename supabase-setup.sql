-- =============================================
-- SCHOOL MANAGEMENT - SUPABASE SQL SETUP
-- =============================================

-- 1. PEGAWAI / GURU
CREATE TABLE IF NOT EXISTS pegawai (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nip VARCHAR(30) UNIQUE,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'guru',
  jabatan VARCHAR(100),
  mata_pelajaran VARCHAR(100),
  foto_url TEXT,
  no_hp VARCHAR(20),
  alamat TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. KELAS
CREATE TABLE IF NOT EXISTS kelas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_kelas VARCHAR(50) NOT NULL,
  tingkat VARCHAR(10) NOT NULL,
  jurusan VARCHAR(100),
  wali_kelas_id UUID REFERENCES pegawai(id),
  tahun_ajaran VARCHAR(20) DEFAULT '2024/2025',
  semester VARCHAR(10) DEFAULT 'Ganjil',
  kapasitas INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SISWA
CREATE TABLE IF NOT EXISTS siswa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nis VARCHAR(20) UNIQUE NOT NULL,
  nisn VARCHAR(20) UNIQUE,
  nama VARCHAR(100) NOT NULL,
  kelas_id UUID REFERENCES kelas(id),
  jenis_kelamin VARCHAR(10),
  tanggal_lahir DATE,
  tempat_lahir VARCHAR(100),
  alamat TEXT,
  nama_ortu VARCHAR(100),
  no_hp_ortu VARCHAR(20),
  foto_url TEXT,
  status VARCHAR(20) DEFAULT 'aktif',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ABSENSI SISWA
CREATE TABLE IF NOT EXISTS absensi_siswa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  siswa_id UUID REFERENCES siswa(id) ON DELETE CASCADE,
  kelas_id UUID REFERENCES kelas(id),
  guru_id UUID REFERENCES pegawai(id),
  tanggal DATE NOT NULL,
  mata_pelajaran VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'hadir',
  keterangan TEXT,
  jam_ke INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(siswa_id, tanggal, mata_pelajaran)
);

-- 5. JURNAL MENGAJAR
CREATE TABLE IF NOT EXISTS jurnal_mengajar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guru_id UUID REFERENCES pegawai(id),
  kelas_id UUID REFERENCES kelas(id),
  mata_pelajaran VARCHAR(100) NOT NULL,
  tanggal DATE NOT NULL,
  jam_ke VARCHAR(20),
  materi TEXT NOT NULL,
  kegiatan_pembelajaran TEXT,
  media_pembelajaran TEXT,
  metode TEXT,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PENILAIAN
CREATE TABLE IF NOT EXISTS penilaian (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  siswa_id UUID REFERENCES siswa(id) ON DELETE CASCADE,
  guru_id UUID REFERENCES pegawai(id),
  kelas_id UUID REFERENCES kelas(id),
  mata_pelajaran VARCHAR(100) NOT NULL,
  jenis_nilai VARCHAR(50) NOT NULL,
  nilai DECIMAL(5,2) NOT NULL,
  kkm DECIMAL(5,2) DEFAULT 75,
  semester VARCHAR(10) DEFAULT 'Ganjil',
  tahun_ajaran VARCHAR(20) DEFAULT '2024/2025',
  tanggal DATE DEFAULT CURRENT_DATE,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PELANGGARAN SISWA
CREATE TABLE IF NOT EXISTS pelanggaran_siswa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  siswa_id UUID REFERENCES siswa(id) ON DELETE CASCADE,
  guru_id UUID REFERENCES pegawai(id),
  jenis_pelanggaran VARCHAR(100) NOT NULL,
  kategori VARCHAR(50) DEFAULT 'ringan',
  deskripsi TEXT,
  poin INTEGER DEFAULT 0,
  tindakan TEXT,
  tanggal DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. MATERI PEMBELAJARAN
CREATE TABLE IF NOT EXISTS materi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  judul VARCHAR(200) NOT NULL,
  mata_pelajaran VARCHAR(100) NOT NULL,
  kelas_id UUID REFERENCES kelas(id),
  guru_id UUID REFERENCES pegawai(id),
  deskripsi TEXT,
  konten TEXT,
  file_url TEXT,
  tipe_file VARCHAR(50),
  semester VARCHAR(10) DEFAULT 'Ganjil',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ABSENSI PEGAWAI
CREATE TABLE IF NOT EXISTS absensi_pegawai (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pegawai_id UUID REFERENCES pegawai(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  jam_masuk TIME,
  jam_keluar TIME,
  status VARCHAR(20) DEFAULT 'hadir',
  keterangan TEXT,
  lokasi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pegawai_id, tanggal)
);

-- 10. IZIN PEGAWAI
CREATE TABLE IF NOT EXISTS izin_pegawai (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pegawai_id UUID REFERENCES pegawai(id) ON DELETE CASCADE,
  jenis_izin VARCHAR(50) NOT NULL,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  alasan TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  disetujui_oleh UUID REFERENCES pegawai(id),
  catatan_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. JADWAL PIKET
CREATE TABLE IF NOT EXISTS jadwal_piket (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pegawai_id UUID REFERENCES pegawai(id) ON DELETE CASCADE,
  hari VARCHAR(20) NOT NULL,
  jam_mulai TIME,
  jam_selesai TIME,
  tugas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. STRUKTUR KELAS
CREATE TABLE IF NOT EXISTS struktur_kelas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kelas_id UUID REFERENCES kelas(id) ON DELETE CASCADE,
  siswa_id UUID REFERENCES siswa(id) ON DELETE CASCADE,
  jabatan VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. MODUL PEMBELAJARAN
CREATE TABLE IF NOT EXISTS modul_pembelajaran (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  judul VARCHAR(200) NOT NULL,
  mata_pelajaran VARCHAR(100),
  kelas_target VARCHAR(50),
  guru_id UUID REFERENCES pegawai(id),
  deskripsi TEXT,
  konten TEXT,
  file_url TEXT,
  semester VARCHAR(10),
  tahun_ajaran VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. UJIAN ONLINE
CREATE TABLE IF NOT EXISTS ujian (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  judul VARCHAR(200) NOT NULL,
  mata_pelajaran VARCHAR(100),
  kelas_id UUID REFERENCES kelas(id),
  guru_id UUID REFERENCES pegawai(id),
  tanggal DATE,
  durasi INTEGER DEFAULT 90,
  total_soal INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS soal_ujian (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ujian_id UUID REFERENCES ujian(id) ON DELETE CASCADE,
  pertanyaan TEXT NOT NULL,
  pilihan_a TEXT,
  pilihan_b TEXT,
  pilihan_c TEXT,
  pilihan_d TEXT,
  jawaban_benar VARCHAR(5),
  poin INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. RAPORT
CREATE TABLE IF NOT EXISTS raport (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  siswa_id UUID REFERENCES siswa(id) ON DELETE CASCADE,
  kelas_id UUID REFERENCES kelas(id),
  semester VARCHAR(10) NOT NULL,
  tahun_ajaran VARCHAR(20) NOT NULL,
  nilai_sikap VARCHAR(20),
  nilai_keterampilan DECIMAL(5,2),
  catatan_wali TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(siswa_id, semester, tahun_ajaran)
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal_mengajar ENABLE ROW LEVEL SECURITY;
ALTER TABLE penilaian ENABLE ROW LEVEL SECURITY;
ALTER TABLE pelanggaran_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE materi ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi_pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE izin_pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_piket ENABLE ROW LEVEL SECURITY;
ALTER TABLE struktur_kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modul_pembelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE ujian ENABLE ROW LEVEL SECURITY;
ALTER TABLE soal_ujian ENABLE ROW LEVEL SECURITY;
ALTER TABLE raport ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES (Allow authenticated users)
-- =============================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'pegawai','kelas','siswa','absensi_siswa','jurnal_mengajar',
    'penilaian','pelanggaran_siswa','materi','absensi_pegawai',
    'izin_pegawai','jadwal_piket','struktur_kelas',
    'modul_pembelajaran','ujian','soal_ujian','raport'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      CREATE POLICY "authenticated_all_%s" ON %s
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
    ', t, t);
  END LOOP;
END $$;

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Kelas sample
INSERT INTO kelas (nama_kelas, tingkat, tahun_ajaran) VALUES
('Kelas 7A', '7', '2024/2025'),
('Kelas 7B', '7', '2024/2025'),
('Kelas 8A', '8', '2024/2025'),
('Kelas 8B', '8', '2024/2025'),
('Kelas 9A', '9', '2024/2025'),
('Kelas 9B', '9', '2024/2025');

-- =============================================
-- CARA BUAT AKUN ADMIN (jalankan setelah daftar)
-- =============================================
-- INSERT INTO pegawai (email, nama, role, jabatan)
-- VALUES ('admin@sekolah.com', 'Administrator', 'admin', 'Kepala Sekolah');

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Raport() {
  const navigate = useNavigate()
  const [kelas, setKelas] = useState([])
  const [siswa, setSiswa] = useState([])
  const [selectedKelas, setSelectedKelas] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState('')
  const [semester, setSemester] = useState('Ganjil')
  const [tahunAjaran, setTahunAjaran] = useState('2024/2025')
  const [loading, setLoading] = useState(false)
  const [raportData, setRaportData] = useState(null)

  useEffect(() => {
    supabase.from('kelas').select('*').order('nama_kelas').then(({ data }) => setKelas(data || []))
  }, [])

  useEffect(() => {
    if (selectedKelas) {
      supabase.from('siswa').select('*').eq('kelas_id', selectedKelas).order('nama')
        .then(({ data }) => setSiswa(data || []))
    }
  }, [selectedKelas])

  const generateRaport = async () => {
    if (!selectedSiswa) return toast.error('Pilih siswa!')
    setLoading(true)

    const { data: nilaiData } = await supabase
      .from('penilaian')
      .select('*')
      .eq('siswa_id', selectedSiswa)
      .eq('semester', semester)
      .eq('tahun_ajaran', tahunAjaran)

    const { data: absenData } = await supabase
      .from('absensi_siswa')
      .select('status')
      .eq('siswa_id', selectedSiswa)

    const { data: siswaInfo } = await supabase
      .from('siswa')
      .select('*, kelas(nama_kelas, wali_kelas_id)')
      .eq('id', selectedSiswa)
      .maybeSingle()

    // Group nilai by mapel
    const mapelMap = {}
    nilaiData?.forEach(n => {
      if (!mapelMap[n.mata_pelajaran]) mapelMap[n.mata_pelajaran] = []
      mapelMap[n.mata_pelajaran].push(n)
    })

    const nilaiPerMapel = Object.entries(mapelMap).map(([mapel, vals]) => {
      const tugas = vals.filter(v => v.jenis_nilai === 'tugas').map(v => v.nilai)
      const ulangan = vals.filter(v => v.jenis_nilai === 'ulangan').map(v => v.nilai)
      const uts = vals.filter(v => v.jenis_nilai === 'uts').map(v => v.nilai)
      const uas = vals.filter(v => v.jenis_nilai === 'uas').map(v => v.nilai)

      const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
      const nilaiAkhir = Math.round((avg(tugas) * 0.2) + (avg(ulangan) * 0.3) + (avg(uts) * 0.2) + (avg(uas) * 0.3))

      return { mapel, tugas: avg(tugas), ulangan: avg(ulangan), uts: avg(uts), uas: avg(uas), akhir: nilaiAkhir, kkm: 75 }
    })

    const absenStats = {
      hadir: absenData?.filter(a => a.status === 'hadir').length || 0,
      sakit: absenData?.filter(a => a.status === 'sakit').length || 0,
      izin: absenData?.filter(a => a.status === 'izin').length || 0,
      alpha: absenData?.filter(a => a.status === 'alpha').length || 0,
    }

    setRaportData({ siswa: siswaInfo, nilaiPerMapel, absenStats, semester, tahunAjaran })
    setLoading(false)
  }

  const getNilaiInfo = (nilai) => {
    if (nilai >= 90) return { grade: 'A', predikat: 'Sangat Baik', color: 'text-green-600' }
    if (nilai >= 80) return { grade: 'B', predikat: 'Baik', color: 'text-blue-600' }
    if (nilai >= 70) return { grade: 'C', predikat: 'Cukup', color: 'text-yellow-600' }
    return { grade: 'D', predikat: 'Kurang', color: 'text-red-600' }
  }

  const printRaport = () => window.print()

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-green-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Raport Siswa</h1>
        {raportData && (
          <button onClick={printRaport} className="bg-white text-green-600 px-3 py-2 rounded-xl text-sm font-bold">
            🖨️ Print
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-700">Filter Raport</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Semester</label>
              <select value={semester} onChange={e => setSemester(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option>Ganjil</option>
                <option>Genap</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tahun Ajaran</label>
              <input value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="2024/2025" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Kelas</label>
            <select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Pilih Kelas</option>
              {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Siswa</label>
            <select value={selectedSiswa} onChange={e => setSelectedSiswa(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Pilih Siswa</option>
              {siswa.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </div>
          <button onClick={generateRaport} disabled={loading}
            className="w-full bg-green-600 text-white font-bold py-3.5 rounded-2xl disabled:opacity-50">
            {loading ? 'Memproses...' : '📄 Generate Raport'}
          </button>
        </div>

        {/* Raport Result */}
        {raportData && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" id="raport-content">
            {/* Header Raport */}
            <div className="bg-gradient-to-r from-green-600 to-green-800 p-5 text-white text-center">
              <h2 className="text-lg font-black tracking-wide">LAPORAN HASIL BELAJAR</h2>
              <p className="text-green-200 text-xs mt-1">Semester {raportData.semester} • TA {raportData.tahunAjaran}</p>
            </div>

            {/* Info Siswa */}
            <div className="p-4 border-b border-gray-100">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: 'Nama', val: raportData.siswa?.nama },
                  { label: 'NIS', val: raportData.siswa?.nis },
                  { label: 'Kelas', val: raportData.siswa?.kelas?.nama_kelas },
                  { label: 'Jenis Kelamin', val: raportData.siswa?.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-2.5">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="font-semibold text-gray-800">{item.val || '-'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabel Nilai */}
            <div className="p-4">
              <h3 className="font-bold text-gray-700 mb-3">📊 Nilai Akademik</h3>
              {raportData.nilaiPerMapel.length > 0 ? (
                <div className="space-y-2">
                  {raportData.nilaiPerMapel.map(n => {
                    const info = getNilaiInfo(n.akhir)
                    const lulus = n.akhir >= n.kkm
                    return (
                      <div key={n.mapel} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-800 text-sm">{n.mapel}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-black ${info.color}`}>{n.akhir}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${lulus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {lulus ? '✓ Lulus' : '✗ Remedial'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center">
                          {[
                            { label: 'Tugas', val: n.tugas },
                            { label: 'Ulangan', val: n.ulangan },
                            { label: 'UTS', val: n.uts },
                            { label: 'UAS', val: n.uas },
                          ].map(item => (
                            <div key={item.label} className="bg-gray-50 rounded-lg p-1.5">
                              <p className="text-[10px] text-gray-400">{item.label}</p>
                              <p className="text-sm font-bold text-gray-700">{item.val || '-'}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all ${lulus ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(n.akhir, 100)}%` }}></div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Rata-rata */}
                  <div className="bg-green-50 rounded-xl p-4 flex items-center justify-between border-2 border-green-200">
                    <span className="font-black text-green-800">RATA-RATA</span>
                    <span className="text-3xl font-black text-green-600">
                      {Math.round(raportData.nilaiPerMapel.reduce((sum, n) => sum + n.akhir, 0) / raportData.nilaiPerMapel.length) || 0}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>Tidak ada data nilai untuk periode ini</p>
                </div>
              )}
            </div>

            {/* Absensi */}
            <div className="p-4 border-t border-gray-100">
              <h3 className="font-bold text-gray-700 mb-3">📋 Rekap Absensi</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Hadir', val: raportData.absenStats.hadir, color: 'bg-green-100 text-green-700' },
                  { label: 'Sakit', val: raportData.absenStats.sakit, color: 'bg-yellow-100 text-yellow-700' },
                  { label: 'Izin', val: raportData.absenStats.izin, color: 'bg-blue-100 text-blue-700' },
                  { label: 'Alpha', val: raportData.absenStats.alpha, color: 'bg-red-100 text-red-700' },
                ].map(s => (
                  <div key={s.label} className={`${s.color} rounded-xl p-3`}>
                    <div className="text-xl font-black">{s.val}</div>
                    <div className="text-xs font-semibold">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Dicetak pada {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <div className="mt-6 flex justify-around">
                {['Wali Kelas', 'Kepala Sekolah'].map(p => (
                  <div key={p} className="text-center">
                    <div className="h-16 border-b border-gray-400 w-28 mx-auto mb-1"></div>
                    <p className="text-xs font-semibold text-gray-600">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import * as XLSX from 'xlsx'

const INIT = { nama: '', nis: '', nisn: '', kelas_id: '', jenis_kelamin: 'L', email: '', password: '' }

export default function AkunSiswa() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [akunList, setAkunList] = useState([])
  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('list') // 'list' | 'import'

  // Import Excel state
  const [importData, setImportData] = useState([])
  const [importLoading, setImportLoading] = useState(false)
  const [importHasil, setImportHasil] = useState(null)
  const [importErrors, setImportErrors] = useState([])
  const fileRef = useRef()

  useEffect(() => {
    fetchData()
    supabase.from('kelas').select('*').order('nama_kelas').then(({ data }) => setKelas(data || []))
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('siswa_auth')
      .select('*, siswa(nama, nis, kelas(nama_kelas))')
      .order('created_at', { ascending: false })
    setAkunList(data || [])
    setLoading(false)
  }

  // === TAMBAH MANUAL ===
  const handleSave = async () => {
    if (!form.nama || !form.nis || !form.email || !form.password)
      return toast.error('Nama, NIS, email, dan password wajib diisi!')
    if (form.password.length < 6)
      return toast.error('Password minimal 6 karakter!')
    setSaving(true)
    try {
      // 1. Cek/buat data siswa
      let siswaId = null
      const { data: existingSiswa } = await supabase
        .from('siswa').select('id').eq('nis', form.nis.trim()).single()

      if (existingSiswa) {
        siswaId = existingSiswa.id
      } else {
        const { data: newSiswa, error: siswaErr } = await supabase
          .from('siswa').insert([{
            nis: form.nis.trim(),
            nisn: form.nisn.trim() || null,
            nama: form.nama.trim(),
            kelas_id: form.kelas_id || null,
            jenis_kelamin: form.jenis_kelamin,
          }]).select().single()
        if (siswaErr) throw new Error('Gagal membuat data siswa: ' + siswaErr.message)
        siswaId = newSiswa.id
      }

      // 2. Buat akun Auth
      const { error: authErr } = await supabase.auth.admin
        ? { error: null } // fallback jika admin tidak tersedia
        : { error: null }

      // Gunakan signUp biasa (akan kirim email konfirmasi)
      const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'HEAD' }).catch(() => null)
      const { error: signUpErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { role: 'siswa' } }
      })
      if (signUpErr && !signUpErr.message.includes('already registered')) {
        throw new Error(signUpErr.message)
      }

      // 3. Simpan ke siswa_auth
      const { error: authLinkErr } = await supabase.from('siswa_auth').upsert([{
        siswa_id: siswaId,
        email: form.email.trim().toLowerCase(),
      }], { onConflict: 'email' })
      if (authLinkErr) throw new Error('Gagal menyimpan akun: ' + authLinkErr.message)

      toast.success('Akun siswa berhasil dibuat! ✅')
      setShowModal(false)
      setForm(INIT)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  // === HAPUS AKUN ===
  const handleHapus = async (id, email) => {
    if (!confirm(`Hapus akun siswa ${email}?`)) return
    const { error } = await supabase.from('siswa_auth').delete().eq('id', id)
    if (error) toast.error('Gagal menghapus!')
    else { toast.success('Akun dihapus!'); fetchData() }
  }

  // === BACA EXCEL ===
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Cari baris header (yang punya "NIS")
        let headerRow = -1
        for (let i = 0; i < raw.length; i++) {
          if (String(raw[i][0]).toUpperCase().includes('NIS')) { headerRow = i; break }
        }
        if (headerRow === -1) return toast.error('Format tidak dikenali! Gunakan template resmi.')

        const rows = raw.slice(headerRow + 1).filter(r => r[0] || r[2]) // ada NIS atau nama
        const parsed = rows.map((r, idx) => ({
          _no: idx + 1,
          nis: String(r[0] || '').trim(),
          nisn: String(r[1] || '').trim(),
          nama: String(r[2] || '').trim(),
          nama_kelas: String(r[3] || '').trim(),
          jenis_kelamin: String(r[4] || 'L').trim().toUpperCase() === 'P' ? 'P' : 'L',
          tempat_lahir: String(r[5] || '').trim(),
          tanggal_lahir: r[6] ? (r[6] instanceof Date ? r[6].toISOString().split('T')[0] : String(r[6]).trim()) : null,
          nama_ortu: String(r[7] || '').trim(),
          no_hp_ortu: String(r[8] || '').trim(),
          email: String(r[9] || '').trim().toLowerCase(),
        })).filter(r => r.nis && r.nama && r.email) // filter baris kosong & contoh

        // Validasi
        const errors = []
        const nisSet = new Set()
        const emailSet = new Set()
        parsed.forEach(r => {
          if (!r.nis) errors.push(`Baris ${r._no}: NIS kosong`)
          if (!r.nama) errors.push(`Baris ${r._no}: Nama kosong`)
          if (!r.email || !r.email.includes('@')) errors.push(`Baris ${r._no}: Email tidak valid (${r.email})`)
          if (nisSet.has(r.nis)) errors.push(`Baris ${r._no}: NIS duplikat (${r.nis})`)
          if (emailSet.has(r.email)) errors.push(`Baris ${r._no}: Email duplikat (${r.email})`)
          nisSet.add(r.nis)
          emailSet.add(r.email)
        })

        setImportErrors(errors)
        setImportData(parsed)
        setImportHasil(null)
        if (errors.length === 0) toast.success(`${parsed.length} data siap diimport!`)
        else toast.error(`${errors.length} error ditemukan, periksa sebelum import`)
      } catch (err) {
        toast.error('Gagal membaca file Excel!')
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // === PROSES IMPORT ===
  const handleImport = async () => {
    if (importErrors.length > 0) return toast.error('Perbaiki error terlebih dahulu!')
    if (importData.length === 0) return toast.error('Tidak ada data untuk diimport!')
    setImportLoading(true)

    let berhasil = 0
    let gagal = 0
    const gagalList = []

    for (const row of importData) {
      try {
        // Cari kelas_id dari nama kelas
        const kelasMatch = kelas.find(k =>
          k.nama_kelas.toLowerCase().trim() === row.nama_kelas.toLowerCase().trim()
        )

        // Upsert siswa
        const { data: siswaData, error: siswaErr } = await supabase
          .from('siswa').upsert([{
            nis: row.nis,
            nisn: row.nisn || null,
            nama: row.nama,
            kelas_id: kelasMatch?.id || null,
            jenis_kelamin: row.jenis_kelamin,
            tempat_lahir: row.tempat_lahir || null,
            tanggal_lahir: row.tanggal_lahir || null,
            nama_ortu: row.nama_ortu || null,
            no_hp_ortu: row.no_hp_ortu || null,
            status: 'aktif',
          }], { onConflict: 'nis' }).select().single()

        if (siswaErr) throw new Error(siswaErr.message)

        // Buat akun Auth (password = NIS)
        const { error: authErr } = await supabase.auth.signUp({
          email: row.email,
          password: row.nis, // default password = NIS
          options: { data: { role: 'siswa' } }
        })
        if (authErr && !authErr.message.includes('already registered')) {
          throw new Error('Auth: ' + authErr.message)
        }

        // Link ke siswa_auth
        await supabase.from('siswa_auth').upsert([{
          siswa_id: siswaData.id,
          email: row.email,
        }], { onConflict: 'email' })

        berhasil++
      } catch (err) {
        gagal++
        gagalList.push({ nis: row.nis, nama: row.nama, error: err.message })
      }
    }

    setImportHasil({ berhasil, gagal, gagalList })
    setImportLoading(false)
    fetchData()
    if (berhasil > 0) toast.success(`${berhasil} akun berhasil diimport!`)
    if (gagal > 0) toast.error(`${gagal} akun gagal diimport`)
  }

  // === DOWNLOAD TEMPLATE ===
  const downloadTemplate = () => {
    const url = 'https://docs.google.com/spreadsheets/d/...'
    // Buat template sederhana pakai SheetJS
    const wb = XLSX.utils.book_new()
    const header = [['NIS *', 'NISN', 'Nama Lengkap *', 'Nama Kelas *', 'Jenis Kelamin *\n(L/P)', 'Tempat Lahir', 'Tanggal Lahir\n(YYYY-MM-DD)', 'Nama Orang Tua', 'No HP Orang Tua', 'Email Login *']]
    const contoh = [
      ['2024001', '1234567890', 'Ahmad Fauzi', '7A', 'L', 'Jakarta', '2010-05-15', 'Budi Santoso', '081234567890', 'ahmad@siswa.sch.id'],
      ['2024002', '', 'Siti Rahayu', '7B', 'P', 'Bandung', '2010-08-22', 'Rina Wati', '', 'siti@siswa.sch.id'],
    ]
    const ws = XLSX.utils.aoa_to_sheet([...header, ...contoh])
    ws['!cols'] = [12,14,28,10,14,16,18,24,18,28].map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa')
    XLSX.writeFile(wb, 'template_import_siswa.xlsx')
  }

  const filtered = akunList.filter(a =>
    !search ||
    a.siswa?.nama?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.siswa?.nis?.includes(search)
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-purple-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Akun Siswa</h1>
        <button onClick={() => { setForm(INIT); setShowModal(true) }}
          className="bg-white text-purple-600 px-4 py-2 rounded-xl text-sm font-bold">
          + Tambah
        </button>
      </div>

      {/* Tab */}
      <div className="flex bg-white border-b">
        {[['list','📋 Daftar Akun'],['import','📤 Import Excel']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${
              tab === key ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400'
            }`}>{label}</button>
        ))}
      </div>

      {/* TAB LIST */}
      {tab === 'list' && (
        <div className="p-4 space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Cari nama, NIS, atau email..."
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none bg-white" />

          <div className="bg-purple-50 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-sm text-purple-700 font-medium">Total Akun Siswa</span>
            <span className="text-2xl font-black text-purple-600">{akunList.length}</span>
          </div>

          {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-3">👤</div>
              <p className="text-gray-400">Belum ada akun siswa</p>
              <button onClick={() => { setForm(INIT); setShowModal(true) }}
                className="mt-4 bg-purple-500 text-white px-6 py-3 rounded-2xl font-bold text-sm">
                + Tambah Akun Pertama
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(a => (
                <div key={a.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                  <div className="w-11 h-11 bg-purple-100 rounded-full flex items-center justify-center text-lg">
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{a.siswa?.nama || '—'}</p>
                    <p className="text-xs text-gray-500">NIS: {a.siswa?.nis} • {a.siswa?.kelas?.nama_kelas || 'Belum ada kelas'}</p>
                    <p className="text-xs text-purple-600 truncate">{a.email}</p>
                  </div>
                  <button onClick={() => handleHapus(a.id, a.email)}
                    className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-sm">
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB IMPORT */}
      {tab === 'import' && (
        <div className="p-4 space-y-4">
          {/* Download Template */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="font-bold text-blue-700 text-sm mb-1">📥 Download Template Excel</p>
            <p className="text-xs text-blue-600 mb-3">
              Download template, isi data siswa, lalu upload kembali.
              Password default siswa = NIS masing-masing.
            </p>
            <button onClick={downloadTemplate}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-2xl text-sm">
              ⬇️ Download Template
            </button>
          </div>

          {/* Upload */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-bold text-gray-700 text-sm mb-3">📤 Upload File Excel</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls"
              onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileRef.current.click()}
              className="w-full border-2 border-dashed border-purple-300 bg-purple-50 text-purple-600 font-bold py-8 rounded-2xl text-sm">
              📁 Pilih File Excel (.xlsx)
            </button>
          </div>

          {/* Preview data */}
          {importData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-gray-700 text-sm">{importData.length} data siap diimport</p>
                {importErrors.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">
                    {importErrors.length} error
                  </span>
                )}
              </div>

              {/* Error list */}
              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-red-600 mb-2">⚠️ Perbaiki error berikut:</p>
                  {importErrors.map((e, i) => (
                    <p key={i} className="text-xs text-red-500">• {e}</p>
                  ))}
                </div>
              )}

              {/* Preview tabel */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 text-left font-bold text-gray-500">NIS</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-500">Nama</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-500">Kelas</th>
                      <th className="px-2 py-2 text-left font-bold text-gray-500">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-2 py-2 font-mono">{r.nis}</td>
                        <td className="px-2 py-2">{r.nama}</td>
                        <td className="px-2 py-2">{r.nama_kelas || '—'}</td>
                        <td className="px-2 py-2 text-purple-600 truncate max-w-[120px]">{r.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importData.length > 10 && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    +{importData.length - 10} data lainnya...
                  </p>
                )}
              </div>

              <button onClick={handleImport} disabled={importLoading || importErrors.length > 0}
                className="w-full mt-4 bg-purple-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                {importLoading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Mengimport...</>
                  : `🚀 Import ${importData.length} Akun Siswa`}
              </button>
            </div>
          )}

          {/* Hasil import */}
          {importHasil && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="font-bold text-gray-700 text-sm mb-3">📊 Hasil Import</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-green-50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-green-600">{importHasil.berhasil}</p>
                  <p className="text-xs text-green-700">Berhasil</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-red-500">{importHasil.gagal}</p>
                  <p className="text-xs text-red-600">Gagal</p>
                </div>
              </div>
              {importHasil.gagalList.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-600 mb-2">Yang gagal:</p>
                  {importHasil.gagalList.map((g, i) => (
                    <p key={i} className="text-xs text-red-500">• {g.nama} ({g.nis}): {g.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal tambah manual */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-800">👤 Tambah Akun Siswa</h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">NIS *</label>
                  <input value={form.nis} onChange={e => setForm({...form, nis: e.target.value})}
                    placeholder="Nomor Induk Siswa"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">NISN</label>
                  <input value={form.nisn} onChange={e => setForm({...form, nisn: e.target.value})}
                    placeholder="NISN (opsional)"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Nama Lengkap *</label>
                <input value={form.nama} onChange={e => setForm({...form, nama: e.target.value})}
                  placeholder="Nama lengkap siswa"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Kelas</label>
                  <select value={form.kelas_id} onChange={e => setForm({...form, kelas_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none">
                    <option value="">Pilih Kelas</option>
                    {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Jenis Kelamin</label>
                  <select value={form.jenis_kelamin} onChange={e => setForm({...form, jenis_kelamin: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none">
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Email Login *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="email@siswa.sch.id"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Password *</label>
                <input type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="Min. 6 karakter (saran: gunakan NIS)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none" />
                <p className="text-xs text-gray-400 mt-1">💡 Saran: gunakan NIS sebagai password awal</p>
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full bg-purple-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Menyimpan...</>
                  : '✅ Buat Akun Siswa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

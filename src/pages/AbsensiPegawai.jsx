import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AbsensiPegawai() {
  const navigate = useNavigate()
  const { pegawai } = useAuth()
  const [pegawaiList, setPegawaiList] = useState([])
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [absenMap, setAbsenMap] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchPegawai() }, [])
  useEffect(() => { if (pegawaiList.length > 0) fetchAbsensi() }, [tanggal, pegawaiList])

  const fetchPegawai = async () => {
    const { data } = await supabase.from('pegawai').select('*').order('nama')
    setPegawaiList(data || [])
  }

  const fetchAbsensi = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('absensi_pegawai')
      .select('*')
      .eq('tanggal', tanggal)

    const map = {}
    pegawaiList.forEach(p => {
      const existing = data?.find(d => d.pegawai_id === p.id)
      map[p.id] = existing
        ? { status: existing.status, jam_masuk: existing.jam_masuk, jam_keluar: existing.jam_keluar }
        : { status: 'hadir', jam_masuk: '07:00', jam_keluar: '14:00' }
    })
    setAbsenMap(map)
    setLoading(false)
  }

  const handleSimpan = async () => {
    setSaving(true)
    const records = pegawaiList.map(p => ({
      pegawai_id: p.id,
      tanggal,
      status: absenMap[p.id]?.status || 'hadir',
      jam_masuk: absenMap[p.id]?.jam_masuk || null,
      jam_keluar: absenMap[p.id]?.jam_keluar || null,
    }))

    const { error } = await supabase
      .from('absensi_pegawai')
      .upsert(records, { onConflict: 'pegawai_id,tanggal' })

    if (error) {
      toast.error('Gagal menyimpan!')
    } else {
      toast.success('Absensi pegawai berhasil disimpan! ✅')
    }
    setSaving(false)
  }

  const updateStatus = (id, status) => {
    setAbsenMap(prev => ({ ...prev, [id]: { ...prev[id], status } }))
  }

  const STATUS_COLOR = {
    hadir: 'bg-green-500 text-white',
    sakit: 'bg-yellow-500 text-white',
    izin: 'bg-blue-500 text-white',
    alpha: 'bg-red-500 text-white',
  }

  const stats = {
    hadir: Object.values(absenMap).filter(a => a.status === 'hadir').length,
    sakit: Object.values(absenMap).filter(a => a.status === 'sakit').length,
    izin: Object.values(absenMap).filter(a => a.status === 'izin').length,
    alpha: Object.values(absenMap).filter(a => a.status === 'alpha').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-slate-700 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold flex-1">Absensi Pegawai</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Tanggal */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-semibold text-gray-500 block mb-1">📅 Tanggal</label>
          <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>

        {/* Stats */}
        {pegawaiList.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'hadir', emoji: '✅', color: 'from-green-400 to-green-600' },
              { key: 'sakit', emoji: '🤒', color: 'from-yellow-400 to-yellow-600' },
              { key: 'izin', emoji: '📝', color: 'from-blue-400 to-blue-600' },
              { key: 'alpha', emoji: '❌', color: 'from-red-400 to-red-600' },
            ].map(s => (
              <div key={s.key} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-3 text-center`}>
                <div>{s.emoji}</div>
                <div className="text-xl font-black">{stats[s.key]}</div>
                <div className="text-[10px] capitalize font-semibold">{s.key}</div>
              </div>
            ))}
          </div>
        )}

        {/* List Pegawai */}
        {loading ? <LoadingSpinner /> : (
          <div className="space-y-2">
            {pegawaiList.map((p, i) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-600">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{p.nama}</p>
                    <p className="text-xs text-gray-400 capitalize">{p.role || 'Guru'}{p.jabatan ? ` • ${p.jabatan}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLOR[absenMap[p.id]?.status] || 'bg-gray-100 text-gray-500'}`}>
                    {absenMap[p.id]?.status || 'hadir'}
                  </span>
                </div>

                {/* Status Buttons */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {['hadir', 'sakit', 'izin', 'alpha'].map(s => (
                    <button key={s} onClick={() => updateStatus(p.id, s)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all ${absenMap[p.id]?.status === s ? STATUS_COLOR[s] : 'bg-gray-100 text-gray-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>

                {/* Jam */}
                {absenMap[p.id]?.status === 'hadir' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400">Jam Masuk</label>
                      <input type="time" value={absenMap[p.id]?.jam_masuk || '07:00'}
                        onChange={e => setAbsenMap(prev => ({ ...prev, [p.id]: { ...prev[p.id], jam_masuk: e.target.value } }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">Jam Keluar</label>
                      <input type="time" value={absenMap[p.id]?.jam_keluar || '14:00'}
                        onChange={e => setAbsenMap(prev => ({ ...prev, [p.id]: { ...prev[p.id], jam_keluar: e.target.value } }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {pegawaiList.length > 0 && (
          <button onClick={handleSimpan} disabled={saving}
            className="w-full bg-slate-700 text-white font-bold py-4 rounded-2xl disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
            {saving ? (
              <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Menyimpan...</>
            ) : (
              <><span>💾</span>Simpan Absensi Pegawai</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

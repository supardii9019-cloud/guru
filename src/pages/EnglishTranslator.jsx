import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const CONTOH = [
  { id: 'surat', label: '📧 Surat Resmi', teks: 'Dengan hormat, saya ingin memberitahukan bahwa kegiatan pembelajaran akan dilaksanakan pada hari Senin.' },
  { id: 'laporan', label: '📋 Laporan', teks: 'Siswa menunjukkan perkembangan yang sangat baik dalam hal kedisiplinan dan prestasi akademik.' },
  { id: 'pengumuman', label: '📢 Pengumuman', teks: 'Diberitahukan kepada seluruh siswa bahwa ujian tengah semester akan dilaksanakan minggu depan.' },
  { id: 'deskripsi', label: '📝 Deskripsi Siswa', teks: 'Siswa ini memiliki kemampuan yang baik dalam matematika dan aktif berpartisipasi dalam kegiatan kelas.' },
]

const GAYA_BAHASA = [
  { key: 'formal', label: '👔 Formal', desc: 'Surat resmi, laporan' },
  { key: 'academic', label: '🎓 Akademik', desc: 'Jurnal, makalah' },
  { key: 'simple', label: '💬 Sederhana', desc: 'Percakapan sehari-hari' },
]

export default function EnglishTranslator() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [gaya, setGaya] = useState('formal')
  const [mode, setMode] = useState('translate') // translate | improve | explain
  const [history, setHistory] = useState([])
  const [tab, setTab] = useState('translator') // translator | history | kamus

  const handleTranslate = async () => {
    if (!input.trim()) return toast.error('Masukkan teks terlebih dahulu!')
    setLoading(true)
    setOutput('')

    const prompt = mode === 'translate'
      ? `Translate the following Indonesian text to English in ${gaya} style. Only provide the English translation, nothing else:\n\n${input}`
      : mode === 'improve'
      ? `Improve this English text to make it more ${gaya} and natural. Only provide the improved version:\n\n${input}`
      : `Explain this English text in simple Indonesian. Provide: 1) Arti/terjemahan 2) Penjelasan konteks 3) Kosakata penting:\n\n${input}`

    try {
      let result = ''

if (mode === 'translate') {
  // MyMemory API - gratis tanpa key
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input)}&langpair=id|en`
  )
  const data = await res.json()
  result = data.responseData?.translatedText || 'Gagal menerjemahkan.'

  // Perbaiki gaya bahasa dengan prompt tambahan
  if (gaya === 'formal') {
    result = result.charAt(0).toUpperCase() + result.slice(1)
  }
} else if (mode === 'improve') {
  // Untuk improve, gunakan LanguageTool API
  const res = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `text=${encodeURIComponent(input)}&language=en-US`
  })
  const data = await res.json()
  if (data.matches?.length === 0) {
    result = `✅ Teks sudah baik!\n\n${input}`
  } else {
    let improved = input
    let offset = 0
    data.matches?.slice(0, 10).forEach(match => {
      if (match.replacements?.length > 0) {
        const before = improved.slice(0, match.offset + offset)
        const after = improved.slice(match.offset + offset + match.length)
        const replacement = match.replacements[0].value
        improved = before + replacement + after
        offset += replacement.length - match.length
      }
    })
    result = `✨ Teks yang diperbaiki:\n\n${improved}\n\n📝 ${data.matches.length} perbaikan ditemukan.`
  }
} else {
  // Untuk explain, terjemahkan dulu lalu jelaskan
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input)}&langpair=en|id`
  )
  const data = await res.json()
  const terjemahan = data.responseData?.translatedText || ''

  // Pecah kata-kata penting
  const words = input.split(' ').filter(w => w.length > 4).slice(0, 5)
  const kosakataPromises = words.map(async w => {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=en|id`)
    const d = await r.json()
    return `• ${w} = ${d.responseData?.translatedText || '-'}`
  })
  const kosakata = await Promise.all(kosakataPromises)

  result = `📖 Terjemahan:\n${terjemahan}\n\n💡 Penjelasan:\nTeks ini berisi kalimat dalam bahasa Inggris yang membahas tentang topik terkait.\n\n📚 Kosakata Penting:\n${kosakata.join('\n')}`
}
      setOutput(result)
      setHistory(prev => [{
        id: Date.now(),
        input,
        output: result,
        mode,
        gaya,
        waktu: new Date().toLocaleTimeString('id-ID')
      }, ...prev.slice(0, 9)])
      toast.success('Berhasil! ✨')
    } catch (err) {
      toast.error('Gagal terhubung ke AI!')
      setOutput('Error: Gagal terhubung ke layanan AI.')
    }
    setLoading(false)
  }

  const copyText = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Teks disalin! 📋')
  }

  const clearAll = () => {
    setInput('')
    setOutput('')
  }

  const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">🔤 English Translator</h1>
          <p className="text-green-200 text-xs">AI-powered • Khusus Pendidikan</p>
        </div>
      </div>

      {/* Tab */}
      <div className="flex bg-white mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm">
        {[
          { key: 'translator', label: '🔤 Translator' },
          { key: 'history', label: '📜 Riwayat' },
          { key: 'kamus', label: '📚 Frasa' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${tab === t.key ? 'bg-green-600 text-white' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB TRANSLATOR */}
      {tab === 'translator' && (
        <div className="p-4 space-y-4">
          {/* Mode */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 mb-2">Mode</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'translate', label: '🔄 Terjemahkan', desc: 'Indo → Inggris' },
                { key: 'improve', label: '✨ Perbaiki', desc: 'Improve English' },
                { key: 'explain', label: '💡 Jelaskan', desc: 'English → Indo' },
              ].map(m => (
                <button key={m.key} onClick={() => setMode(m.key)}
                  className={`p-3 rounded-xl text-center border-2 transition-all ${mode === m.key ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                  <p className="text-xs font-bold text-gray-700">{m.label}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Gaya Bahasa */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 mb-2">Gaya Bahasa</p>
            <div className="grid grid-cols-3 gap-2">
              {GAYA_BAHASA.map(g => (
                <button key={g.key} onClick={() => setGaya(g.key)}
                  className={`p-2.5 rounded-xl text-center border-2 transition-all ${gaya === g.key ? 'border-teal-500 bg-teal-50' : 'border-gray-100'}`}>
                  <p className="text-xs font-bold">{g.label}</p>
                  <p className="text-[9px] text-gray-400">{g.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Contoh Teks */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 mb-2">Contoh Teks Cepat</p>
            <div className="grid grid-cols-2 gap-2">
              {CONTOH.map(c => (
                <button key={c.id} onClick={() => setInput(c.teks)}
                  className="text-left p-2.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-green-400 transition-colors">
                  <p className="text-xs font-semibold text-gray-700">{c.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500">
                {mode === 'translate' ? '🇮🇩 Teks Indonesia' : mode === 'improve' ? '🇬🇧 Teks Inggris' : '🇬🇧 Teks Inggris'}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{wordCount(input)} kata</span>
                {input && (
                  <button onClick={clearAll} className="text-xs text-red-400 font-medium">Hapus</button>
                )}
              </div>
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={
                mode === 'translate'
                  ? 'Ketik teks Indonesia yang ingin diterjemahkan...'
                  : mode === 'improve'
                  ? 'Ketik teks Inggris yang ingin diperbaiki...'
                  : 'Ketik teks Inggris yang ingin dijelaskan...'
              }
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none resize-none"
            />
            <button
              onClick={handleTranslate}
              disabled={loading || !input.trim()}
              className="w-full mt-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>AI sedang memproses...</>
              ) : (
                <>
                  {mode === 'translate' ? '🔄 Terjemahkan' : mode === 'improve' ? '✨ Perbaiki' : '💡 Jelaskan'}
                </>
              )}
            </button>
          </div>

          {/* Output */}
          {output && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500">
                  {mode === 'translate' ? '🇬🇧 Hasil Terjemahan' : mode === 'improve' ? '✨ Hasil Perbaikan' : '💡 Penjelasan'}
                </label>
                <div className="flex gap-2">
                  <span className="text-xs text-gray-400">{wordCount(output)} kata</span>
                  <button onClick={() => copyText(output)}
                    className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg">
                    📋 Salin
                  </button>
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{output}</p>
              </div>

              {/* Aksi tambahan */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => { setInput(output); setOutput(''); setMode('improve') }}
                  className="bg-blue-50 text-blue-700 text-xs font-bold py-2.5 rounded-xl">
                  ✨ Perbaiki Hasil Ini
                </button>
                <button
                  onClick={() => { setInput(''); setOutput('') }}
                  className="bg-gray-50 text-gray-700 text-xs font-bold py-2.5 rounded-xl">
                  🔄 Terjemahkan Baru
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB RIWAYAT */}
      {tab === 'history' && (
        <div className="p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📜</div>
              <p className="text-gray-400">Belum ada riwayat terjemahan</p>
            </div>
          ) : history.map(h => (
            <div key={h.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold capitalize">
                  {h.mode} • {h.gaya}
                </span>
                <span className="text-xs text-gray-400">{h.waktu}</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 mb-2 border-b border-gray-100 pb-2">{h.input}</p>
              <p className="text-sm text-gray-800 line-clamp-3">{h.output}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setInput(h.input); setOutput(h.output); setTab('translator') }}
                  className="flex-1 bg-green-50 text-green-700 text-xs font-bold py-2 rounded-xl">
                  🔄 Gunakan Lagi
                </button>
                <button onClick={() => copyText(h.output)}
                  className="flex-1 bg-gray-50 text-gray-700 text-xs font-bold py-2 rounded-xl">
                  📋 Salin
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB KAMUS FRASA */}
      {tab === 'kamus' && (
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500 font-medium">Frasa umum dalam dunia pendidikan:</p>
          {[
            { id: 1, indo: 'Dengan hormat', inggris: 'Dear Sir/Madam', kategori: 'Surat' },
            { id: 2, indo: 'Mohon maaf atas ketidaknyamanan', inggris: 'We apologize for the inconvenience', kategori: 'Surat' },
            { id: 3, indo: 'Siswa berprestasi', inggris: 'High-achieving student', kategori: 'Akademik' },
            { id: 4, indo: 'Nilai rata-rata', inggris: 'Grade Point Average (GPA)', kategori: 'Akademik' },
            { id: 5, indo: 'Ujian tengah semester', inggris: 'Midterm examination', kategori: 'Ujian' },
            { id: 6, indo: 'Laporan hasil belajar', inggris: 'Student progress report', kategori: 'Laporan' },
            { id: 7, indo: 'Kegiatan belajar mengajar', inggris: 'Teaching and learning activities', kategori: 'KBM' },
            { id: 8, indo: 'Absensi kehadiran', inggris: 'Attendance record', kategori: 'Absensi' },
            { id: 9, indo: 'Wali kelas', inggris: 'Homeroom teacher', kategori: 'Jabatan' },
            { id: 10, indo: 'Kepala sekolah', inggris: 'Principal / Headmaster', kategori: 'Jabatan' },
            { id: 11, indo: 'Ekstrakurikuler', inggris: 'Extracurricular activities', kategori: 'Kegiatan' },
            { id: 12, indo: 'Tahun ajaran baru', inggris: 'New academic year', kategori: 'Akademik' },
            { id: 13, indo: 'Remedi / Perbaikan nilai', inggris: 'Remedial class', kategori: 'Akademik' },
            { id: 14, indo: 'Kriteria Ketuntasan Minimal', inggris: 'Minimum Mastery Criteria', kategori: 'Akademik' },
            { id: 15, indo: 'Rencana Pelaksanaan Pembelajaran', inggris: 'Lesson Plan', kategori: 'KBM' },
          ].map(item => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">🇮🇩 {item.indo}</p>
                  <p className="text-green-700 font-bold text-sm mt-1">🇬🇧 {item.inggris}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                    {item.kategori}
                  </span>
                  <button onClick={() => { setInput(item.indo); setTab('translator') }}
                    className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-lg font-bold">
                    Terjemahkan
                  </button>
                </div>
              </div>
              <button onClick={() => copyText(item.inggris)}
                className="mt-2 w-full bg-gray-50 text-gray-600 text-xs font-medium py-1.5 rounded-xl">
                📋 Salin Terjemahan
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

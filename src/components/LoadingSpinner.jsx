export default function LoadingSpinner({ fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-green-100 border-t-green-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-green-600 font-semibold text-sm">Memuat...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-8 h-8 border-3 border-green-100 border-t-green-500 rounded-full animate-spin"></div>
    </div>
  )
}

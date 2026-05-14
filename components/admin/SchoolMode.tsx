'use client'

export default function SchoolMode({ onExit }: { onExit: () => void }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" onKeyDown={(e) => { if (e.ctrlKey && e.shiftKey && e.key === 'S') onExit() }} tabIndex={0}>
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4">
        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-sm">D</div>
        <span className="text-sm text-gray-800 font-medium">History Essay Draft</span>
      </div>
      <div className="flex-1 bg-gray-100 flex justify-center py-8 px-4">
        <div className="w-full max-w-3xl bg-white shadow-md min-h-96 px-20 py-16">
          <h1 className="text-2xl font-normal text-gray-800 mb-4">The Causes of World War I</h1>
          <p className="text-sm text-gray-700 leading-7">World War I began in 1914 and lasted until 1918. The conflict involved many of the world's major powers...</p>
          <span className="inline-block w-0.5 h-4 bg-gray-800 ml-0.5 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

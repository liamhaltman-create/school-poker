'use client'
export default function SchoolMode({ onExit }: { onExit: () => void }) {
  return <div onClick={onExit} className="min-h-screen bg-gray-100 flex items-center justify-center cursor-pointer"><p className="text-gray-400">Click to return</p></div>
}

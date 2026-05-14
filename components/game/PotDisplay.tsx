'use client'
export default function PotDisplay({ mainPot, sidePots }: any) {
  const total = (mainPot || 0) + (sidePots || []).reduce((s: number, p: any) => s + p.amount, 0)
  if (!total) return null
  return <div className="bg-black/40 rounded-full px-4 py-1 text-white font-bold font-mono">Pot: {total.toLocaleString()}</div>
}

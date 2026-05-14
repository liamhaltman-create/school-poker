'use client'
import { useState } from 'react'
export default function ActionPanel({ gameState, player, onAction }: any) {
  const [raiseAmount, setRaiseAmount] = useState(gameState?.currentBet * 2 || 100)
  const callAmount = Math.min((gameState?.currentBet || 0) - (player?.currentBet || 0), player?.chipStack || 0)
  const canCheck = (gameState?.currentBet || 0) === 0 || player?.currentBet === gameState?.currentBet
  return (
    <div className="px-4 py-3 flex gap-2">
      <button onClick={() => onAction({ type: 'fold' })} className="flex-1 py-3 rounded-lg bg-red-900 hover:bg-red-800 text-red-200 font-bold text-sm transition">Fold [F]</button>
      {canCheck
        ? <button onClick={() => onAction({ type: 'check' })} className="flex-1 py-3 rounded-lg bg-blue-800 hover:bg-blue-700 text-white font-bold text-sm transition">Check [C]</button>
        : <button onClick={() => onAction({ type: 'call' })} className="flex-1 py-3 rounded-lg bg-blue-800 hover:bg-blue-700 text-white font-bold text-sm transition">Call {callAmount.toLocaleString()} [X]</button>
      }
      <button onClick={() => onAction({ type: 'all_in' })} className="flex-1 py-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm transition">All In</button>
    </div>
  )
}

'use client'

import { motion } from 'framer-motion'

interface PlayerSeatProps {
  seatNumber: number
  player: any
  member: any
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
  isActive: boolean
  isHero: boolean
  currentBet?: number
  isMyTurn: boolean
}

export default function PlayerSeat({ seatNumber, player, isDealer, isSmallBlind, isBigBlind, isActive, isHero, currentBet, isMyTurn }: PlayerSeatProps) {
  if (!player) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center">
          <span className="text-gray-600 text-xs">empty</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${isHero ? 'scale-110' : ''}`}>
      <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${player.isFolded ? 'opacity-40 bg-gray-700' : isHero ? 'bg-blue-700' : 'bg-gray-700'} ${isActive ? 'ring-2 ring-yellow-400' : ''}`}>
        {player.displayName?.[0]?.toUpperCase() ?? '?'}
        {isDealer && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black text-[9px] font-black flex items-center justify-center">D</div>}
      </div>
      <div className="text-center">
        <div className={`text-xs font-medium truncate max-w-16 ${isHero ? 'text-blue-400' : 'text-gray-300'}`}>{player.displayName}</div>
        <div className={`text-xs font-mono ${player.isAllIn ? 'text-red-400' : 'text-green-400'}`}>{player.isAllIn ? 'ALL IN' : player.chipStack?.toLocaleString()}</div>
      </div>
      {currentBet !== undefined && currentBet > 0 && (
        <div className="text-yellow-400 text-[10px] font-mono font-bold">{currentBet.toLocaleString()}</div>
      )}
    </div>
  )
}

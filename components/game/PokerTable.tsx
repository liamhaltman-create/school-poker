// components/game/PokerTable.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PlayerSeat from './PlayerSeat'
import CommunityCards from './CommunityCards'
import ActionPanel from './ActionPanel'
import PotDisplay from './PotDisplay'
import Timer from './Timer'
import SidePotDisplay from './SidePot'
import ChatPanel from '../chat/ChatPanel'
import AdminPanel from '../admin/AdminPanel'
import SchoolMode from '../SchoolMode'
import { usePokerTable } from '@/hooks/usePokerTable'
import { useGameActions } from '@/hooks/useGameActions'
import type { GameState } from '@/lib/poker/types'

interface PokerTableProps {
  tableCode: string
  userId: string
  isAdmin: boolean
}

// Seat positions around the oval table (in %)
const SEAT_POSITIONS = [
  { top: '75%', left: '50%' },   // 0 - bottom center (hero)
  { top: '85%', left: '25%' },   // 1 - bottom left
  { top: '65%', left: '8%'  },   // 2 - left
  { top: '35%', left: '8%'  },   // 3 - left top
  { top: '15%', left: '25%' },   // 4 - top left
  { top: '10%', left: '50%' },   // 5 - top center
  { top: '15%', left: '75%' },   // 6 - top right
  { top: '35%', left: '92%' },   // 7 - right top
  { top: '65%', left: '92%' },   // 8 - right
]

export default function PokerTable({ tableCode, userId, isAdmin }: PokerTableProps) {
  const { gameState, tableInfo, members, loading } = usePokerTable(tableCode, userId)
  const { submitAction, startHand } = useGameActions(tableCode)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [schoolMode, setSchoolMode] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && schoolMode) setSchoolMode(false)
      if (e.key === 'F' && !e.metaKey) submitAction({ type: 'fold' })
      if (e.key === 'C' && !e.metaKey) submitAction({ type: 'check' })
      if (e.key === 'X' && !e.metaKey) submitAction({ type: 'call' })
      // Quick-hide: Ctrl+Shift+S
      if (e.ctrlKey && e.shiftKey && e.key === 'S') setSchoolMode(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [schoolMode, submitAction])

  if (schoolMode) return <SchoolMode onExit={() => setSchoolMode(false)} />

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-green-400 text-xl animate-pulse">Loading table...</div>
      </div>
    )
  }

  const isMyTurn = gameState?.activePlayerSeat !== undefined &&
    gameState.players.find((p: any) => p.userId === userId)?.seatNumber === gameState.activePlayerSeat

  const myPlayer = gameState?.players.find((p: any) => p.userId === userId)
  const sidePots = gameState?.pots.filter((p: any) => p.potNumber > 0) ?? []

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 z-10">
        <div className="flex items-center gap-3">
          <span className="text-green-400 font-bold font-mono tracking-wider">{tableInfo?.name}</span>
          <span className="text-gray-500 text-sm font-mono">#{tableCode}</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-gray-400 text-xs">{members.filter(m => m.is_connected).length} online</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">
            Blinds: <span className="text-white">{tableInfo?.small_blind}/{tableInfo?.big_blind}</span>
          </span>
          {isAdmin && (
            <button
              onClick={() => setShowAdmin(!showAdmin)}
              className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold transition"
            >
              ADMIN
            </button>
          )}
          <button
            onClick={() => setShowChat(!showChat)}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs transition"
          >
            Chat
          </button>
          <button
            onClick={() => setSchoolMode(true)}
            className="px-3 py-1 rounded bg-red-900 hover:bg-red-800 text-red-300 text-xs font-bold transition"
            title="Quick Hide (Ctrl+Shift+S)"
          >
            👁 HIDE
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          {/* Felt table */}
          <div className="relative w-full max-w-4xl" style={{ paddingBottom: '55%' }}>
            {/* Table felt */}
            <div className="absolute inset-8 rounded-[50%] bg-gradient-to-b from-green-900 to-green-950 border-8 border-amber-900 shadow-2xl">
              {/* Table inner ring */}
              <div className="absolute inset-4 rounded-[50%] border border-green-700/30" />

              {/* Center area */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                {/* Community Cards */}
                <CommunityCards cards={gameState?.communityCards ?? []} />

                {/* Pot display */}
                <PotDisplay
                  mainPot={gameState?.pots[0]?.amount ?? 0}
                  sidePots={sidePots}
                />

                {/* Street indicator */}
                {gameState?.street && gameState.phase === 'playing' && (
                  <div className="text-gray-400 text-xs uppercase tracking-widest">
                    {gameState.street}
                  </div>
                )}

                {/* Start hand button */}
                {gameState?.phase === 'waiting' && isAdmin && (
                  <button
                    onClick={startHand}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-full text-white font-bold text-sm transition"
                  >
                    Start Hand
                  </button>
                )}

                {/* Hand complete overlay */}
                {gameState?.phase === 'hand_complete' && gameState.winners && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-black/70 rounded-lg px-4 py-2 text-center"
                  >
                    {gameState.winners.map((w: any, i: number) => {
                      const winner = gameState.players.find((p: any) => p.userId === w.userId)
                      return (
                        <div key={i} className="text-yellow-400 font-bold text-sm">
                          {winner?.displayName ?? 'Player'} wins {w.amount.toLocaleString()} chips
                          {w.handDescription !== 'everyone folded' && (
                            <div className="text-gray-300 font-normal text-xs">{w.handDescription}</div>
                          )}
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Player Seats */}
            {SEAT_POSITIONS.map((pos, seatNum) => {
              const player = gameState?.players.find((p: any) => p.seatNumber === seatNum)
              const member = members.find((m: any) => {
                const playerAtSeat = gameState?.players.find((p: any) => p.seatNumber === seatNum)
                return m.user_id === playerAtSeat?.userId
              })

              return (
                <div
                  key={seatNum}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ top: pos.top, left: pos.left }}
                >
                  <PlayerSeat
                    seatNumber={seatNum}
                    player={player ?? null}
                    member={member ?? null}
                    isDealer={gameState?.dealerSeat === seatNum}
                    isSmallBlind={gameState?.smallBlindSeat === seatNum}
                    isBigBlind={gameState?.bigBlindSeat === seatNum}
                    isActive={gameState?.activePlayerSeat === seatNum}
                    isHero={player?.userId === userId}
                    currentBet={player?.currentBet}
                    isMyTurn={gameState?.activePlayerSeat === seatNum && player?.userId === userId}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Side panels */}
        <AnimatePresence>
          {showAdmin && isAdmin && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-72 bg-gray-900 border-l border-gray-800 overflow-y-auto"
            >
              <AdminPanel tableCode={tableCode} members={members} gameState={gameState} />
            </motion.div>
          )}

          {showChat && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-64 bg-gray-900 border-l border-gray-800"
            >
              <ChatPanel tableCode={tableCode} userId={userId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Panel - fixed at bottom */}
      {isMyTurn && myPlayer && gameState && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-800 backdrop-blur z-20"
        >
          <ActionPanel
            gameState={gameState}
            player={myPlayer}
            onAction={submitAction}
          />
        </motion.div>
      )}

      {/* Timer */}
      {isMyTurn && gameState && tableInfo && (
        <div className="fixed top-16 right-4 z-20">
          <Timer
            seconds={tableInfo.turn_timer_seconds}
            onTimeout={() => submitAction({ type: 'fold' })}
          />
        </div>
      )}
    </div>
  )
}

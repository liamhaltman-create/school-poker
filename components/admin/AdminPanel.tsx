// components/admin/AdminPanel.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { GameState } from '@/lib/poker/types'

interface AdminPanelProps {
  tableCode: string
  members: any[]
  gameState: GameState | null
}

type AdminTab = 'players' | 'blinds' | 'settings' | 'logs'

export default function AdminPanel({ tableCode, members, gameState }: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>('players')
  const [chipTarget, setChipTarget] = useState('')
  const [chipAmount, setChipAmount] = useState('')
  const [chipReason, setChipReason] = useState('')
  const [smallBlind, setSmallBlind] = useState('')
  const [bigBlind, setBigBlind] = useState('')
  const [loading, setLoading] = useState(false)

  const apiCall = async (endpoint: string, body: object) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableCode, ...body }),
      })
      const data = await res.json()
      if (!res.ok) alert(data.error || 'Error')
      return data
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-yellow-400 font-bold text-sm tracking-wide">⚡ ADMIN PANEL</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(['players', 'blinds', 'settings', 'logs'] as AdminTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs capitalize ${tab === t ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* PLAYERS TAB */}
        {tab === 'players' && (
          <div className="space-y-4">
            {/* Chip Adjustment */}
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-3">
              <h3 className="text-white text-xs font-bold uppercase tracking-wide">Chip Adjustment</h3>
              <select
                value={chipTarget}
                onChange={e => setChipTarget(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm"
              >
                <option value="">Select player...</option>
                {members.filter(m => m.status === 'active').map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles?.display_name ?? m.user_id} ({m.chip_stack?.toLocaleString() ?? 0} chips)
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Amount (+/-)"
                value={chipAmount}
                onChange={e => setChipAmount(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm"
              />
              <input
                type="text"
                placeholder="Reason (optional)"
                value={chipReason}
                onChange={e => setChipReason(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => apiCall('chips', { targetUserId: chipTarget, amount: Number(chipAmount), reason: chipReason })}
                  disabled={!chipTarget || !chipAmount || loading}
                  className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 rounded text-white text-xs font-bold transition"
                >
                  Adjust Chips
                </button>
                <button
                  onClick={() => {
                    const stack = members.find(m => m.user_id === chipTarget)?.chip_stack ?? 0
                    apiCall('chips', { targetUserId: chipTarget, amount: -stack, reason: 'Reset to zero' })
                  }}
                  disabled={!chipTarget || loading}
                  className="px-3 py-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 rounded text-red-200 text-xs font-bold transition"
                >
                  Zero
                </button>
              </div>
            </div>

            {/* Player list with actions */}
            <div className="space-y-2">
              <h3 className="text-white text-xs font-bold uppercase tracking-wide">Players</h3>
              {members.map(m => (
                <div key={m.user_id} className="bg-gray-800/50 rounded-lg p-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-white text-xs font-medium">{m.profiles?.display_name}</div>
                    <div className="text-green-400 text-xs font-mono">{m.chip_stack?.toLocaleString()} chips</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => apiCall('sitout', { targetUserId: m.user_id })}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-[10px] transition"
                    >
                      Sit Out
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Kick ${m.profiles?.display_name}?`))
                          apiCall('kick', { targetUserId: m.user_id })
                      }}
                      className="px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-red-300 text-[10px] transition"
                    >
                      Kick
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Ban ${m.profiles?.display_name}?`))
                          apiCall('kick', { targetUserId: m.user_id, ban: true })
                      }}
                      className="px-2 py-1 bg-red-950 hover:bg-red-900 rounded text-red-400 text-[10px] transition"
                    >
                      Ban
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Game controls */}
            <div className="space-y-2">
              <h3 className="text-white text-xs font-bold uppercase tracking-wide">Game Controls</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => apiCall('pause', {})}
                  className="py-2 bg-orange-800 hover:bg-orange-700 rounded text-orange-200 text-xs font-bold transition"
                >
                  Pause Game
                </button>
                <button
                  onClick={() => apiCall('resume', {})}
                  className="py-2 bg-green-800 hover:bg-green-700 rounded text-green-200 text-xs font-bold transition"
                >
                  Resume
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BLINDS TAB */}
        {tab === 'blinds' && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-3">
              <h3 className="text-white text-xs font-bold uppercase tracking-wide">Change Blinds</h3>
              <p className="text-gray-400 text-xs">Takes effect next hand.</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-gray-400 text-xs">Small Blind</label>
                  <input
                    type="number"
                    value={smallBlind}
                    onChange={e => setSmallBlind(e.target.value)}
                    placeholder="25"
                    className="w-full mt-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-gray-400 text-xs">Big Blind</label>
                  <input
                    type="number"
                    value={bigBlind}
                    onChange={e => setBigBlind(e.target.value)}
                    placeholder="50"
                    className="w-full mt-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
              </div>

              {/* Quick presets */}
              <div className="grid grid-cols-3 gap-1">
                {[['5/10', 5, 10], ['10/25', 10, 25], ['25/50', 25, 50], ['50/100', 50, 100], ['100/200', 100, 200], ['200/400', 200, 400]].map(([label, sb, bb]) => (
                  <button
                    key={label as string}
                    onClick={() => { setSmallBlind(String(sb)); setBigBlind(String(bb)) }}
                    className="py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs transition"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => apiCall('blinds', { smallBlind: Number(smallBlind), bigBlind: Number(bigBlind) })}
                disabled={!smallBlind || !bigBlind || loading}
                className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 rounded text-white text-sm font-bold transition"
              >
                Apply Blinds
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-3">
              <h3 className="text-white text-xs font-bold uppercase tracking-wide">Table Features</h3>
              {[
                { label: 'Rabbit Hunting', key: 'rabbit_hunting' },
                { label: 'Run It Twice', key: 'run_it_twice' },
                { label: 'Allow Straddle', key: 'allow_straddle' },
                { label: 'Allow Spectators', key: 'allow_spectators' },
                { label: 'Allow Chat', key: 'allow_chat' },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{label}</span>
                  <button
                    onClick={() => apiCall('toggle-setting', { setting: key })}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs transition"
                  >
                    Toggle
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <h3 className="text-white text-xs font-bold uppercase tracking-wide mb-3">Promote Player</h3>
              <select className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm mb-2">
                <option value="">Select player...</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.profiles?.display_name}</option>
                ))}
              </select>
              <button
                onClick={() => {}}
                className="w-full py-2 bg-purple-700 hover:bg-purple-600 rounded text-white text-sm font-bold transition"
              >
                Promote to Admin
              </button>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {tab === 'logs' && (
          <AdminLogs tableCode={tableCode} />
        )}
      </div>
    </div>
  )
}

function AdminLogs({ tableCode }: { tableCode: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  const loadLogs = async () => {
    const res = await fetch(`/api/admin/logs?tableCode=${tableCode}`)
    const data = await res.json()
    setLogs(data.logs ?? [])
    setLoaded(true)
  }

  if (!loaded) {
    return (
      <button onClick={loadLogs} className="w-full py-2 bg-gray-700 rounded text-gray-300 text-sm">
        Load Logs
      </button>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map((log: any) => (
        <div key={log.id} className="bg-gray-800/50 rounded p-2 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>{log.action}</span>
            <span>{new Date(log.created_at).toLocaleTimeString()}</span>
          </div>
          <div className="text-gray-300 mt-1">
            By: {log.performer?.display_name} → {log.target?.display_name ?? 'table'}
          </div>
          {log.details && (
            <div className="text-gray-500 mt-0.5 font-mono">
              {JSON.stringify(log.details)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

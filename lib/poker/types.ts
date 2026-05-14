// lib/poker/types.ts

export type Suit = 's' | 'h' | 'd' | 'c'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  rank: Rank
  suit: Suit
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
export type GamePhase = 'waiting' | 'playing' | 'hand_complete' | 'paused'
export type PlayerStatus = 'active' | 'sitting_out' | 'away' | 'banned' | 'left'
export type ActionType =
  | 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'all_in'
  | 'small_blind' | 'big_blind' | 'ante' | 'straddle'
  | 'deal' | 'flop' | 'turn' | 'river' | 'showdown'
  | 'win' | 'timeout_fold' | 'sit_out' | 'rejoin'

export interface Player {
  userId: string
  seatNumber: number
  displayName: string
  chipStack: number
  holeCards: Card[]
  currentBet: number
  totalBetThisHand: number
  hasActed: boolean
  isAllIn: boolean
  isFolded: boolean
  status: PlayerStatus
  lastAction: string | null
}

export interface SidePot {
  potNumber: number
  amount: number
  eligiblePlayerIds: string[]
}

export interface HandRank {
  rank: number
  values: number[]
  description: string
}

export interface HandResult {
  userId: string
  holeCards: Card[]
  handRank: HandRank
}

export interface ActionRecord {
  type: ActionType
  userId?: string
  amount: number
  street: Street
  sequence: number
}

export interface Action {
  type: ActionType
  amount?: number
}

export interface GameSettings {
  smallBlind: number
  bigBlind: number
  ante: number
}

export interface WinnerRecord {
  userId: string
  amount: number
  potNumber: number
  handDescription: string
}

export interface GameState {
  phase: GamePhase
  handNumber: number
  dealerSeat: number
  smallBlindSeat: number
  bigBlindSeat: number
  activePlayerSeat: number
  players: Player[]
  communityCards: Card[]
  deck: Card[]
  pots: SidePot[]
  currentBet: number
  minRaise: number
  street: Street
  settings: GameSettings
  actionHistory: ActionRecord[]
  pendingActions: Action[]
  isRunningTwice: boolean
  rabbitCard: Card | null
  straddleActive: boolean
  straddleSeat: number
  winners?: WinnerRecord[]
}

// ============================================================
// lib/poker/sidepots.ts
// ============================================================

export function calculateSidePots(players: Player[], totalPot: number): SidePot[] {
  // Get all-in amounts sorted ascending
  const allInPlayers = players
    .filter(p => p.isAllIn && !p.isFolded)
    .map(p => ({ userId: p.userId, total: p.totalBetThisHand }))
    .sort((a, b) => a.total - b.total)

  if (allInPlayers.length === 0) {
    const eligible = players.filter(p => !p.isFolded).map(p => p.userId)
    return [{ potNumber: 0, amount: totalPot, eligiblePlayerIds: eligible }]
  }

  const pots: SidePot[] = []
  const allPlayers = players.filter(p => !p.isFolded)
  let processed = 0

  for (let i = 0; i < allInPlayers.length; i++) {
    const cap = allInPlayers[i].total - processed
    if (cap <= 0) continue

    const eligible = allPlayers.filter(p => p.totalBetThisHand >= allInPlayers[i].total)
    const potAmount = cap * eligible.length

    pots.push({
      potNumber: i,
      amount: potAmount,
      eligiblePlayerIds: eligible.map(p => p.userId)
    })

    processed = allInPlayers[i].total
  }

  // Remaining main pot
  const remaining = totalPot - pots.reduce((sum, p) => sum + p.amount, 0)
  if (remaining > 0) {
    const eligible = allPlayers.filter(p => !p.isAllIn).map(p => p.userId)
    pots.push({
      potNumber: pots.length,
      amount: remaining,
      eligiblePlayerIds: eligible,
    })
  }

  return pots
}

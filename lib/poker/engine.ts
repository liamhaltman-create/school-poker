// lib/poker/engine.ts
// Server-authoritative poker game engine
// ALL game state mutations go through this engine

import { evaluateHand, compareHands } from './evaluator'
import { createDeck, shuffleDeck, dealCards } from './deck'
import { calculateSidePots } from './sidepots'
import type {
  GameState, Player, Card, Action, ActionType,
  Street, SidePot, HandResult, PlayerStatus
} from './types'

export class PokerEngine {
  // ============================================================
  // STATE INITIALIZATION
  // ============================================================

  static createInitialGameState(
    players: { userId: string; seatNumber: number; chipStack: number; displayName: string }[],
    settings: {
      smallBlind: number
      bigBlind: number
      ante: number
      dealerSeat?: number
    }
  ): GameState {
    const activePlayers = players.filter(p => p.chipStack > 0)
    if (activePlayers.length < 2) {
      throw new Error('Need at least 2 players with chips to start')
    }

    return {
      phase: 'waiting',
      handNumber: 0,
      dealerSeat: settings.dealerSeat ?? activePlayers[0].seatNumber,
      smallBlindSeat: -1,
      bigBlindSeat: -1,
      activePlayerSeat: -1,
      players: players.map(p => ({
        ...p,
        status: 'active' as PlayerStatus,
        holeCards: [],
        currentBet: 0,
        totalBetThisHand: 0,
        hasActed: false,
        isAllIn: false,
        isFolded: false,
        lastAction: null,
      })),
      communityCards: [],
      deck: [],
      pots: [{ amount: 0, eligiblePlayerIds: [], potNumber: 0 }],
      currentBet: 0,
      minRaise: settings.bigBlind,
      street: 'preflop',
      settings: {
        smallBlind: settings.smallBlind,
        bigBlind: settings.bigBlind,
        ante: settings.ante,
      },
      actionHistory: [],
      pendingActions: [],
      isRunningTwice: false,
      rabbitCard: null,
      straddleActive: false,
      straddleSeat: -1,
    }
  }

  // ============================================================
  // HAND LIFECYCLE
  // ============================================================

  static startNewHand(state: GameState): GameState {
    let s = { ...state }

    // Find active players (not sitting out, has chips)
    const activePlayers = s.players.filter(
      p => p.status === 'active' && p.chipStack > 0
    )
    if (activePlayers.length < 2) {
      return { ...s, phase: 'waiting' }
    }

    // Advance dealer button
    s = this.advanceDealerButton(s)

    // Assign blinds
    s = this.assignBlinds(s)

    // Reset per-hand state
    s = {
      ...s,
      handNumber: s.handNumber + 1,
      phase: 'playing',
      street: 'preflop',
      communityCards: [],
      currentBet: s.settings.bigBlind,
      minRaise: s.settings.bigBlind,
      pots: [{ amount: 0, eligiblePlayerIds: activePlayers.map(p => p.userId), potNumber: 0 }],
      actionHistory: [],
      rabbitCard: null,
      isRunningTwice: false,
      players: s.players.map(p => ({
        ...p,
        holeCards: [],
        currentBet: 0,
        totalBetThisHand: 0,
        hasActed: false,
        isAllIn: false,
        isFolded: p.status !== 'active' || p.chipStack === 0,
        lastAction: null,
      }))
    }

    // Shuffle and deal
    const deck = shuffleDeck(createDeck())
    s = { ...s, deck }
    s = this.collectAntes(s)
    s = this.postBlinds(s)
    s = this.dealHoleCards(s)

    // Set first actor (UTG)
    s = this.setNextActivePlayer(s)

    return s
  }

  static advanceDealerButton(state: GameState): GameState {
    const seats = state.players
      .filter(p => p.status === 'active' && p.chipStack > 0)
      .map(p => p.seatNumber)
      .sort((a, b) => a - b)

    if (seats.length === 0) return state

    const currentIdx = seats.indexOf(state.dealerSeat)
    const nextIdx = (currentIdx + 1) % seats.length
    return { ...state, dealerSeat: seats[nextIdx] }
  }

  static assignBlinds(state: GameState): GameState {
    const activeSeat = state.players
      .filter(p => p.status === 'active' && p.chipStack > 0)
      .map(p => p.seatNumber)
      .sort((a, b) => a - b)

    const dealerIdx = activeSeat.indexOf(state.dealerSeat)
    const heads_up = activeSeat.length === 2

    let sbIdx: number, bbIdx: number
    if (heads_up) {
      sbIdx = dealerIdx
      bbIdx = (dealerIdx + 1) % activeSeat.length
    } else {
      sbIdx = (dealerIdx + 1) % activeSeat.length
      bbIdx = (dealerIdx + 2) % activeSeat.length
    }

    return {
      ...state,
      smallBlindSeat: activeSeat[sbIdx],
      bigBlindSeat: activeSeat[bbIdx],
    }
  }

  static collectAntes(state: GameState): GameState {
    if (state.settings.ante === 0) return state
    let s = { ...state }
    let totalAntes = 0

    s = {
      ...s,
      players: s.players.map(p => {
        if (p.isFolded || p.chipStack === 0) return p
        const ante = Math.min(state.settings.ante, p.chipStack)
        totalAntes += ante
        return {
          ...p,
          chipStack: p.chipStack - ante,
          totalBetThisHand: p.totalBetThisHand + ante,
          isAllIn: p.chipStack - ante === 0,
        }
      })
    }

    s.pots[0].amount += totalAntes
    s.actionHistory.push({ type: 'ante', amount: totalAntes, street: 'preflop', sequence: s.actionHistory.length })
    return s
  }

  static postBlinds(state: GameState): GameState {
    let s = { ...state }

    // Small blind
    s = this.forceBet(s, state.smallBlindSeat, state.settings.smallBlind, 'small_blind')
    // Big blind
    s = this.forceBet(s, state.bigBlindSeat, state.settings.bigBlind, 'big_blind')

    return { ...s, currentBet: state.settings.bigBlind }
  }

  static forceBet(state: GameState, seatNumber: number, amount: number, type: ActionType): GameState {
    const playerIdx = state.players.findIndex(p => p.seatNumber === seatNumber)
    if (playerIdx === -1) return state

    const player = state.players[playerIdx]
    const actualAmount = Math.min(amount, player.chipStack)
    const newStack = player.chipStack - actualAmount

    const newPlayers = [...state.players]
    newPlayers[playerIdx] = {
      ...player,
      chipStack: newStack,
      currentBet: player.currentBet + actualAmount,
      totalBetThisHand: player.totalBetThisHand + actualAmount,
      isAllIn: newStack === 0,
    }

    const newPots = [...state.pots]
    newPots[0] = { ...newPots[0], amount: newPots[0].amount + actualAmount }

    return {
      ...state,
      players: newPlayers,
      pots: newPots,
      actionHistory: [
        ...state.actionHistory,
        {
          type,
          userId: player.userId,
          amount: actualAmount,
          street: state.street,
          sequence: state.actionHistory.length,
        }
      ]
    }
  }

  static dealHoleCards(state: GameState): GameState {
    let deck = [...state.deck]
    const newPlayers = state.players.map(p => {
      if (p.isFolded) return p
      const [c1, ...rest1] = deck
      deck = rest1
      const [c2, ...rest2] = deck
      deck = rest2
      return { ...p, holeCards: [c1, c2] }
    })
    return { ...state, players: newPlayers, deck }
  }

  // ============================================================
  // PLAYER ACTIONS
  // ============================================================

  static processAction(state: GameState, userId: string, action: Action): {
    newState: GameState
    valid: boolean
    error?: string
  } {
    // Validate it's this player's turn
    const player = state.players.find(p => p.userId === userId)
    if (!player) return { newState: state, valid: false, error: 'Player not found' }

    const activePlayer = state.players.find(p => p.seatNumber === state.activePlayerSeat)
    if (!activePlayer || activePlayer.userId !== userId) {
      return { newState: state, valid: false, error: 'Not your turn' }
    }

    if (player.isFolded || player.isAllIn) {
      return { newState: state, valid: false, error: 'You cannot act' }
    }

    // Validate and process action
    const { valid, error } = this.validateAction(state, player, action)
    if (!valid) return { newState: state, valid: false, error }

    let newState = this.applyAction(state, player, action)
    newState = this.checkStreetComplete(newState)

    return { newState, valid: true }
  }

  static validateAction(state: GameState, player: Player, action: Action): { valid: boolean; error?: string } {
    const callAmount = state.currentBet - player.currentBet

    switch (action.type) {
      case 'fold':
        return { valid: true }

      case 'check':
        if (callAmount > 0) {
          return { valid: false, error: 'Cannot check, there is a bet to call' }
        }
        return { valid: true }

      case 'call':
        return { valid: true } // calling for less (all-in call) is valid

      case 'raise':
      case 'bet': {
        const totalRequired = (action.amount ?? 0)
        if (!action.amount || action.amount <= 0) {
          return { valid: false, error: 'Invalid bet amount' }
        }
        // All-in override
        if (action.amount >= player.chipStack) {
          return { valid: true }
        }
        const minBet = state.currentBet === 0 ? state.settings.bigBlind : state.currentBet + state.minRaise
        if (totalRequired < minBet) {
          return { valid: false, error: `Minimum raise is ${minBet}` }
        }
        return { valid: true }
      }

      case 'all_in':
        return { valid: true }

      default:
        return { valid: false, error: 'Unknown action' }
    }
  }

  static applyAction(state: GameState, player: Player, action: Action): GameState {
    const playerIdx = state.players.findIndex(p => p.userId === player.userId)
    let newPlayers = [...state.players]
    let newPots = [...state.pots]
    let newCurrentBet = state.currentBet
    let newMinRaise = state.minRaise

    const callAmount = Math.min(state.currentBet - player.currentBet, player.chipStack)

    switch (action.type) {
      case 'fold': {
        newPlayers[playerIdx] = {
          ...player,
          isFolded: true,
          holeCards: [], // hide cards
          lastAction: 'fold',
          hasActed: true,
        }
        break
      }

      case 'check': {
        newPlayers[playerIdx] = {
          ...player,
          lastAction: 'check',
          hasActed: true,
        }
        break
      }

      case 'call': {
        const actualCall = Math.min(callAmount, player.chipStack)
        newPlayers[playerIdx] = {
          ...player,
          chipStack: player.chipStack - actualCall,
          currentBet: player.currentBet + actualCall,
          totalBetThisHand: player.totalBetThisHand + actualCall,
          isAllIn: player.chipStack - actualCall === 0,
          lastAction: 'call',
          hasActed: true,
        }
        newPots[0] = { ...newPots[0], amount: newPots[0].amount + actualCall }
        break
      }

      case 'raise':
      case 'bet': {
        const raiseAmount = action.amount!
        const actualRaise = Math.min(raiseAmount, player.chipStack)
        const prevBet = player.currentBet
        newPlayers[playerIdx] = {
          ...player,
          chipStack: player.chipStack - actualRaise,
          currentBet: prevBet + actualRaise,
          totalBetThisHand: player.totalBetThisHand + actualRaise,
          isAllIn: player.chipStack - actualRaise === 0,
          lastAction: action.type === 'bet' ? 'bet' : 'raise',
          hasActed: true,
        }
        newPots[0] = { ...newPots[0], amount: newPots[0].amount + actualRaise }
        newCurrentBet = prevBet + actualRaise
        newMinRaise = newCurrentBet - state.currentBet // raise increment
        // Reset hasActed for others
        newPlayers = newPlayers.map((p, i) => {
          if (i === playerIdx) return newPlayers[i]
          if (p.isFolded || p.isAllIn) return p
          return { ...p, hasActed: false }
        })
        break
      }

      case 'all_in': {
        const allInAmount = player.chipStack
        const prevBet = player.currentBet
        const totalBet = prevBet + allInAmount
        newPlayers[playerIdx] = {
          ...player,
          chipStack: 0,
          currentBet: totalBet,
          totalBetThisHand: player.totalBetThisHand + allInAmount,
          isAllIn: true,
          lastAction: 'all_in',
          hasActed: true,
        }
        newPots[0] = { ...newPots[0], amount: newPots[0].amount + allInAmount }
        if (totalBet > newCurrentBet) {
          newCurrentBet = totalBet
          newMinRaise = totalBet - state.currentBet
          newPlayers = newPlayers.map((p, i) => {
            if (i === playerIdx) return newPlayers[i]
            if (p.isFolded || p.isAllIn) return p
            return { ...p, hasActed: false }
          })
        }
        break
      }
    }

    const newState = {
      ...state,
      players: newPlayers,
      pots: newPots,
      currentBet: newCurrentBet,
      minRaise: newMinRaise,
      actionHistory: [
        ...state.actionHistory,
        {
          type: action.type,
          userId: player.userId,
          amount: action.amount ?? 0,
          street: state.street,
          sequence: state.actionHistory.length,
        }
      ]
    }

    return this.setNextActivePlayer(newState)
  }

  static setNextActivePlayer(state: GameState): GameState {
    const activeSeat = state.players
      .filter(p => !p.isFolded && !p.isAllIn && p.status === 'active')
      .map(p => p.seatNumber)
      .sort((a, b) => a - b)

    if (activeSeat.length === 0) return { ...state, activePlayerSeat: -1 }

    const currentSeat = state.activePlayerSeat
    const seats = state.players
      .filter(p => p.status === 'active' && !p.isFolded && !p.isAllIn)
      .map(p => p.seatNumber)
      .sort((a, b) => a - b)

    if (seats.length === 0) return { ...state, activePlayerSeat: -1 }

    // Find next seat after current
    const currentIdx = seats.findIndex(s => s > currentSeat)
    const nextSeat = currentIdx === -1 ? seats[0] : seats[currentIdx]

    return { ...state, activePlayerSeat: nextSeat }
  }

  // ============================================================
  // STREET PROGRESSION
  // ============================================================

  static checkStreetComplete(state: GameState): GameState {
    const activePlayers = state.players.filter(p => !p.isFolded)

    // Only one player left - they win
    if (activePlayers.length === 1) {
      return this.awardPot(state, activePlayers[0].userId)
    }

    const playersToAct = state.players.filter(
      p => !p.isFolded && !p.isAllIn && p.status === 'active'
    )

    // Check if all active players have acted and bets are even
    const allActed = playersToAct.every(p => p.hasActed)
    const betsEqual = playersToAct.every(p => p.currentBet === state.currentBet)

    if (!allActed || !betsEqual) return state

    // Street is complete, advance
    return this.advanceStreet(state)
  }

  static advanceStreet(state: GameState): GameState {
    const streets: Street[] = ['preflop', 'flop', 'turn', 'river', 'showdown']
    const currentIdx = streets.indexOf(state.street)

    if (currentIdx >= streets.length - 1) {
      return this.handleShowdown(state)
    }

    const nextStreet = streets[currentIdx + 1]

    // Resolve side pots if needed
    const allInPlayers = state.players.filter(p => p.isAllIn && !p.isFolded)
    let newPots = state.pots
    if (allInPlayers.length > 0) {
      newPots = calculateSidePots(state.players, state.pots[0].amount)
    }

    // Deal community cards
    let deck = [...state.deck]
    let communityCards = [...state.communityCards]

    if (nextStreet === 'flop') {
      deck.shift() // burn
      const [c1, c2, c3, ...rest] = deck
      communityCards = [c1, c2, c3]
      deck = rest
    } else if (nextStreet === 'turn' || nextStreet === 'river') {
      deck.shift() // burn
      const [c, ...rest] = deck
      communityCards = [...communityCards, c]
      deck = rest
    }

    // Reset per-street state
    const newPlayers = state.players.map(p => ({
      ...p,
      currentBet: 0,
      hasActed: false,
      lastAction: null,
    }))

    // First to act post-flop is first active player left of dealer
    const activeSeat = newPlayers
      .filter(p => !p.isFolded && !p.isAllIn && p.status === 'active')
      .map(p => p.seatNumber)
      .sort((a, b) => a - b)

    const dealerIdx = activeSeat.findIndex(s => s > state.dealerSeat)
    const firstToAct = dealerIdx === -1 ? activeSeat[0] : activeSeat[dealerIdx]

    if (nextStreet === 'showdown') {
      return this.handleShowdown({ ...state, communityCards, deck, pots: newPots })
    }

    return {
      ...state,
      street: nextStreet,
      communityCards,
      deck,
      players: newPlayers,
      pots: newPots,
      currentBet: 0,
      minRaise: state.settings.bigBlind,
      activePlayerSeat: firstToAct ?? -1,
    }
  }

  // ============================================================
  // SHOWDOWN + POT AWARD
  // ============================================================

  static handleShowdown(state: GameState): GameState {
    const activePlayers = state.players.filter(p => !p.isFolded)
    const pots = calculateSidePots(state.players, state.pots[0].amount)

    const results: HandResult[] = activePlayers.map(p => ({
      userId: p.userId,
      holeCards: p.holeCards,
      handRank: evaluateHand([...p.holeCards, ...state.communityCards]),
    }))

    let newPlayers = [...state.players]
    const winners: { userId: string; amount: number; potNumber: number; handDescription: string }[] = []

    for (const pot of pots) {
      const eligible = results.filter(r => pot.eligiblePlayerIds.includes(r.userId))
      if (eligible.length === 0) continue

      const sorted = eligible.sort((a, b) => compareHands(b.handRank, a.handRank))
      const topRank = sorted[0].handRank.rank

      // Handle split pots
      const potWinners = sorted.filter(r => r.handRank.rank === topRank)
      const share = Math.floor(pot.amount / potWinners.length)
      const remainder = pot.amount % potWinners.length

      potWinners.forEach((w, i) => {
        const amount = share + (i === 0 ? remainder : 0)
        const pidx = newPlayers.findIndex(p => p.userId === w.userId)
        if (pidx !== -1) {
          newPlayers[pidx] = {
            ...newPlayers[pidx],
            chipStack: newPlayers[pidx].chipStack + amount,
          }
        }
        winners.push({
          userId: w.userId,
          amount,
          potNumber: pot.potNumber,
          handDescription: w.handRank.description,
        })
      })
    }

    return {
      ...state,
      phase: 'hand_complete',
      players: newPlayers,
      pots: pots.map(p => ({ ...p })),
      winners,
      activePlayerSeat: -1,
    }
  }

  static awardPot(state: GameState, winnerUserId: string): GameState {
    const totalPot = state.pots.reduce((sum, p) => sum + p.amount, 0)
    const newPlayers = state.players.map(p => {
      if (p.userId !== winnerUserId) return p
      return { ...p, chipStack: p.chipStack + totalPot }
    })

    return {
      ...state,
      phase: 'hand_complete',
      players: newPlayers,
      winners: [{ userId: winnerUserId, amount: totalPot, potNumber: 0, handDescription: 'everyone folded' }],
      activePlayerSeat: -1,
    }
  }

  // ============================================================
  // ADMIN ACTIONS
  // ============================================================

  static adminAdjustChips(state: GameState, targetUserId: string, amount: number): GameState {
    return {
      ...state,
      players: state.players.map(p => {
        if (p.userId !== targetUserId) return p
        return { ...p, chipStack: Math.max(0, p.chipStack + amount) }
      })
    }
  }

  static adminSitOutPlayer(state: GameState, targetUserId: string): GameState {
    return {
      ...state,
      players: state.players.map(p => {
        if (p.userId !== targetUserId) return p
        return { ...p, status: 'sitting_out', isFolded: true }
      })
    }
  }

  static adminForceFold(state: GameState, targetUserId: string): GameState {
    const player = state.players.find(p => p.userId === targetUserId)
    if (!player || player.isFolded) return state
    return this.applyAction(state, player, { type: 'fold' })
  }

  // ============================================================
  // STRADDLE
  // ============================================================

  static applyStraddle(state: GameState, straddleUserId: string): GameState {
    const straddleAmount = state.settings.bigBlind * 2
    const player = state.players.find(p => p.userId === straddleUserId)
    if (!player) return state

    let newState = this.forceBet(state, player.seatNumber, straddleAmount, 'straddle')
    return {
      ...newState,
      currentBet: straddleAmount,
      minRaise: straddleAmount,
      straddleActive: true,
      straddleSeat: player.seatNumber,
    }
  }
}

export default PokerEngine

// lib/poker/evaluator.ts
// 7-card hand evaluator for Texas Hold'em

import type { Card, HandRank } from './types'

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const SUITS = ['s', 'h', 'd', 'c']

const RANK_VALUE: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
}

export enum HandCategory {
  HIGH_CARD = 1,
  ONE_PAIR,
  TWO_PAIR,
  THREE_OF_A_KIND,
  STRAIGHT,
  FLUSH,
  FULL_HOUSE,
  FOUR_OF_A_KIND,
  STRAIGHT_FLUSH,
  ROYAL_FLUSH,
}

const HAND_NAMES: Record<HandCategory, string> = {
  [HandCategory.HIGH_CARD]: 'High Card',
  [HandCategory.ONE_PAIR]: 'One Pair',
  [HandCategory.TWO_PAIR]: 'Two Pair',
  [HandCategory.THREE_OF_A_KIND]: 'Three of a Kind',
  [HandCategory.STRAIGHT]: 'Straight',
  [HandCategory.FLUSH]: 'Flush',
  [HandCategory.FULL_HOUSE]: 'Full House',
  [HandCategory.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HandCategory.STRAIGHT_FLUSH]: 'Straight Flush',
  [HandCategory.ROYAL_FLUSH]: 'Royal Flush',
}

/**
 * Evaluate the best 5-card hand from up to 7 cards.
 */
export function evaluateHand(cards: Card[]): HandRank {
  if (cards.length < 5) throw new Error('Need at least 5 cards')

  const combinations = getCombinations(cards, 5)
  let bestRank: HandRank | null = null

  for (const combo of combinations) {
    const rank = evaluateFiveCardHand(combo)
    if (!bestRank || compareHands(rank, bestRank) > 0) {
      bestRank = rank
    }
  }

  return bestRank!
}

function evaluateFiveCardHand(cards: Card[]): HandRank {
  const values = cards.map(c => RANK_VALUE[c.rank]).sort((a, b) => b - a)
  const suits = cards.map(c => c.suit)
  const ranks = cards.map(c => c.rank)

  const isFlush = suits.every(s => s === suits[0])
  const isStraight = checkStraight(values)

  const rankCounts: Record<number, number> = {}
  values.forEach(v => { rankCounts[v] = (rankCounts[v] || 0) + 1 })
  const counts = Object.values(rankCounts).sort((a, b) => b - a)
  const pairs = counts.filter(c => c === 2).length
  const hasTrips = counts.includes(3)
  const hasQuads = counts.includes(4)

  if (isFlush && isStraight) {
    if (values[0] === 14 && values[4] === 10) {
      return makeRank(HandCategory.ROYAL_FLUSH, values, 'Royal Flush')
    }
    return makeRank(HandCategory.STRAIGHT_FLUSH, values, `Straight Flush, ${rankName(values[0])} high`)
  }

  if (hasQuads) {
    const quad = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 4))
    return makeRank(HandCategory.FOUR_OF_A_KIND, values, `Four of a Kind, ${rankName(quad)}s`)
  }

  if (hasTrips && pairs >= 1) {
    const trips = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 3))
    const pair = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 2))
    return makeRank(HandCategory.FULL_HOUSE, values, `Full House, ${rankName(trips)}s full of ${rankName(pair)}s`)
  }

  if (isFlush) {
    return makeRank(HandCategory.FLUSH, values, `Flush, ${rankName(values[0])} high`)
  }

  if (isStraight) {
    return makeRank(HandCategory.STRAIGHT, values, `Straight, ${rankName(values[0])} high`)
  }

  if (hasTrips) {
    const trips = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 3))
    return makeRank(HandCategory.THREE_OF_A_KIND, values, `Three of a Kind, ${rankName(trips)}s`)
  }

  if (pairs === 2) {
    const pairRanks = Object.keys(rankCounts)
      .filter(k => rankCounts[Number(k)] === 2)
      .map(Number)
      .sort((a, b) => b - a)
    return makeRank(HandCategory.TWO_PAIR, values, `Two Pair, ${rankName(pairRanks[0])}s and ${rankName(pairRanks[1])}s`)
  }

  if (pairs === 1) {
    const pair = Number(Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 2))
    return makeRank(HandCategory.ONE_PAIR, values, `One Pair, ${rankName(pair)}s`)
  }

  return makeRank(HandCategory.HIGH_CARD, values, `High Card, ${rankName(values[0])}`)
}

function checkStraight(sortedValues: number[]): boolean {
  // Check A-2-3-4-5 (wheel)
  if (sortedValues[0] === 14) {
    const wheel = [5, 4, 3, 2, 1]
    const low = sortedValues.map(v => v === 14 ? 1 : v).sort((a, b) => b - a)
    if (low[0] === 5 && low[4] === 1 && isConsecutive(low)) return true
  }
  return isConsecutive(sortedValues)
}

function isConsecutive(values: number[]): boolean {
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) return false
  }
  return true
}

function makeRank(category: HandCategory, values: number[], description: string): HandRank {
  return { rank: category, values, description }
}

/**
 * Compare two hands. Returns positive if a > b, negative if a < b, 0 if equal.
 */
export function compareHands(a: HandRank, b: HandRank): number {
  if (a.rank !== b.rank) return a.rank - b.rank
  for (let i = 0; i < Math.min(a.values.length, b.values.length); i++) {
    if (a.values[i] !== b.values[i]) return a.values[i] - b.values[i]
  }
  return 0
}

function rankName(value: number): string {
  const names: Record<number, string> = {
    14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack',
    10: 'Ten', 9: 'Nine', 8: 'Eight', 7: 'Seven',
    6: 'Six', 5: 'Five', 4: 'Four', 3: 'Three', 2: 'Two'
  }
  return names[value] || String(value)
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length === 0) return []
  const [first, ...rest] = arr
  const withFirst = getCombinations(rest, k - 1).map(combo => [first, ...combo])
  const withoutFirst = getCombinations(rest, k)
  return [...withFirst, ...withoutFirst]
}

// ============================================================
// lib/poker/deck.ts
// ============================================================

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank: rank as any, suit: suit as any })
    }
  }
  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function dealCards(deck: Card[], count: number): { cards: Card[]; remaining: Card[] } {
  return {
    cards: deck.slice(0, count),
    remaining: deck.slice(count)
  }
}

export function cardToEmoji(card: Card): string {
  const suitEmoji: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
  return `${card.rank}${suitEmoji[card.suit]}`
}

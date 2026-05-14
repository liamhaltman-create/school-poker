export function createDeck() {
  const suits = ['s','h','d','c']
  const ranks = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
  return suits.flatMap(suit => ranks.map(rank => ({ suit, rank })))
}

export function shuffleDeck(deck: any[]) {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

export function dealCards(deck: any[], n: number) {
  return { cards: deck.slice(0, n), remaining: deck.slice(n) }
}

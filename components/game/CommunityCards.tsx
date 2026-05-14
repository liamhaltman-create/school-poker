'use client'
export default function CommunityCards({ cards }: { cards: any[] }) {
  return (
    <div className="flex gap-2 justify-center">
      {[0,1,2,3,4].map(i => {
        const card = cards[i]
        const red = card?.suit === 'h' || card?.suit === 'd'
        return (
          <div key={i} className={`w-12 h-16 rounded-md flex flex-col items-center justify-center text-sm font-bold shadow-lg ${card ? 'bg-white border border-gray-200' : 'bg-green-800/30 border border-green-700/30 border-dashed'}`}>
            {card && <span className={red ? 'text-red-600' : 'text-gray-900'}>{card.rank}{card.suit === 's' ? '♠' : card.suit === 'h' ? '♥' : card.suit === 'd' ? '♦' : '♣'}</span>}
          </div>
        )
      })}
    </div>
  )
}

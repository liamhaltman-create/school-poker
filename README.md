# 🃏 School Poker

A persistent, real-time multiplayer Texas Hold'em platform for private friend groups. Built like PokerNow — but with permanent accounts, saved balances, and long-term tracking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Framer Motion |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime |
| Auth | Supabase Auth |
| Hosting | Netlify |

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/yourname/school-poker
cd school-poker
npm install

# 2. Set environment variables (see .env.example)
cp .env.example .env.local

# 3. Set up Supabase (run schema.sql in your Supabase SQL editor)

# 4. Run dev server
npm run dev
```

---

## Project Structure

```
school-poker/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Home / lobby
│   │   ├── profile/page.tsx
│   │   ├── leaderboard/page.tsx
│   │   └── stats/page.tsx
│   ├── table/
│   │   └── [code]/page.tsx       # Main game page
│   ├── admin/
│   │   └── [code]/page.tsx       # Admin panel
│   ├── api/
│   │   ├── auth/[...supabase]/route.ts
│   │   ├── tables/
│   │   │   ├── route.ts          # GET list, POST create
│   │   │   └── [code]/
│   │   │       ├── route.ts      # GET table info
│   │   │       ├── join/route.ts
│   │   │       └── settings/route.ts
│   │   ├── game/
│   │   │   ├── action/route.ts   # POST player action
│   │   │   ├── start/route.ts    # POST start hand
│   │   │   └── state/route.ts    # GET game state
│   │   ├── admin/
│   │   │   ├── chips/route.ts
│   │   │   ├── blinds/route.ts
│   │   │   ├── kick/route.ts
│   │   │   └── logs/route.ts
│   │   └── stats/
│   │       ├── leaderboard/route.ts
│   │       └── export/route.ts
│   └── layout.tsx
├── components/
│   ├── game/
│   │   ├── PokerTable.tsx        # Main table component
│   │   ├── PlayerSeat.tsx
│   │   ├── CommunityCards.tsx
│   │   ├── ActionPanel.tsx
│   │   ├── PotDisplay.tsx
│   │   ├── DealAnimation.tsx
│   │   ├── ChipStack.tsx
│   │   ├── Timer.tsx
│   │   └── SidePot.tsx
│   ├── admin/
│   │   ├── AdminPanel.tsx
│   │   ├── ChipEditor.tsx
│   │   ├── BlindsEditor.tsx
│   │   └── AdminLogs.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── Avatar.tsx
│   ├── lobby/
│   │   ├── TableCard.tsx
│   │   └── CreateTableModal.tsx
│   ├── chat/
│   │   └── ChatPanel.tsx
│   ├── stats/
│   │   ├── StatsChart.tsx
│   │   └── LeaderboardTable.tsx
│   └── SchoolMode.tsx            # Quick-hide component
├── lib/
│   ├── poker/
│   │   ├── engine.ts             # Core game logic (server-authoritative)
│   │   ├── evaluator.ts          # Hand evaluator
│   │   ├── deck.ts               # Card deck management
│   │   ├── sidepots.ts           # Side pot calculations
│   │   └── types.ts              # Poker types
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client
│   │   └── middleware.ts
│   ├── realtime/
│   │   └── tableChannel.ts       # Supabase realtime subscriptions
│   └── utils/
│       ├── format.ts
│       └── constants.ts
├── hooks/
│   ├── usePokerTable.ts          # Main table state hook
│   ├── useGameActions.ts         # Player action hook
│   ├── useAdminControls.ts
│   └── useRealtimeSync.ts
├── store/
│   └── gameStore.ts              # Zustand store
├── types/
│   └── index.ts
├── supabase/
│   ├── schema.sql                # Full DB schema
│   ├── rls.sql                   # Row Level Security policies
│   └── functions/
│       ├── update_player_stats.sql
│       └── calculate_leaderboard.sql
├── middleware.ts                 # Auth middleware
├── .env.example
├── tailwind.config.ts
├── netlify.toml
└── package.json
```

---

## Environment Variables

See `.env.example` for all required variables.

---

## Deployment

See `DEPLOYMENT.md` for full Netlify deployment instructions.

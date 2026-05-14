// app/api/game/action/route.ts
// Server-authoritative action processing

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { PokerEngine } from '@/lib/poker/engine'
import type { Action } from '@/lib/poker/types'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { tableCode, action }: { tableCode: string; action: Action } = body

  if (!tableCode || !action) {
    return NextResponse.json({ error: 'Missing tableCode or action' }, { status: 400 })
  }

  // Fetch table with game state
  const { data: table, error: tableError } = await supabase
    .from('poker_tables')
    .select('*, table_members(*)')
    .eq('code', tableCode)
    .single()

  if (tableError || !table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 })
  }

  // Verify player is a member
  const member = table.table_members?.find((m: any) => m.user_id === user.id)
  if (!member || member.status === 'banned' || member.status === 'left') {
    return NextResponse.json({ error: 'Not a member of this table' }, { status: 403 })
  }

  // Verify game is in progress
  if (table.status !== 'playing' || !table.game_state) {
    return NextResponse.json({ error: 'No active game' }, { status: 400 })
  }

  const gameState = table.game_state

  // Process action through engine
  const { newState, valid, error } = PokerEngine.processAction(gameState, user.id, action)

  if (!valid) {
    return NextResponse.json({ error }, { status: 400 })
  }

  // Handle hand completion
  let finalState = newState
  if (newState.phase === 'hand_complete' && newState.winners) {
    // Record transactions for winners
    for (const winner of newState.winners) {
      await supabase.from('transactions').insert({
        table_id: table.id,
        user_id: winner.userId,
        amount: winner.amount,
        type: 'win',
        reason: `Won pot ${winner.potNumber}: ${winner.handDescription}`,
      })
    }

    // Update member chip stacks
    for (const player of newState.players) {
      await supabase
        .from('table_members')
        .update({ chip_stack: player.chipStack })
        .eq('table_id', table.id)
        .eq('user_id', player.userId)
    }

    // Record hand history
    await supabase.from('hands').insert({
      table_id: table.id,
      hand_number: newState.handNumber,
      dealer_seat: newState.dealerSeat,
      small_blind_seat: newState.smallBlindSeat,
      big_blind_seat: newState.bigBlindSeat,
      small_blind_amount: newState.settings.smallBlind,
      big_blind_amount: newState.settings.bigBlind,
      ante_amount: newState.settings.ante,
      community_cards: newState.communityCards,
      total_pot: newState.pots.reduce((s, p) => s + p.amount, 0),
      players_snapshot: newState.players,
      winners: newState.winners,
      ended_at: new Date().toISOString(),
    })
  }

  // Record the action
  await supabase.from('hand_actions').insert({
    hand_id: null, // would need to track current hand ID
    user_id: user.id,
    action_type: action.type,
    amount: action.amount ?? 0,
    street: gameState.street,
    sequence: gameState.actionHistory.length,
  }).select()

  // Save new game state
  const { error: updateError } = await supabase
    .from('poker_tables')
    .update({
      game_state: finalState,
      updated_at: new Date().toISOString(),
    })
    .eq('id', table.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save game state' }, { status: 500 })
  }

  // Broadcast via Supabase Realtime (happens automatically via DB change)
  return NextResponse.json({ success: true, gameState: sanitizeGameState(finalState, user.id) })
}

// Remove other players' hole cards before sending to client
function sanitizeGameState(state: any, viewerUserId: string) {
  return {
    ...state,
    deck: undefined, // never send deck to client
    players: state.players.map((p: any) => ({
      ...p,
      holeCards: p.userId === viewerUserId ? p.holeCards : p.holeCards.map(() => ({ rank: '?', suit: '?' })),
    }))
  }
}

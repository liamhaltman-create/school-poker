'use client'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

export function usePokerTable(tableCode: string, userId: string) {
  const supabase = createBrowserClient()
  const [gameState, setGameState] = useState<any>(null)
  const [tableInfo, setTableInfo] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadTable = useCallback(async () => {
    const { data: table } = await supabase
      .from('poker_tables')
      .select('*, table_members(*, profiles(id, username, display_name, avatar_url))')
      .eq('code', tableCode)
      .single()
    if (table) {
      setTableInfo(table)
      setMembers(table.table_members ?? [])
      if (table.game_state) setGameState(table.game_state)
    }
    setLoading(false)
  }, [tableCode, supabase])

  useEffect(() => { loadTable() }, [loadTable])

  return { gameState, tableInfo, members, loading, reload: loadTable }
}

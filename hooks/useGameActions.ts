'use client'
import { useCallback, useRef } from 'react'

export function useGameActions(tableCode: string) {
  const pendingRef = useRef(false)

  const submitAction = useCallback(async (action: any) => {
    if (pendingRef.current) return
    pendingRef.current = true
    try {
      await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableCode, action }),
      })
    } finally {
      pendingRef.current = false
    }
  }, [tableCode])

  const startHand = useCallback(async () => {
    await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableCode }),
    })
  }, [tableCode])

  return { submitAction, startHand }
}

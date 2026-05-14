'use client'
import { useState, useEffect } from 'react'
export default function Timer({ seconds, onTimeout }: { seconds: number; onTimeout: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  useEffect(() => {
    setRemaining(seconds)
    const interval = setInterval(() => {
      setRemaining(prev => { if (prev <= 1) { clearInterval(interval); onTimeout(); return 0 } return prev - 1 })
    }, 1000)
    return () => clearInterval(interval)
  }, [seconds])
  const color = remaining > seconds * 0.5 ? '#22c55e' : remaining > seconds * 0.25 ? '#eab308' : '#ef4444'
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="none" stroke="#1f2937" strokeWidth="4" />
      <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - remaining / seconds)}`}
        transform="rotate(-90 24 24)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
      <text x="24" y="28" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{remaining}</text>
    </svg>
  )
}

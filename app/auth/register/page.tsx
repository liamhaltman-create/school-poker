'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const supabase = createBrowserClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.toLowerCase(), display_name: username } }
    })
    if (error) { setError(error.message) } else { router.push('/') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🃏</div>
          <h1 className="text-3xl font-bold text-white">School Poker</h1>
        </div>
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-white font-bold text-xl mb-6">Create Account</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Username" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Password (min 8 chars)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold text-sm">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-6">Already have an account? <Link href="/auth/login" className="text-green-400">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}

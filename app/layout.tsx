// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'School Poker',
  description: 'Private multiplayer Texas Hold\'em with persistent accounts and chip tracking.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#030712',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}

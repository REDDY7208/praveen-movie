import type { Metadata } from 'next'
import './globals.css'
import SplashScreen from '@/components/SplashScreen'
import AiChat from '@/components/AiChat'

export const metadata: Metadata = {
  title: 'TP — Thilaveen',
  description: 'Stream movies',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SplashScreen />
        {children}
        <AiChat />
      </body>
    </html>
  )
}

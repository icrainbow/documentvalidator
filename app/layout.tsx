import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Investment Assistant Demo',
  description: 'Multi-agent document evaluation demo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


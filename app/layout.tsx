import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500'] })

export const metadata: Metadata = {
  title: 'BodyFitAI — AI-Powered Fitness Analysis',
  description: 'Enter your body measurements and goals. Get a personalized calorie, macro, and fat loss plan powered by AI.',
  keywords: 'fitness, body fat calculator, calorie calculator, macro calculator, AI fitness',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={dmSans.className}>{children}</body>
    </html>
  )
}

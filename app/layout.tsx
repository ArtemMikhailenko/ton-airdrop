// app/layout.tsx
import './globals.css'
import Providers from './providers'

export const metadata = {
  title: 'TON Airdrop Manager',
  description: 'Deploy and manage jetton airdrops on TON blockchain',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        {/* Здесь обёртка, которая уже подгрузит всё клиентское */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

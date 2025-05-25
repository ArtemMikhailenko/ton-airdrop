// app/providers.tsx
'use client'

import React from 'react'
import { Toaster } from 'react-hot-toast'
import { TonConnectUIProvider } from '@tonconnect/ui-react'

interface ProvidersProps {
  children: React.ReactNode
}

export default function Providers({ children }: ProvidersProps) {
    const manifestUrl = process.env.NEXT_PUBLIC_MANIFEST_URL!
    
      if (!manifestUrl) {
        throw new Error('NEXT_PUBLIC_MANIFEST_URL is not defined')
      }
    
      return (
        <>
          <TonConnectUIProvider
            manifestUrl="https://ton-airdrop-three.vercel.app/tonconnect-manifest.json"
            
          >
            {children}
          </TonConnectUIProvider>
    
          <Toaster position="top-right" />
        </>
     )
}

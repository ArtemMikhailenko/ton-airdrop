'use client'

import { useState, useEffect } from 'react'
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react'
import toast from 'react-hot-toast'
import styles from './page.module.css'
import DeployTab from '@/components/DeployTab/DeployTab'
import ClaimTab from '@/components/ClaimTab/ClaimTab'
import StatusTab from '@/components/StatusTab/StatusTab'

type TabType = 'deploy' | 'claim' | 'status'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('deploy')
  const [tonConnectUI] = useTonConnectUI()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const checkConnection = () => {
      setConnected(tonConnectUI.connected)
    }
    
    checkConnection()
    const unsubscribe = tonConnectUI.onStatusChange(checkConnection)
    
    return () => unsubscribe()
  }, [tonConnectUI])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🎁 TON Airdrop Manager</h1>
        <p>Deploy and manage your jetton airdrops on TON Testnet</p>
        <div className={styles.connectButton}>
          <TonConnectButton />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'deploy' ? styles.active : ''}`}
              onClick={() => setActiveTab('deploy')}
            >
              🚀 Deploy Airdrop
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'claim' ? styles.active : ''}`}
              onClick={() => setActiveTab('claim')}
            >
              💰 Claim Tokens
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'status' ? styles.active : ''}`}
              onClick={() => setActiveTab('status')}
            >
              📊 Status
            </button>
          </div>

          <div className={styles.tabContent}>
            {!connected ? (
              <div className={styles.connectPrompt}>
                <h2>🔌 Connect Your Wallet</h2>
                <p>Please connect your TON wallet to continue</p>
              </div>
            ) : (
              <>
                {activeTab === 'deploy' && <DeployTab />}
                {activeTab === 'claim' && <ClaimTab />}
                {activeTab === 'status' && <StatusTab />}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
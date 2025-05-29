'use client'

import { useState, useEffect } from 'react'
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react'
import styles from './page.module.css'
import DeployTab from '@/components/DeployTab/DeployTab'
import ClaimTab from '@/components/ClaimTab/ClaimTab'
import StatusTab from '@/components/StatusTab/StatusTab'
import SimpleMassTransfer from '@/components/SimpleMassTransfer/SimpleMassTransfer' // 🔄 НОВЫЙ ИМПОРТ

type TabType = 'mass-transfer' | 'deploy' | 'claim' | 'status' // 🔄 Добавили новую вкладку

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('mass-transfer') // 🔄 По умолчанию новая вкладка
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
        <p>Send tokens to multiple recipients easily</p>
        <div className={styles.connectButton}>
          <TonConnectButton />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.tabs}>
            {/* 🔄 НОВАЯ ВКЛАДКА */}
            <button
              className={`${styles.tab} ${activeTab === 'mass-transfer' ? styles.active : ''}`}
              onClick={() => setActiveTab('mass-transfer')}
            >
              🚀 Mass Transfer
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'deploy' ? styles.active : ''}`}
              onClick={() => setActiveTab('deploy')}
            >
              📝 Deploy Airdrop
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
                {/* 🔄 НОВЫЙ КОМПОНЕНТ */}
                {activeTab === 'mass-transfer' && <SimpleMassTransfer />}
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
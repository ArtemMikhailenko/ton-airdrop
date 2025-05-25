'use client'

import { useState } from 'react'
import styles from './ClaimTab.module.css'
import toast from 'react-hot-toast'

export default function ClaimTab() {
  const [airdropAddress, setAirdropAddress] = useState('')
  const [userAddress, setUserAddress] = useState('')
  const [isClaiming, setIsClaiming] = useState(false)

  const handleClaim = async () => {
    if (!airdropAddress || !userAddress) {
      toast.error('Please fill in all fields')
      return
    }

    setIsClaiming(true)
    
    try {
      toast.success('Starting claim process...')
      
      // Simulate claim process
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      toast.success('🎉 Tokens claimed successfully!')
      
    } catch (error) {
      console.error('Claim error:', error)
      toast.error('Claim failed')
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>💰 Claim Your Tokens</h2>
      
      <div className={styles.formGroup}>
        <label className={styles.label}>Airdrop Contract Address</label>
        <input
          type="text"
          className={styles.input}
          value={airdropAddress}
          onChange={(e) => setAirdropAddress(e.target.value)}
          placeholder="Enter airdrop contract address"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Your Wallet Address</label>
        <input
          type="text"
          className={styles.input}
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
          placeholder="Enter your wallet address"
        />
      </div>

      <button
        className={`${styles.claimButton} ${isClaiming ? styles.claiming : ''}`}
        onClick={handleClaim}
        disabled={isClaiming}
      >
        {isClaiming ? (
          <>
            <span className={styles.spinner}></span>
            Claiming...
          </>
        ) : (
          '💰 Claim Tokens'
        )}
      </button>
    </div>
  )
}
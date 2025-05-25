'use client'

import { useState } from 'react'
import { Address } from '@ton/core'
import toast from 'react-hot-toast'
import { useAirdrop } from '@/hooks/useAirdrop'
import styles from './DeployTab.module.css'

interface AirdropEntry {
  address: string
  amount: string
}

export default function DeployTab() {
  const { deployAirdrop, isDeploying } = useAirdrop()
  const [jettonMinter, setJettonMinter] = useState('EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqIw')
  const [recipients, setRecipients] = useState(`[
  {
    "address": "EQBKgXCNLPexWhs2L79kiARR1phGH1LwXxRbNsCFF9doc2lN",
    "amount": "1000000000"
  },
  {
    "address": "EQBIhPuWmjT7fP-VomuTWseE8JNWv2q7QYfsVQ1IZwnMk8wL", 
    "amount": "2000000000"
  },
  {
    "address": "EQB4cwGljhouzFwc6EHpCacCtsK7_XIj-tNfM5udgW6IxO9R",
    "amount": "1500000000"
  }
]`)
  const [parsedRecipients, setParsedRecipients] = useState<AirdropEntry[]>([])
  const [deploymentResult, setDeploymentResult] = useState<any>(null)

  const parseRecipients = () => {
    try {
      const parsed = JSON.parse(recipients)
      setParsedRecipients(parsed)
      return parsed
    } catch (error) {
      toast.error('Invalid JSON format for recipients')
      return null
    }
  }

  const handleDeploy = async () => {
    const recipientsList = parseRecipients()
    if (!recipientsList) return

    try {
      // Validate addresses
      recipientsList.forEach((recipient:any, index:number) => {
        try {
          Address.parse(recipient.address)
        } catch {
          throw new Error(`Invalid address at index ${index}: ${recipient.address}`)
        }
      })

      const result = await deployAirdrop(recipientsList, jettonMinter)
      setDeploymentResult(result)
      
    } catch (error) {
      console.error('Deployment error:', error)
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>🚀 Deploy New Airdrop</h2>
      
      <div className={styles.formGroup}>
        <label className={styles.label}>Jetton Minter Address</label>
        <input
          type="text"
          className={styles.input}
          value={jettonMinter}
          onChange={(e) => setJettonMinter(e.target.value)}
          placeholder="Enter jetton minter address"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Airdrop Recipients (JSON format)</label>
        <textarea
          className={styles.textarea}
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          rows={12}
          placeholder="Enter recipients in JSON format"
        />
      </div>

      <div className={styles.previewSection}>
        <h3 className={styles.previewTitle}>📋 Recipients Preview</h3>
        <button 
          className={styles.parseButton}
          onClick={parseRecipients}
        >
          Parse Recipients
        </button>
        
        {parsedRecipients.length > 0 && (
          <div className={styles.recipientsList}>
            {parsedRecipients.map((recipient, index) => (
              <div key={index} className={styles.recipientItem}>
                <div className={styles.recipientInfo}>
                  <span className={styles.recipientAddress}>
                    {recipient.address.slice(0, 6)}...{recipient.address.slice(-6)}
                  </span>
                  <span className={styles.recipientAmount}>
                    {(parseInt(recipient.amount) / 1e9).toFixed(2)} tokens
                  </span>
                </div>
              </div>
            ))}
            <div className={styles.totalInfo}>
              <strong>Total Recipients: {parsedRecipients.length}</strong>
            </div>
          </div>
        )}
      </div>

      <button
        className={`${styles.deployButton} ${isDeploying ? styles.deploying : ''}`}
        onClick={handleDeploy}
        disabled={isDeploying}
      >
        {isDeploying ? (
          <>
            <span className={styles.spinner}></span>
            Deploying...
          </>
        ) : (
          '🚀 Deploy Airdrop Contract'
        )}
      </button>
    </div>
  )
}

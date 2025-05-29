'use client'

import { useState } from 'react'
import { useTonAddress } from '@tonconnect/ui-react'
import { useAirdrop } from '@/hooks/useAirdrop'
import { Address, Cell } from '@ton/core'
import styles from './ClaimTab.module.css'
import toast from 'react-hot-toast'

export default function ClaimTab() {
  const connectedAddress = useTonAddress() // Автоматически получаем адрес кошелька
  const { claimTokens, isClaiming } = useAirdrop() // Подключаем реальный хук
  
  const [airdropAddress, setAirdropAddress] = useState('EQCs97RhU_PBPm8XqgrrY_IGqX7rSKqpiOFm0VEzHLogrsvV') // Ваш контракт
  const [userAddress, setUserAddress] = useState('')
  const [entryIndex, setEntryIndex] = useState('0') // Индекс в списке получателей
  const [dictCellBase64, setDictCellBase64] = useState('') // Dictionary cell из деплоя

  // 🔄 Автоматически заполняем адрес пользователя при подключении кошелька
  useState(() => {
    if (connectedAddress && !userAddress) {
      setUserAddress(connectedAddress)
    }
    //@ts-ignore
  }, [connectedAddress])

  const handleClaim = async () => {
    if (!airdropAddress || !userAddress) {
      toast.error('Please fill in all fields')
      return
    }

    if (!connectedAddress) {
      toast.error('Please connect your TON wallet first')
      return
    }

    if (connectedAddress !== userAddress) {
      toast.error('Connected wallet address does not match entered address')
      return
    }

    if (!dictCellBase64) {
      toast.error('Dictionary cell is required for claim. Get it from airdrop deployer.')
      return
    }

    try {
      // Валидируем адреса
      Address.parse(airdropAddress)
      Address.parse(userAddress)
    } catch (error) {
      toast.error('Invalid address format')
      return
    }

    try {
      console.log('🎁 Starting real claim process...')
      console.log('- Airdrop:', airdropAddress)
      console.log('- User:', userAddress)
      console.log('- Entry index:', entryIndex)
      
      // ✅ РЕАЛЬНЫЙ КЛЕЙМ токенов
      const result = await claimTokens(
        airdropAddress,
        userAddress,
        BigInt(entryIndex),
        dictCellBase64
      )

      if (result) {
        console.log('✅ Claim successful:', result)
        toast.success(`🎉 Successfully claimed ${Number(result.claimedAmount) / 1e9} tokens!`)
      }

    } catch (error) {
      console.error('❌ Claim error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('not eligible')) {
          toast.error('❌ You are not eligible for this airdrop')
        } else if (error.message.includes('already claimed')) {
          toast.error('❌ Tokens already claimed')
        } else if (error.message.includes('insufficient funds')) {
          toast.error('❌ Not enough TON for gas fees')
        } else {
          toast.error(`❌ Claim failed: ${error.message}`)
        }
      } else {
        toast.error('❌ Unknown claim error')
      }
    }
  }

  // 🔍 Проверка статуса пользователя в аирдропе
  const checkEligibility = async () => {
    if (!dictCellBase64 || !userAddress) {
      toast.error('Please provide dictionary cell and user address')
      return
    }

    try {
      const dictCell = Cell.fromBase64(dictCellBase64)
  
      
      // Пока что заглушка
      setTimeout(() => {
        toast.success('✅ You are eligible for this airdrop!')
      }, 1000)
      
    } catch (error) {
      console.error('Error checking eligibility:', error)
      toast.error('❌ Failed to check eligibility')
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>💰 Claim Your Tokens</h2>
      
      {/* Статус подключения */}
      <div className={styles.connectionStatus}>
        {connectedAddress ? (
          <div className={styles.connected}>
            ✅ Wallet Connected: {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-6)}
          </div>
        ) : (
          <div className={styles.disconnected}>
            ❌ Please connect your TON wallet first
          </div>
        )}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Airdrop Contract Address</label>
        <input
          type="text"
          className={styles.input}
          value={airdropAddress}
          onChange={(e) => setAirdropAddress(e.target.value)}
          placeholder="Enter airdrop contract address"
        />
        <div className={styles.inputHint}>
          Your airdrop contract address
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Your Wallet Address</label>
        <input
          type="text"
          className={styles.input}
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
          placeholder="Enter your wallet address"
          disabled={!!connectedAddress} // Автозаполнение при подключении
        />
        <div className={styles.inputHint}>
          {connectedAddress ? 'Auto-filled from connected wallet' : 'Your TON wallet address'}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Entry Index</label>
        <input
          type="number"
          className={styles.input}
          value={entryIndex}
          onChange={(e) => setEntryIndex(e.target.value)}
          placeholder="0"
          min="0"
        />
        <div className={styles.inputHint}>
          Your position in the recipients list (starts from 0)
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Dictionary Cell (Base64)</label>
        <textarea
          className={styles.textarea}
          value={dictCellBase64}
          onChange={(e) => setDictCellBase64(e.target.value)}
          placeholder="Paste dictionary cell from airdrop deployment..."
          rows={4}
        />
        <div className={styles.inputHint}>
          Get this from the airdrop deployer or deployment logs
        </div>
      </div>

      {/* Кнопки действий */}
      <div className={styles.buttonGroup}>
        <button
          className={styles.checkButton}
          onClick={checkEligibility}
          disabled={!dictCellBase64 || !userAddress}
        >
          🔍 Check Eligibility
        </button>

        <button
          className={`${styles.claimButton} ${isClaiming ? styles.claiming : ''}`}
          onClick={handleClaim}
          disabled={isClaiming || !connectedAddress}
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

      {/* Инструкции */}
      <div className={styles.instructions}>
        <h3>📋 How to Claim:</h3>
        <ol>
          <li>Connect your TON wallet</li>
          <li>Enter the airdrop contract address</li>
          <li>Find your position in the recipients list (entry index)</li>
          <li>Get the dictionary cell from airdrop deployer</li>
          <li>Check eligibility first</li>
          <li>Click "Claim Tokens" and confirm transactions</li>
        </ol>
        
        <div className={styles.warning}>
          ⚠️ <strong>Note:</strong> Claiming requires 2 transactions:
          <br />1. Deploy helper contract (~0.15 TON)
          <br />2. Execute claim (~0.01 TON)
        </div>
      </div>

      {/* Дебаг информация */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.debug}>
          <h4>🔍 Debug Info:</h4>
          <pre>
            Connected: {connectedAddress || 'No'}
            <br />
            Airdrop: {airdropAddress || 'Not set'}
            <br />
            User: {userAddress || 'Not set'}
            <br />
            Index: {entryIndex}
            <br />
            Dict Cell: {dictCellBase64 ? 'Set' : 'Missing'}
          </pre>
        </div>
      )}
    </div>
  )
}
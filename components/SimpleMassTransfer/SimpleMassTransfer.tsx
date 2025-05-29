'use client'

import { useState } from 'react';
import { useMassTransfer } from '@/hooks/useMassTransfer';  
import { Address } from '@ton/core';
import toast from 'react-hot-toast';
import styles from './SimpleMassTransfer.module.css';

export default function SimpleMassTransfer() {
    const { sendToAllWithMnemonic, initWallet, isSending, progress, walletAddress } = useMassTransfer();
    
    const [jettonMinter, setJettonMinter] = useState('EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqIw');
    const [mnemonic, setMnemonic] = useState('');
    const [showMnemonic, setShowMnemonic] = useState(false);
    
    // ✅ ОБНОВЛЕННЫЙ JSON с простыми суммами (без 9 нулей)
    const [recipientsJson, setRecipientsJson] = useState(`[
  {
    "address": "EQBKgXCNLPexWhs2L79kiARR1phGH1LwXxRbNsCFF9doc2lN",
    "amount": "1"
  },
  {
    "address": "EQBIhPuWmjT7fP-VomuTWseE8JNWv2q7QYfsVQ1IZwnMk8wL",
    "amount": "2.5"
  },
  {
    "address": "EQB4cwGljhouzFwc6EHpCacCtsK7_XIj-tNfM5udgW6IxO9R",
    "amount": "0.5"
  }
]`);

    const handleSendToAll = async () => {
        if (!mnemonic.trim()) {
            toast.error('Please enter your mnemonic phrase');
            return;
        }

        try {
            // Парсим и валидируем JSON
            const recipients = JSON.parse(recipientsJson);
            
            if (!Array.isArray(recipients) || recipients.length === 0) {
                toast.error('Recipients must be a non-empty array');
                return;
            }

            // Валидация каждого получателя
            for (let i = 0; i < recipients.length; i++) {
                const r = recipients[i];
                
                if (!r.address || !r.amount) {
                    toast.error(`Missing address or amount at position ${i + 1}`);
                    return;
                }
                
                try {
                    Address.parse(r.address);
                } catch {
                    toast.error(`Invalid address at position ${i + 1}: ${r.address}`);
                    return;
                }

                const amount = parseFloat(r.amount);
                if (isNaN(amount) || amount <= 0) {
                    toast.error(`Invalid amount at position ${i + 1}: ${r.amount}`);
                    return;
                }
            }

            // Предупреждение о стоимости
            const totalTokens = recipients.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
            const gasNeeded = recipients.length * 0.08; // 0.08 TON за перевод
            
            const confirmed = confirm(
                `🚀 MASS TRANSFER CONFIRMATION\n\n` +
                `Recipients: ${recipients.length}\n` +
                `Total tokens to send: ${totalTokens.toFixed(2)}\n` +
                `Estimated gas cost: ~${gasNeeded.toFixed(2)} TON\n` +
                `Each recipient = separate transaction\n\n` +
                `⚠️ Make sure your wallet has:\n` +
                `• ${totalTokens.toFixed(2)} jetton tokens\n` +
                `• ~${gasNeeded.toFixed(2)} TON for gas fees\n\n` +
                `Continue?`
            );

            if (!confirmed) {
                return;
            }

            // ✅ ОТПРАВЛЯЕМ через мнемонику
            await sendToAllWithMnemonic(recipients, jettonMinter, mnemonic);

        } catch (error) {
            console.error('❌ Send error:', error);
            if (error instanceof Error) {
                if (error.message.includes('JSON')) {
                    toast.error('❌ Invalid JSON format');
                } else if (error.message.includes('mnemonic')) {
                    toast.error('❌ Invalid mnemonic phrase');
                } else {
                    toast.error(`❌ Error: ${error.message}`);
                }
            } else {
                toast.error('❌ Unknown error');
            }
        }
    };

    const parseAndPreview = () => {
        try {
            const recipients = JSON.parse(recipientsJson);
            
            if (!Array.isArray(recipients)) {
                toast.error('❌ JSON must be an array');
                return;
            }
            
            const total = recipients.reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0);
            const gasEstimate = recipients.length * 0.08;
            
            toast.success(
                `✅ Valid JSON!\n` +
                `Recipients: ${recipients.length}\n` +
                `Total tokens: ${total.toFixed(2)}\n` +
                `Gas needed: ~${gasEstimate.toFixed(2)} TON`,
                { duration: 4000 }
            );
        } catch (error) {
            toast.error('❌ Invalid JSON format');
        }
    };

    const testMnemonic = async () => {
        if (!mnemonic.trim()) {
            toast.error('Please enter mnemonic first');
            return;
        }

        try {
            const { address } = await initWallet(mnemonic);
            toast.success(`✅ Wallet initialized: ${address.slice(0, 6)}...${address.slice(-6)}`);
        } catch (error) {
            toast.error('❌ Invalid mnemonic phrase');
        }
    };

    const cleanJson = () => {
        setRecipientsJson(`[
  {
    "address": "",
    "amount": "1"
  }
]`);
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>🚀 Mass Transfer with Mnemonic</h1>
            <p className={styles.subtitle}>Send tokens using your seed phrase - no wallet connection needed!</p>

            {/* Wallet Status */}
            <div className={styles.status}>
                {walletAddress ? (
                    <div className={styles.connected}>
                        ✅ Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
                    </div>
                ) : (
                    <div className={styles.disconnected}>
                        🔑 Enter mnemonic to initialize wallet
                    </div>
                )}
            </div>

            {/* Mnemonic Input */}
            <div className={styles.formGroup}>
                <label className={styles.label}>
                    🔐 Mnemonic Phrase (24 words)
                    <button 
                        type="button"
                        className={styles.toggleButton}
                        onClick={() => setShowMnemonic(!showMnemonic)}
                    >
                        {showMnemonic ? '👁️ Hide' : '👁️‍🗨️ Show'}
                    </button>
                </label>
                <textarea
                    className={styles.mnemonicInput}
                    value={mnemonic}
                    onChange={(e) => setMnemonic(e.target.value)}
                    //@ts-ignore
                    type={showMnemonic ? 'text' : 'password'}
                    placeholder="word1 word2 word3 ... word24"
                    rows={3}
                    style={{ 
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        filter: showMnemonic ? 'none' : 'blur(3px)'
                    }}
                />
                <div className={styles.buttonRow}>
                    <button
                        className={styles.testButton}
                        onClick={testMnemonic}
                        type="button"
                    >
                        🧪 Test Mnemonic
                    </button>
                    <div className={styles.inputHint}>
                        Your 24-word recovery phrase
                    </div>
                </div>
            </div>

            {/* Jetton Minter */}
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

            {/* Recipients JSON */}
            <div className={styles.formGroup}>
                <label className={styles.label}>
                    Recipients JSON 
                    <span className={styles.highlight}>(Simple amounts: 1, 2.5, 0.5)</span>
                </label>
                <textarea
                    className={styles.textarea}
                    value={recipientsJson}
                    onChange={(e) => setRecipientsJson(e.target.value)}
                    rows={12}
                    placeholder="Enter recipients with simple amounts..."
                />
                
                <div className={styles.buttonRow}>
                    <button
                        className={styles.validateButton}
                        onClick={parseAndPreview}
                        type="button"
                    >
                        🔍 Validate JSON
                    </button>
                    <button
                        className={styles.clearButton}
                        onClick={cleanJson}
                        type="button"
                    >
                        📝 Template
                    </button>
                </div>
                
                <div className={styles.inputHint}>
                    ✅ Use simple amounts: "1", "2.5", "0.5" (no need for 9 zeros!)
                </div>
            </div>

            {/* Progress */}
            {isSending && (
                <div className={styles.progressSection}>
                    <div className={styles.progressBar}>
                        <div 
                            className={styles.progressFill}
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    <div className={styles.progressText}>
                        Sending... {progress.current} / {progress.total} recipients
                    </div>
                </div>
            )}

            {/* Send Button */}
            <button
                className={`${styles.sendButton} ${isSending ? styles.sending : ''}`}
                onClick={handleSendToAll}
                disabled={isSending || !mnemonic.trim()}
            >
                {isSending ? (
                    <>
                        <span className={styles.spinner}></span>
                        Sending...
                    </>
                ) : (
                    '🚀 Send to All Recipients'
                )}
            </button>

            {/* Instructions */}
            <div className={styles.instructions}>
                <h3>📋 New Features:</h3>
                <ul>
                    <li>✅ <strong>No wallet connection</strong> - Use mnemonic directly</li>
                    <li>✅ <strong>Simple amounts</strong> - Write "1.5" instead of "1500000000"</li>
                    <li>✅ <strong>Lower gas costs</strong> - ~0.08 TON per transfer</li>
                    <li>✅ <strong>Direct transactions</strong> - No browser wallet needed</li>
                </ul>
                
                <div className={styles.warning}>
                    ⚠️ <strong>Security:</strong> 
                    <br />• Keep your mnemonic phrase secure
                    <br />• Use only on trusted devices
                    <br />• Consider using a separate wallet for mass transfers
                </div>
            </div>
        </div>
    );
}
'use client'

import { useState } from 'react';
import { useMassTransfer } from '@/hooks/useMassTransfer';
import { Address } from '@ton/core';
import toast from 'react-hot-toast';
import styles from './SimpleMassTransfer.module.css';

export default function SimpleMassTransfer() {
    const { sendToAll, getUserJettonWallet, isSending, progress, userAddress, isConnected } = useMassTransfer();
    
    const [jettonMinter, setJettonMinter] = useState('EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqIw');
    const [recipientsJson, setRecipientsJson] = useState(`[
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
]`);

    const handleSendToAll = async () => {
        if (!isConnected) {
            toast.error('Please connect your wallet');
            return;
        }

        try {
            // Парсим JSON
            const recipients = JSON.parse(recipientsJson);
            
            // Валидируем адреса
            recipients.forEach((r: any, i: number) => {
                try {
                    Address.parse(r.address);
                } catch {
                    throw new Error(`Invalid address at position ${i + 1}: ${r.address}`);
                }
            });

            // Получаем адрес jetton кошелька пользователя
            const userJettonWallet = await getUserJettonWallet(jettonMinter);
            if (!userJettonWallet) {
                toast.error('Could not get your jetton wallet address');
                return;
            }

            console.log('💼 User jetton wallet:', userJettonWallet);

            // Отправляем всем!
            await sendToAll(recipients, userJettonWallet);

        } catch (error) {
            console.error('❌ Send error:', error);
            if (error instanceof Error) {
                if (error.message.includes('JSON')) {
                    toast.error('❌ Invalid JSON format');
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
            const total = recipients.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
            
            toast.success(`✅ Valid JSON: ${recipients.length} recipients, ${(total / 1e9).toFixed(2)} total tokens`);
        } catch {
            toast.error('❌ Invalid JSON format');
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>🚀 Simple Mass Token Transfer</h1>
            <p className={styles.subtitle}>Paste JSON → Click Send → Tokens delivered!</p>

            {/* Статус подключения */}
            <div className={styles.status}>
                {isConnected ? (
                    <div className={styles.connected}>
                        ✅ Connected: {userAddress?.slice(0, 6)}...{userAddress?.slice(-6)}
                    </div>
                ) : (
                    <div className={styles.disconnected}>
                        ❌ Please connect your TON wallet
                    </div>
                )}
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
                <label className={styles.label}>Recipients JSON</label>
                <textarea
                    className={styles.textarea}
                    value={recipientsJson}
                    onChange={(e) => setRecipientsJson(e.target.value)}
                    rows={12}
                    placeholder="Paste your recipients JSON here..."
                />
                <button
                    className={styles.previewButton}
                    onClick={parseAndPreview}
                    type="button"
                >
                    🔍 Validate JSON
                </button>
            </div>

            {/* Progress */}
            {isSending && (
                <div className={styles.progress}>
                    <div className={styles.progressBar}>
                        <div 
                            className={styles.progressFill}
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    <div className={styles.progressText}>
                        Sending... {progress.current} / {progress.total}
                    </div>
                </div>
            )}

            {/* Send Button */}
            <button
                className={`${styles.sendButton} ${isSending ? styles.sending : ''}`}
                onClick={handleSendToAll}
                disabled={isSending || !isConnected}
            >
                {isSending ? (
                    <>
                        <span className={styles.spinner}></span>
                        Sending to All...
                    </>
                ) : (
                    '🚀 Send to All Recipients'
                )}
            </button>

            {/* Instructions */}
            <div className={styles.instructions}>
                <h3>📋 How to use:</h3>
                <ol>
                    <li>Connect your TON wallet</li>
                    <li>Make sure you have jetton tokens in your wallet</li>
                    <li>Paste your recipients JSON</li>
                    <li>Click "Send to All Recipients"</li>
                    <li>Confirm transactions in your wallet</li>
                </ol>
                
                <div className={styles.warning}>
                    ⚠️ <strong>Note:</strong> Transactions are sent in batches of 4 recipients.
                    Each batch requires ~0.2 TON for gas fees.
                </div>
            </div>
        </div>
    );
}
'use client'

import { useState } from 'react';
import { useMassTransfer } from '@/hooks/useMassTransfer';
import { Address } from '@ton/core';
import toast from 'react-hot-toast';
import styles from './SimpleMassTransfer.module.css';

export default function SimpleMassTransfer() {
    const { sendToAll, isSending, progress, userAddress, isConnected } = useMassTransfer();
    
    const [jettonMinter, setJettonMinter] = useState('EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqIw');
    const [recipientsJson, setRecipientsJson] = useState(`[
  {
    "address": "EQBKgXCNLPexWhs2L79kiARR1phGH1LwXxRbNsCFF9doc2lN",
    "amount": "1000000000"
  },
  {
    "address": "EQBIhPuWmjT7fP-VomuTWseE8JNWv2q7QYfsVQ1IZwnMk8wL",
    "amount": "500000000"
  }
]`);

    const handleSendToAll = async () => {
        if (!isConnected) {
            toast.error('Please connect your wallet');
            return;
        }

        try {
            // Парсим и валидируем JSON
            const recipients = JSON.parse(recipientsJson);
            
            if (!Array.isArray(recipients) || recipients.length === 0) {
                toast.error('Recipients must be a non-empty array');
                return;
            }

            // ✅ УЛУЧШЕННАЯ валидация каждого получателя
            for (let i = 0; i < recipients.length; i++) {
                const r = recipients[i];
                
                // Проверяем наличие полей
                if (!r.address || !r.amount) {
                    toast.error(`Missing address or amount at position ${i + 1}`);
                    return;
                }
                
                // Проверяем адрес
                try {
                    Address.parse(r.address);
                } catch {
                    toast.error(`Invalid address at position ${i + 1}: ${r.address}`);
                    return;
                }

                // Проверяем сумму
                const amount = Number(r.amount);
                if (isNaN(amount) || amount <= 0) {
                    toast.error(`Invalid amount at position ${i + 1}: ${r.amount}`);
                    return;
                }
            }

            // ✅ ПРЕДУПРЕЖДЕНИЕ о стоимости
            const gasNeeded = recipients.length * 0.1; // 0.1 TON за перевод
            const totalTokens = recipients.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
            
            const confirmed = confirm(
                `🚀 MASS TRANSFER CONFIRMATION\n\n` +
                `Recipients: ${recipients.length}\n` +
                `Total tokens to send: ${(totalTokens / 1e9).toFixed(2)}\n` +
                `Estimated gas cost: ~${gasNeeded} TON\n` +
                `Each recipient = separate transaction\n\n` +
                `⚠️ Make sure you have:\n` +
                `• ${(totalTokens / 1e9).toFixed(2)} jetton tokens\n` +
                `• ~${gasNeeded} TON for gas fees\n\n` +
                `Continue?`
            );

            if (!confirmed) {
                return;
            }

            console.log('💼 Starting transfer with jetton minter:', jettonMinter);

            // ✅ ИСПРАВЛЕНО: передаем jettonMinter вместо userJettonWallet
            await sendToAll(recipients, jettonMinter);

        } catch (error) {
            console.error('❌ Send error:', error);
            if (error instanceof Error) {
                if (error.message.includes('JSON')) {
                    toast.error('❌ Invalid JSON format');
                } else if (error.message.includes('insufficient funds')) {
                    toast.error('❌ Not enough TON for gas fees');
                } else if (error.message.includes('jetton')) {
                    toast.error('❌ Jetton wallet error - check minter address');
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
            
            const total = recipients.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
            const gasEstimate = recipients.length * 0.1;
            
            toast.success(
                `✅ Valid JSON!\n` +
                `Recipients: ${recipients.length}\n` +
                `Total tokens: ${(total / 1e9).toFixed(2)}\n` +
                `Gas needed: ~${gasEstimate} TON`,
                { duration: 4000 }
            );
        } catch (error) {
            toast.error('❌ Invalid JSON format');
        }
    };

    // ✅ Функция для очистки JSON
    const cleanJson = () => {
        setRecipientsJson(`[
  {
    "address": "",
    "amount": "1000000000"
  }
]`);
      
    };

    // ✅ Функция для добавления получателя
    const addRecipient = () => {
        try {
            const recipients = JSON.parse(recipientsJson);
            recipients.push({
                address: "",
                amount: "1000000000"
            });
            setRecipientsJson(JSON.stringify(recipients, null, 2));
            toast.success('✅ Recipient added');
        } catch {
            toast.error('❌ Fix JSON format first');
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>🚀 Simple Mass Token Transfer</h1>
            <p className={styles.subtitle}>Send jetton tokens to multiple recipients instantly!</p>

            {/* Статус подключения */}
            <div className={styles.status}>
                {isConnected ? (
                    <div className={styles.connected}>
                        ✅ Connected: {userAddress?.slice(0, 6)}...{userAddress?.slice(-6)}
                    </div>
                ) : (
                    <div className={styles.disconnected}>
                        ❌ Please connect your TON wallet first
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
                <div className={styles.inputHint}>
                    Contract address of the jetton you want to send
                </div>
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
                
                {/* ✅ Кнопки управления JSON */}
                <div className={styles.buttonRow}>
                    <button
                        className={styles.validateButton}
                        onClick={parseAndPreview}
                        type="button"
                    >
                        🔍 Validate JSON
                    </button>
                    <button
                        className={styles.addButton}
                        onClick={addRecipient}
                        type="button"
                    >
                        ➕ Add Recipient
                    </button>
                    <button
                        className={styles.clearButton}
                        onClick={cleanJson}
                        type="button"
                    >
                        📝 Template
                    </button>
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
                    <div className={styles.progressSubtext}>
                        ⏳ Please wait and confirm each transaction in your wallet
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

            {/* ✅ ОБНОВЛЕННЫЕ инструкции */}
            <div className={styles.instructions}>
                <h3>📋 How to use:</h3>
                <ol>
                    <li><strong>Connect wallet</strong> - Must have jetton tokens + TON for gas</li>
                    <li><strong>Enter minter address</strong> - Contract that created your tokens</li>
                    <li><strong>Paste recipients JSON</strong> - Use template or validate existing</li>
                    <li><strong>Validate JSON</strong> - Check format and calculate costs</li>
                    <li><strong>Confirm transfer</strong> - Review total cost before sending</li>
                    <li><strong>Approve transactions</strong> - Each recipient = separate transaction</li>
                </ol>
                
                <div className={styles.costInfo}>
                    <h4>💰 Cost Breakdown:</h4>
                    <ul>
                        <li><strong>Gas:</strong> ~0.1 TON per recipient</li>
                        <li><strong>Tokens:</strong> Amount specified in JSON</li>
                        <li><strong>Example:</strong> 5 recipients = ~0.5 TON gas + tokens</li>
                    </ul>
                </div>
                
                <div className={styles.warning}>
                    ⚠️ <strong>Important:</strong> 
                    <br />• One transaction per recipient (not batches)
                    <br />• 3 second pause between transactions
                    <br />• Can skip failed recipients and continue
                    <br />• Make sure you have enough TON for gas!
                </div>
            </div>
        </div>
    );
}

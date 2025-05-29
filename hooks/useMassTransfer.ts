import { useState, useCallback } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { Address, beginCell, toNano } from '@ton/core';
import toast from 'react-hot-toast';
import { TonClient } from '@ton/ton';
import { JettonMinter } from '@/wrappers/JettonMinter';

export interface Recipient {
    address: string;
    amount: string;
}
const client = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });

export function useMassTransfer() {
    const [tonConnectUI] = useTonConnectUI();
    const userAddress = useTonAddress();
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    // ✅ ИСПРАВЛЕННАЯ функция массового перевода
    const sendToAll = useCallback(async (
        recipients: Recipient[],
        jettonMinterAddress: string
    ) => {
        if (!tonConnectUI.connected || !userAddress) {
            toast.error('Please connect your wallet');
            return;
        }

        // Валидация получателей
        if (!recipients || recipients.length === 0) {
            toast.error('Recipients list is empty');
            return;
        }

        // Проверяем адреса
        for (let i = 0; i < recipients.length; i++) {
            try {
                Address.parse(recipients[i].address);
            } catch {
                toast.error(`Invalid address at position ${i + 1}: ${recipients[i].address}`);
                return;
            }
        }

        setIsSending(true);
        setProgress({ current: 0, total: recipients.length });

        try {
            console.log('🚀 Starting mass transfer to', recipients.length, 'recipients');

            // ✅ ИСПРАВЛЕНИЕ: Вычисляем jetton wallet пользователя
            const userJettonWallet = await calculateUserJettonWallet(userAddress, jettonMinterAddress);
            console.log('💼 User jetton wallet:', userJettonWallet);

            // ✅ ИСПРАВЛЕНИЕ: Отправляем по одному получателю за транзакцию
            for (let i = 0; i < recipients.length; i++) {
                const recipient = recipients[i];
                
                console.log(`📤 Sending ${i + 1}/${recipients.length} to ${recipient.address}`);
                
                try {
                    // ✅ Создаем ПРОСТУЮ транзакцию jetton перевода
                    const transferPayload = beginCell()
                        .storeUint(0x0f8a7ea5, 32)                    // transfer op
                        .storeUint(Math.floor(Date.now() / 1000), 64) // query_id (текущее время)
                        .storeCoins(BigInt(recipient.amount))         // количество токенов
                        .storeAddress(Address.parse(recipient.address)) // получатель
                        .storeAddress(Address.parse(userAddress))     // response_destination
                        .storeUint(0, 1)                             // custom_payload (null)
                        .storeCoins(toNano('0.04'))                  // forward_ton_amount
                        .storeUint(0, 1)                             // forward_payload (null)
                        .endCell();

                    const transaction = {
                        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут
                        messages: [
                            {
                                address: userJettonWallet,
                                amount: toNano('0.07').toString(), // ✅ Увеличили газ до 0.1 TON
                                payload: transferPayload.toBoc().toString('base64')
                            }
                        ]
                    };

                    await tonConnectUI.sendTransaction(transaction);
                    
                    setProgress({ current: i + 1, total: recipients.length });
                    toast.success(`✅ Sent to ${recipient.address.slice(0, 6)}...`);
                    
                    // ✅ Пауза между переводами (важно!)
                    if (i < recipients.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 секунды пауза
                    }
                    
                } catch (error) {
                    console.error(`❌ Failed to send to ${recipient.address}:`, error);
                    toast.error(`❌ Failed: ${recipient.address.slice(0, 6)}...`);
                    
                    // Спрашиваем пользователя, продолжать ли
                    const shouldContinue = confirm(`Failed to send to ${recipient.address.slice(0, 10)}...\nContinue with remaining recipients?`);
                    if (!shouldContinue) {
                        break;
                    }
                }
            }

            toast.success(`🎉 Mass transfer completed! Processed ${recipients.length} recipients`);

        } catch (error) {
            console.error('❌ Mass transfer error:', error);
            toast.error('❌ Mass transfer failed');
            throw error;
        } finally {
            setIsSending(false);
            setProgress({ current: 0, total: 0 });
        }
    }, [tonConnectUI, userAddress]);

    return {
        sendToAll,
        isSending,
        progress,
        userAddress,
        isConnected: tonConnectUI.connected
    };
}

async function calculateUserJettonWallet(userAddress: string, jettonMinterAddress: string): Promise<string> {
    const minter = client.open(JettonMinter.createFromAddress(Address.parse(jettonMinterAddress)));
  
    const walletAddress = await minter.getWalletAddressOf(Address.parse(userAddress));
    return walletAddress.toString();
  }
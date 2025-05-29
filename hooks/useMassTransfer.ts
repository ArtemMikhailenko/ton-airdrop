import { useState, useCallback } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { massTransferService, Recipient } from '@/lib/mass-transfer-service';
import toast from 'react-hot-toast';

export function useMassTransfer() {
    const [tonConnectUI] = useTonConnectUI();
    const userAddress = useTonAddress();
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    // 🚀 Простая массовая рассылка
    const sendToAll = useCallback(async (
        recipients: Recipient[],
        userJettonWalletAddress: string
    ) => {
        if (!tonConnectUI.connected || !userAddress) {
            toast.error('Please connect your wallet');
            return;
        }

        // Валидация
        const validation = massTransferService.validateRecipients(recipients);
        if (!validation.valid) {
            toast.error(`Validation failed: ${validation.errors[0]}`);
            return;
        }

        setIsSending(true);
        setProgress({ current: 0, total: recipients.length });

        try {
            console.log('🚀 Starting mass transfer to', recipients.length, 'recipients');

            // Подготавливаем пакеты по 4 перевода
            const batchData = await massTransferService.prepareBatchTransfer(
                userJettonWalletAddress,
                recipients,
                userAddress,
                4 // Отправляем по 4 за раз
            );

            console.log(`📦 Prepared ${batchData.totalBatches} batches`);
            
            // Отправляем пакеты один за другим
            for (let i = 0; i < batchData.batches.length; i++) {
                const batch = batchData.batches[i];
                
                console.log(`📤 Sending batch ${batch.batchNumber}/${batchData.totalBatches} (${batch.recipients} recipients)`);
                
                const transaction = {
                    validUntil: Math.floor(Date.now() / 1000) + 120,
                    messages: batch.messages
                };

                try {
                    await tonConnectUI.sendTransaction(transaction);
                    
                    setProgress({ 
                        current: (i + 1) * 4, 
                        total: recipients.length 
                    });
                    
                    toast.success(`✅ Batch ${i + 1}/${batchData.totalBatches} sent!`);
                    
                    // Небольшая пауза между пакетами
                    if (i < batchData.batches.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                } catch (error) {
                    console.error(`❌ Batch ${i + 1} failed:`, error);
                    toast.error(`❌ Batch ${i + 1} failed. Continue with next?`);
                    
                    // Можно продолжить с следующим пакетом или остановиться
                    // Пока продолжаем
                }
            }

            toast.success(`🎉 Mass transfer completed! Sent to ${recipients.length} recipients`);
            console.log('✅ Mass transfer completed successfully');

            return {
                success: true,
                totalSent: recipients.length,
                totalBatches: batchData.totalBatches
            };

        } catch (error) {
            console.error('❌ Mass transfer error:', error);
            toast.error('❌ Mass transfer failed');
            throw error;
        } finally {
            setIsSending(false);
            setProgress({ current: 0, total: 0 });
        }
    }, [tonConnectUI, userAddress]);

    // 🔄 Получение адреса jetton кошелька пользователя
    const getUserJettonWallet = useCallback(async (jettonMinterAddress: string) => {
        if (!userAddress) {
            return null;
        }

        try {
            // Здесь нужно вызвать get_wallet_address у jetton minter'а
            // Пока возвращаем заглушку - в реальном коде нужно вызвать метод контракта
            console.log('🔍 Getting user jetton wallet for:', userAddress);
            
            // Временная заглушка
            const mockWalletAddress = `EQA${userAddress.slice(3, 8)}MockJettonWallet${jettonMinterAddress.slice(-8)}`;
            
            return mockWalletAddress;
        } catch (error) {
            console.error('Error getting jetton wallet:', error);
            return null;
        }
    }, [userAddress]);

    return {
        sendToAll,
        getUserJettonWallet,
        isSending,
        progress,
        userAddress,
        isConnected: tonConnectUI.connected
    };
}

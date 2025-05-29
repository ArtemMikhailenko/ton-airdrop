import { useState, useCallback } from 'react';
import { Address, beginCell, toNano, Cell } from '@ton/core';
import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToWalletKey } from '@ton/crypto';
import { JettonMinter } from '@/wrappers/JettonMinter';
import { JettonWallet } from '@/wrappers/JettonWallet';
import toast from 'react-hot-toast';

export interface Recipient {
    address: string;
    amount: string; // Теперь в обычном формате: "1.5", "2", "0.5"
}

const client = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });


export function useMassTransfer() {
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [walletAddress, setWalletAddress] = useState<string>('');

    // 🔑 Функция для инициализации кошелька из мнемоники
    const initWallet = useCallback(async (mnemonic: string) => {
        try {
            const words = mnemonic.trim().split(' ');
            if (words.length !== 24) {
                throw new Error('Mnemonic must contain exactly 24 words');
            }

            const keyPair = await mnemonicToWalletKey(words);
            const wallet = WalletContractV4.create({ 
                workchain: 0, 
                publicKey: keyPair.publicKey 
            });
            
            const address = wallet.address.toString();
            setWalletAddress(address);
            
            console.log('🔑 Wallet initialized:', address);
            return { wallet, keyPair, address };
            
        } catch (error) {
            console.error('❌ Wallet init error:', error);
            throw new Error('Invalid mnemonic phrase');
        }
    }, []);

    // 🚀 НОВАЯ функция массового перевода через мнемонику
    const sendToAllWithMnemonic = useCallback(async (
        recipients: Recipient[],
        jettonMinterAddress: string,  
        mnemonic: string
    ) => {
        // Валидация входных данных
        if (!recipients || recipients.length === 0) {
            toast.error('Recipients list is empty');
            return;
        }

        if (!mnemonic || mnemonic.trim().split(' ').length !== 24) {
            toast.error('Please provide valid 24-word mnemonic');
            return;
        }

        // Проверяем адреса и суммы
        for (let i = 0; i < recipients.length; i++) {
            const r = recipients[i];
            
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

        setIsSending(true);
        setProgress({ current: 0, total: recipients.length });

        try {
            console.log('🚀 Starting mass transfer to', recipients.length, 'recipients');

            // Инициализируем кошелек
            const { wallet, keyPair, address } = await initWallet(mnemonic);
            console.log('💼 Sender wallet:', address);

            // Получаем jetton wallet отправителя  
            const jettonWalletAddress = await getJettonWalletAddress(address, jettonMinterAddress);
            console.log('🪙 Jetton wallet:', jettonWalletAddress);
            
            const jettonWallet = client.open(
                JettonWallet.createFromAddress(Address.parse(jettonWalletAddress))
            );

            // Отправляем каждому получателю
            for (let i = 0; i < recipients.length; i++) {
                const recipient = recipients[i];
                
                console.log(`📤 Sending ${i + 1}/${recipients.length}: ${recipient.amount} tokens to ${recipient.address}`);
                
                try {
                    // ✅ Конвертируем сумму в nanocoins (добавляем 9 нулей автоматически)
                    const amountInNano = toNano(recipient.amount); // "1.5" → 1500000000n
                    
                    // Создаем сообщение перевода jetton токенов
                    const transferMessage = internal({
                        to: jettonWalletAddress,
                        value: toNano('0.08'), // Газ для jetton перевода
                        body: beginCell()
                            .storeUint(0x0f8a7ea5, 32) // transfer op
                            .storeUint(0, 64) // query_id
                            .storeCoins(amountInNano) // количество токенов в nanocoins
                            .storeAddress(Address.parse(recipient.address)) // получатель
                            .storeAddress(Address.parse(address)) // response_destination
                            .storeUint(0, 1) // custom_payload null
                            .storeCoins(toNano('0.02')) // forward_ton_amount
                            .storeUint(0, 1) // forward_payload null
                            .endCell()
                    });

                    // Отправляем транзакцию
                    const seqno = await wallet.getSeqno(client.provider(wallet.address));
                    
                    await wallet.sendTransfer(client.provider(wallet.address), {
                        seqno,
                        secretKey: keyPair.secretKey,
                        messages: [transferMessage]
                    });
                    
                    setProgress({ current: i + 1, total: recipients.length });
                    toast.success(`✅ Sent ${recipient.amount} tokens to ${recipient.address.slice(0, 6)}...`);
                    
                    // Пауза между транзакциями
                    if (i < recipients.length - 1) {
                        console.log('⏳ Waiting 3 seconds before next transaction...');
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                    
                } catch (error) {
                    console.error(`❌ Failed to send to ${recipient.address}:`, error);
                    toast.error(`❌ Failed: ${recipient.address.slice(0, 6)}... (${error})`);
                    
                    // Опция продолжить или остановиться
                    const shouldContinue = confirm(
                        `Failed to send to ${recipient.address.slice(0, 10)}...\n` +
                        `Error: ${error}\n\n` +
                        `Continue with remaining recipients?`
                    );
                    if (!shouldContinue) {
                        break;
                    }
                }
            }

            toast.success(`🎉 Mass transfer completed! Sent to ${progress.current} recipients`);
            console.log('✅ Mass transfer completed successfully');

        } catch (error) {
            console.error('❌ Mass transfer error:', error);
            toast.error(`❌ Mass transfer failed: ${error}`);
            throw error;
        } finally {
            setIsSending(false);
            setProgress({ current: 0, total: 0 });
        }
    }, [initWallet]);

    // Вспомогательная функция для получения jetton wallet адреса
    const getJettonWalletAddress = async (userAddress: string, jettonMinterAddress: string): Promise<string> => {
        try {
            const minter = client.open(
                JettonMinter.createFromAddress(Address.parse(jettonMinterAddress))
            );
            
            const walletAddress = await minter.getWalletAddressOf(Address.parse(userAddress));
            return walletAddress.toString();
        } catch (error) {
            console.error('Error getting jetton wallet:', error);
            throw new Error('Failed to get jetton wallet address');
        }
    };

    return {
        sendToAllWithMnemonic,
        initWallet,
        isSending,
        progress,
        walletAddress
    };
}

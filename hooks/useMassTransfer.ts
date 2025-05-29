import { useState, useCallback } from 'react';
import { Address, beginCell, toNano, Cell } from '@ton/core';
import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToWalletKey } from '@ton/crypto';
import { JettonMinter } from '@/wrappers/JettonMinter';
import { JettonWallet } from '@/wrappers/JettonWallet';
import toast from 'react-hot-toast';

export interface Recipient {
    address: string;
    amount: string;
}

// 🔄 Try multiple endpoints with fallback
const TON_ENDPOINTS = [
    'https://toncenter.com/api/v2/jsonRPC',
    'https://mainnet-v4.tonhubapi.com',
    'https://mainnet.tonapi.io/v2',
];

let currentEndpointIndex = 0;
let client = new TonClient({ endpoint: TON_ENDPOINTS[0] });

// 🛡️ Rate limiting and retry logic
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(
    operation: () => Promise<T>, 
    maxRetries = 3, 
    baseDelayMs = 2000
): Promise<T> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            const isRateLimit = error?.response?.status === 429 || 
                              error?.code === 429 || 
                              error?.message?.includes('429') ||
                              error?.message?.includes('rate limit') ||
                              error?.message?.includes('Too Many Requests');

            if (isRateLimit && attempt < maxRetries) {
                // Exponential backoff: 2s, 4s, 8s
                const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
                console.log(`⏳ Rate limited, waiting ${delayMs}ms before retry ${attempt}/${maxRetries}`);
                toast(`⏳ Rate limited, retrying in ${delayMs/1000}s...`, { duration: 2000 });
                
                await delay(delayMs);
                
                // Try switching endpoint on rate limit
                if (attempt === Math.floor(maxRetries / 2)) {
                    currentEndpointIndex = (currentEndpointIndex + 1) % TON_ENDPOINTS.length;
                    client = new TonClient({ endpoint: TON_ENDPOINTS[currentEndpointIndex] });
                    console.log(`🔄 Switching to endpoint: ${TON_ENDPOINTS[currentEndpointIndex]}`);
                }
                
                continue;
            }
            
            // If not rate limit or max retries reached, throw error
            throw error;
        }
    }
    throw new Error(`Operation failed after ${maxRetries} attempts`);
};

export function useMassTransfer() {
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [walletAddress, setWalletAddress] = useState<string>('');

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

    const sendToAllWithMnemonic = useCallback(async (
        recipients: Recipient[],
        jettonMinterAddress: string,  
        mnemonic: string
    ) => {
        if (!recipients || recipients.length === 0) {
            toast.error('Recipients list is empty');
            return;
        }

        if (!mnemonic || mnemonic.trim().split(' ').length !== 24) {
            toast.error('Please provide valid 24-word mnemonic');
            return;
        }

        // Validate addresses and amounts
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

            // Initialize wallet with retry
            const { wallet, keyPair, address } = await withRetry(() => initWallet(mnemonic));
            console.log('💼 Sender wallet:', address);

            // Get jetton wallet with retry
            const jettonWalletAddress = await withRetry(() => 
                getJettonWalletAddress(address, jettonMinterAddress)
            );
            console.log('🪙 Jetton wallet:', jettonWalletAddress);
            
            const jettonWallet = client.open(
                JettonWallet.createFromAddress(Address.parse(jettonWalletAddress))
            );

            // Send to each recipient with proper rate limiting
            for (let i = 0; i < recipients.length; i++) {
                const recipient = recipients[i];
                
                console.log(`📤 Sending ${i + 1}/${recipients.length}: ${recipient.amount} tokens to ${recipient.address}`);
                
                try {
                    const amountInNano = toNano(recipient.amount);
                    
                    // Create transfer message
                    const transferMessage = internal({
                        to: jettonWalletAddress,
                        value: toNano('0.08'),
                        body: beginCell()
                            .storeUint(0x0f8a7ea5, 32) // transfer op
                            .storeUint(0, 64) // query_id
                            .storeCoins(amountInNano)
                            .storeAddress(Address.parse(recipient.address))
                            .storeAddress(Address.parse(address))
                            .storeUint(0, 1) // custom_payload null
                            .storeCoins(toNano('0.02')) // forward_ton_amount
                            .storeUint(0, 1) // forward_payload null
                            .endCell()
                    });

                    // Send transaction with retry logic
                    await withRetry(async () => {
                        const seqno = await wallet.getSeqno(client.provider(wallet.address));
                        
                        return await wallet.sendTransfer(client.provider(wallet.address), {
                            seqno,
                            secretKey: keyPair.secretKey,
                            messages: [transferMessage]
                        });
                    }, 5, 3000); // 5 retries, starting with 3s delay
                    
                    setProgress({ current: i + 1, total: recipients.length });
                    toast.success(`✅ Sent ${recipient.amount} tokens to ${recipient.address.slice(0, 6)}...`);
                    
                    // 🚨 INCREASED DELAY between transactions to avoid rate limiting
                    if (i < recipients.length - 1) {
                        const delayTime = 5000; // 5 seconds between transactions
                        console.log(`⏳ Waiting ${delayTime/1000} seconds before next transaction...`);
                        await delay(delayTime);
                    }
                    
                } catch (error) {
                    console.error(`❌ Failed to send to ${recipient.address}:`, error);
                    toast.error(`❌ Failed: ${recipient.address.slice(0, 6)}... (${error})`);
                    
                    const shouldContinue = confirm(
                        `Failed to send to ${recipient.address.slice(0, 10)}...\n` +
                        `Error: ${error}\n\n` +
                        `Continue with remaining recipients?`
                    );
                    if (!shouldContinue) {
                        break;
                    }
                    
                    // Wait longer after error before continuing
                    await delay(8000);
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
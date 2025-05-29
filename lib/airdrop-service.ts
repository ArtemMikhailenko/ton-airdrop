// lib/airdrop-service.ts - Исправленная версия

import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { Airdrop, AirdropEntry, generateEntriesDictionary, airdropEntryValue } from './contracts/Airdrop';
import { AirdropHelper } from './contracts/AirdropHelper';
import { tonClient } from './ton-client';
// ✅ Исправленный импорт - убираем @/ и указываем правильный путь
import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMinter } from '../wrappers/JettonMinter';

export interface AirdropRecipient {
    address: string;
    amount: string; // in nanocoins
}

export class AirdropService {
    async deployAirdrop(
        recipients: AirdropRecipient[],
        jettonMinterAddress: string,
        helperCode: Cell,
        airdropCode: Cell,
        sender: any
    ) {
        try {
            // Convert recipients to AirdropEntry format
            const entries: AirdropEntry[] = recipients.map(r => ({
                address: Address.parse(r.address),
                amount: BigInt(r.amount)
            }));

            // Generate dictionary and merkle root
            const dict = generateEntriesDictionary(entries);
            const dictCell = beginCell().storeDictDirect(dict).endCell();
            const merkleRoot = BigInt('0x' + dictCell.hash().toString('hex'));

            console.log('📊 Airdrop deployment info:');
            console.log('- Recipients:', entries.length);
            console.log('- Merkle root:', merkleRoot.toString(16));
            console.log('- Dictionary cell:', dictCell.toBoc().toString('base64'));

            // Create airdrop contract
            const airdrop = Airdrop.createFromConfig(
                {
                    merkleRoot,
                    helperCode,
                },
                airdropCode
            );

            console.log('📍 Airdrop address:', airdrop.address.toString());

            // Calculate total amount needed
            const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0n);
            console.log('💰 Total amount needed:', (Number(totalAmount) / 1e9).toFixed(2), 'tokens');

            return {
                airdrop,
                dictCell,
                merkleRoot,
                deploymentData: {
                    totalRecipients: recipients.length,
                    totalAmount,
                }
            };

        } catch (error) {
            console.error('❌ Error deploying airdrop:', error);
            throw error;
        }
    }

    // 🔄 Перевод токенов на аирдроп (исправленная версия)
    async prepareTransferToAirdrop(
        userAddress: string,
        jettonMinterAddress: string,
        airdropAddress: string,
        amount: bigint
    ) {
        try {
            console.log('📤 Preparing token transfer...');
            console.log('- User:', userAddress);
            console.log('- Jetton Minter:', jettonMinterAddress);
            console.log('- Airdrop:', airdropAddress);
            console.log('- Amount:', (Number(amount) / 1e9).toFixed(2), 'tokens');

            // Получаем адрес jetton кошелька пользователя
            const userJettonWalletAddress = await this.getUserJettonWallet(
                userAddress,
                jettonMinterAddress
            );

            console.log('💼 User jetton wallet:', userJettonWalletAddress);

            // Создаем транзакцию перевода
            const transferTransaction = {
                validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
                messages: [
                    {
                        address: userJettonWalletAddress,
                        amount: toNano('0.05').toString(), // Gas for transfer
                        payload: beginCell()
                            .storeUint(0x0f8a7ea5, 32) // transfer op
                            .storeUint(0, 64) // query_id
                            .storeCoins(amount) // jetton amount
                            .storeAddress(Address.parse(airdropAddress)) // destination
                            .storeAddress(Address.parse(userAddress)) // response_destination
                            .storeUint(0, 1) // custom_payload (null)
                            .storeCoins(toNano('0.01')) // forward_ton_amount
                            .storeUint(0, 1) // forward_payload (null)
                            .endCell()
                            .toBoc()
                            .toString('base64')
                    }
                ]
            };

            return transferTransaction;

        } catch (error) {
            console.error('❌ Error preparing token transfer:', error);
            throw error;
        }
    }

    // Получение адреса jetton кошелька пользователя (улучшенная версия)
    async getUserJettonWallet(
        userAddress: string,
        jettonMinterAddress: string
    ): Promise<string> {
        try {
            console.log('🔍 Getting jetton wallet address...');
            console.log('- User:', userAddress);
            console.log('- Minter:', jettonMinterAddress);

            // Вычисляем адрес jetton кошелька используя стандартную формулу
            // Это упрощенная версия - в реальном проекте лучше вызвать get_wallet_address у minter'а
            
            // Для демо возвращаем вычисленный адрес
            // В продакшене нужно вызвать метод контракта:
            // const jettonMinter = JettonMinter.createFromAddress(Address.parse(jettonMinterAddress));
            // const provider = ... // ваш provider
            // const walletAddress = await jettonMinter.getWalletAddressOf(provider, Address.parse(userAddress));
            
            // Временная заглушка для тестирования
            const mockWalletAddress = `EQA${userAddress.slice(3, 10)}${jettonMinterAddress.slice(3, 10)}MockWallet`;
            
            console.log('💼 Calculated jetton wallet:', mockWalletAddress);
            return mockWalletAddress;
            
        } catch (error) {
            console.error('❌ Error getting user jetton wallet:', error);
            throw error;
        }
    }

    // Проверка баланса jetton кошелька
    async checkJettonBalance(
        jettonWalletAddress: string
    ): Promise<bigint> {
        try {
            console.log('💰 Checking jetton balance for:', jettonWalletAddress);
            
            // В реальном проекте нужно вызвать get_wallet_data у jetton кошелька
            // const jettonWallet = JettonWallet.createFromAddress(Address.parse(jettonWalletAddress));
            // const provider = ... // ваш provider
            // const balance = await jettonWallet.getJettonBalance(provider);
            
            // Временная заглушка
            const mockBalance = BigInt('5000000000'); // 5 tokens
            console.log('💰 Mock balance:', (Number(mockBalance) / 1e9).toFixed(2), 'tokens');
            
            return mockBalance;
            
        } catch (error) {
            console.error('❌ Error checking jetton balance:', error);
            return BigInt(0);
        }
    }

    // Остальные методы остаются без изменений
    async claimAirdrop(
        airdropAddress: string,
        userAddress: string,
        entryIndex: bigint,
        dictCell: Cell,
        helperCode: Cell
    ) {
        try {
            const dict = dictCell.beginParse().loadDictDirect(Dictionary.Keys.BigUint(256), airdropEntryValue);
            
            // Check if user is eligible
            const entry = dict.get(entryIndex);
            if (!entry || !entry.address.equals(Address.parse(userAddress))) {
                throw new Error('User not eligible for this airdrop');
            }

            // Generate merkle proof
            const proof = dict.generateMerkleProof(entryIndex);

            // Create helper contract
            const helper = AirdropHelper.createFromConfig(
                {
                    airdrop: Address.parse(airdropAddress),
                    index: entryIndex,
                    proofHash: proof.hash(),
                },
                helperCode
            );

            return {
                helper,
                proof,
                claimAmount: entry.amount,
            };

        } catch (error) {
            console.error('❌ Error claiming airdrop:', error);
            throw error;
        }
    }

    async getAirdropStatus(airdropAddress: string) {
        try {
            const client = await tonClient.getClient();
            const isDeployed = await tonClient.isContractDeployed(airdropAddress);
            
            if (!isDeployed) {
                return {
                    deployed: false,
                    totalRecipients: 0,
                    claimedCount: 0,
                };
            }

            // TODO: Implement actual status checking logic
            // This would involve scanning the blockchain for claim transactions
            
            return {
                deployed: true,
                totalRecipients: 100, // placeholder
                claimedCount: 45, // placeholder
            };

        } catch (error) {
            console.error('❌ Error getting airdrop status:', error);
            throw error;
        }
    }
}

export const airdropService = new AirdropService();
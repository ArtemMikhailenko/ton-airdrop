// hooks/useAirdrop.ts - Исправленная функция createStateInit

import { useState, useCallback } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { Cell, beginCell } from '@ton/core';
import { airdropService, AirdropRecipient } from '@/lib/airdrop-service';
import toast from 'react-hot-toast';

const AIRDROP_CODE = Cell.fromBase64('te6cckECCwEAAVEAART/APSkE/S88sgLAQIBYgIKAgLMAwUBtdthEQa6TgsEit8GmPgPwyaZ+A/DMA6DprkP0gGHwy9qJofSAA/DDp/4D8MWoYfDH8IkEIMIZSNl1HD3wg64WA4AB5cWF9IBh8MPwh/CFkfCDni2X/5mT2qnGHQEAJz4RIIQQ8fVybqOPNTT/zAh1znyqtMHAcAD8qv4QgHT/1m68qzUMFIQgwf0Dm+h8q34RQP5AFjwCPAJEscF8uK/+kD6ADDwCpUwhA/y8OICAUgGCQIBIAcIAC8cMjLAPgozxYSy//L/8n4Q3bIywTMzMmAAFz5AIMJyMsKy//J0IAB3RwIPhGghAPin6lyMsfyz9QA/oCI88WUAPPFssAggiYloD6AssAyXGAGMjLBfhBzxZw+gLLaszJgED7AIADOg343aiaH0gAPww6f+A/DFqGHwx/CD8IXwh9ogA+8=');
const HELPER_CODE = Cell.fromBase64('te6cckEBBwEAigABFP8A9KQT9LzyyAsBAgEgAgUCAUgDBAAC0AARoJjX2omhrhQBAb7ybCEBghAF9eEAvvLiwO1E0NIAAfLSvojtVPpA0//T/zAD0z/UMCD5AFADuvLiwfgAggr68IBw+wKCEEPH1cnIyx/LP8wSy//JcYAQyMsFUAPPFnD6AhLLaszJgwb7AAYAAcD1e6u5');

// ✅ ПРАВИЛЬНАЯ функция для создания StateInit
function createStateInit(code: Cell, data: Cell): string {
    return beginCell()
        .storeUint(0, 2)        // split_depth:(Maybe (## 5)) special:(Maybe TickTock)
        .storeMaybeRef(code)    // code:(Maybe ^Cell) 
        .storeMaybeRef(data)    // data:(Maybe ^Cell)
        .storeUint(0, 1)        // library:(Maybe ^Cell) 
        .endCell()
        .toBoc()
        .toString('base64');
}

// 🔧 Альтернативный способ - использовать стандартный метод TON SDK
function createStateInitAlternative(code: Cell, data: Cell): string {
    return beginCell()
        .storeUint(0, 2)     // split_depth и special
        .storeUint(1, 1)     // Есть code
        .storeRef(code)      // code reference
        .storeUint(1, 1)     // Есть data  
        .storeRef(data)      // data reference
        .storeUint(0, 1)     // Нет library
        .endCell()
        .toBoc()
        .toString('base64');
}

// 🚀 Еще более простой способ - использовать готовый метод из контракта
function getStateInitFromContract(contractInit: { code: Cell; data: Cell }): string {
    // Если у контракта есть готовый stateInit, используем его
    return createStateInitAlternative(contractInit.code, contractInit.data);
}

export function useAirdrop() {
    const [tonConnectUI] = useTonConnectUI();
    const userAddress = useTonAddress();
    const [isDeploying, setIsDeploying] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [deployedAirdrop, setDeployedAirdrop] = useState<any>(null);

    const deployAirdrop = useCallback(async (
        recipients: AirdropRecipient[],
        jettonMinterAddress: string
    ) => {
        if (!tonConnectUI.connected) {
            toast.error('Please connect your wallet');
            return;
        }

        setIsDeploying(true);
        try {
            const deploymentData = await airdropService.deployAirdrop(
                recipients,
                jettonMinterAddress,
                HELPER_CODE,
                AIRDROP_CODE,
                tonConnectUI
            );

            // ✅ Используем исправленную функцию
            let stateInitString: string | undefined = undefined;
            
            if (deploymentData.airdrop.init) {
                stateInitString = createStateInitAlternative(
                    deploymentData.airdrop.init.code, 
                    deploymentData.airdrop.init.data
                );
            }

            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 60,
                messages: [
                    {
                        address: deploymentData.airdrop.address.toString(),
                        amount: '50000000', // 0.05 TON
                        stateInit: stateInitString,
                    }
                ]
            };

            console.log('📝 Sending deployment transaction:', {
                address: transaction.messages[0].address,
                amount: transaction.messages[0].amount,
                hasStateInit: !!transaction.messages[0].stateInit,
                stateInitLength: stateInitString?.length || 0
            });

            await tonConnectUI.sendTransaction(transaction);
            
            const result = {
                address: deploymentData.airdrop.address.toString(),
                merkleRoot: deploymentData.merkleRoot.toString(16),
                dictCell: deploymentData.dictCell.toBoc().toString('base64'),
                totalRecipients: deploymentData.deploymentData.totalRecipients,
                totalAmount: deploymentData.deploymentData.totalAmount,
                jettonMinterAddress
            };
            
            setDeployedAirdrop(result);
            toast.success('🎉 Airdrop deployed! Now transfer tokens to it.');
            console.log('✅ Deployment successful:', result.address);
            
            return result;

        } catch (error) {
            console.error('❌ Deployment error:', error);
            toast.error(error instanceof Error ? error.message : 'Deployment failed');
            throw error;
        } finally {
            setIsDeploying(false);
        }
    }, [tonConnectUI]);

    const transferTokensToAirdrop = useCallback(async (
        jettonMinterAddress: string,
        airdropAddress: string,
        amount: bigint
    ) => {
        if (!tonConnectUI.connected || !userAddress) {
            toast.error('Please connect your wallet');
            return;
        }

        setIsTransferring(true);
        try {
            console.log('🔄 Starting token transfer...');

            const transferTransaction = await airdropService.prepareTransferToAirdrop(
                userAddress,
                jettonMinterAddress,
                airdropAddress,
                amount
            );

            console.log('📝 Sending transfer transaction');
            await tonConnectUI.sendTransaction(transferTransaction);
            
            toast.success(`🎉 Successfully transferred ${Number(amount) / 1e9} tokens to airdrop!`);
            
            return {
                success: true,
                amount,
                airdropAddress
            };

        } catch (error) {
            console.error('❌ Transfer error:', error);
            toast.error(error instanceof Error ? error.message : 'Transfer failed');
            throw error;
        } finally {
            setIsTransferring(false);
        }
    }, [tonConnectUI, userAddress]);

    const transferToDeployedAirdrop = useCallback(async () => {
        if (!deployedAirdrop) {
            toast.error('No deployed airdrop found');
            return;
        }

        return transferTokensToAirdrop(
            deployedAirdrop.jettonMinterAddress,
            deployedAirdrop.address,
            deployedAirdrop.totalAmount
        );
    }, [deployedAirdrop, transferTokensToAirdrop]);

    const claimTokens = useCallback(async (
        airdropAddress: string,
        userAddress: string,
        entryIndex: bigint,
        dictCellBase64: string
    ) => {
        if (!tonConnectUI.connected) {
            toast.error('Please connect your wallet');
            return;
        }

        setIsClaiming(true);
        try {
            const dictCell = Cell.fromBase64(dictCellBase64);
            
            const claimData = await airdropService.claimAirdrop(
                airdropAddress,
                userAddress,
                entryIndex,
                dictCell,
                HELPER_CODE
            );

            // ✅ Helper deployment с правильным stateInit
            let helperStateInit: string | undefined = undefined;
            
            if (claimData.helper.init) {
                helperStateInit = createStateInitAlternative(
                    claimData.helper.init.code, 
                    claimData.helper.init.data
                );
            }

            const helperTransaction = {
                validUntil: Math.floor(Date.now() / 1000) + 60,
                messages: [
                    {
                        address: claimData.helper.address.toString(),
                        amount: '150000000', // 0.15 TON
                        stateInit: helperStateInit,
                    }
                ]
            };

            console.log('📝 Deploying helper contract');
            await tonConnectUI.sendTransaction(helperTransaction);

            // Wait for deployment
            console.log('⏳ Waiting for helper deployment...');
            await new Promise(resolve => setTimeout(resolve, 7000)); // Увеличили время ожидания

            // Claim transaction
            const claimTransaction = {
                validUntil: Math.floor(Date.now() / 1000) + 60,
                messages: [
                    {
                        address: claimData.helper.address.toString(),
                        amount: '10000000', // 0.01 TON for gas
                        payload: claimData.proof.toBoc().toString('base64'),
                    }
                ]
            };

            console.log('📝 Sending claim transaction');
            await tonConnectUI.sendTransaction(claimTransaction);
            
            toast.success(`🎉 Successfully claimed ${Number(claimData.claimAmount) / 1e9} tokens!`);
            
            return {
                claimedAmount: claimData.claimAmount,
            };

        } catch (error) {
            console.error('❌ Claim error:', error);
            toast.error(error instanceof Error ? error.message : 'Claim failed');
            throw error;
        } finally {
            setIsClaiming(false);
        }
    }, [tonConnectUI]);

    return {
        deployAirdrop,
        claimTokens,
        transferTokensToAirdrop,
        transferToDeployedAirdrop,
        isDeploying,
        isTransferring,
        isClaiming,
        deployedAirdrop,
        userAddress,
        isConnected: tonConnectUI.connected,
    };
}

// 🧪 Функция для тестирования StateInit
export function testStateInit() {
    const testCode = AIRDROP_CODE;
    const testData = beginCell().storeUint(123, 32).endCell();
    
    try {
        const stateInit1 = createStateInit(testCode, testData);
        const stateInit2 = createStateInitAlternative(testCode, testData);
        
        console.log('✅ StateInit method 1 length:', stateInit1.length);
        console.log('✅ StateInit method 2 length:', stateInit2.length);
        
        return { stateInit1, stateInit2 };
        
    } catch (error) {
        console.error('❌ StateInit test failed:', error);
        return null;
    }
}
import { useState, useCallback } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Cell } from '@ton/core';
import { airdropService, AirdropRecipient } from '@/lib/airdrop-service';
import toast from 'react-hot-toast';

// Placeholder contract codes - you'll need to provide the actual compiled codes
const AIRDROP_CODE = Cell.fromBase64('te6cckECCwEAAVEAART/APSkE/S88sgLAQIBYgIKAgLMAwUBtdthEQa6TgsEit8GmPgPwyaZ+A/DMA6DprkP0gGHwy9qJofSAA/DDp/4D8MWoYfDH8IkEIMIZSNl1HD3wg64WA4AB5cWF9IBh8MPwh/CFkfCDni2X/5mT2qnGHQEAJz4RIIQQ8fVybqOPNTT/zAh1znyqtMHAcAD8qv4QgHT/1m68qzUMFIQgwf0Dm+h8q34RQP5AFjwCPAJEscF8uK/+kD6ADDwCpUwhA/y8OICAUgGCQIBIAcIAC8cMjLAPgozxYSy//L/8n4Q3bIywTMzMmAAFz5AIMJyMsKy//J0IAB3RwIPhGghAPin6lyMsfyz9QA/oCI88WUAPPFssAggiYloD6AssAyXGAGMjLBfhBzxZw+gLLaszJgED7AIADOg343aiaH0gAPww6f+A/DFqGHwx/CD8IXwh9ogA+8='); // Your compiled airdrop.fc
const HELPER_CODE = Cell.fromBase64('te6cckEBBwEAigABFP8A9KQT9LzyyAsBAgEgAgUCAUgDBAAC0AARoJjX2omhrhQBAb7ybCEBghAF9eEAvvLiwO1E0NIAAfLSvojtVPpA0//T/zAD0z/UMCD5AFADuvLiwfgAggr68IBw+wKCEEPH1cnIyx/LP8wSy//JcYAQyMsFUAPPFnD6AhLLaszJgwb7AAYAAcD1e6u5'); // Your compiled airdrop_helper.fc

export function useAirdrop() {
    const [tonConnectUI] = useTonConnectUI();
    const [isDeploying, setIsDeploying] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);

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

            // Send deployment transaction
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 60, // 1 minute
                messages: [
                    {
                        address: deploymentData.airdrop.address.toString(),
                        amount: '50000000', // 0.05 TON
                        payload: deploymentData.airdrop.init?.data?.toBoc().toString('base64'),
                    }
                ]
            };

            await tonConnectUI.sendTransaction(transaction);
            
            toast.success('Airdrop deployed successfully!');
            
            return {
                address: deploymentData.airdrop.address.toString(),
                merkleRoot: deploymentData.merkleRoot.toString(16),
                dictCell: deploymentData.dictCell.toBoc().toString('base64'),
                totalRecipients: deploymentData.deploymentData.totalRecipients,
            };

        } catch (error) {
            console.error('Deployment error:', error);
            toast.error(error instanceof Error ? error.message : 'Deployment failed');
            throw error;
        } finally {
            setIsDeploying(false);
        }
    }, [tonConnectUI]);

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

            // First deploy helper contract if needed
            const helperTransaction = {
                validUntil: Math.floor(Date.now() / 1000) + 60,
                messages: [
                    {
                        address: claimData.helper.address.toString(),
                        amount: '150000000', // 0.15 TON
                        payload: claimData.helper.init?.data?.toBoc().toString('base64'),
                    }
                ]
            };

            await tonConnectUI.sendTransaction(helperTransaction);

            // Wait a bit for deployment
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Then send claim transaction
            const claimTransaction = {
                validUntil: Math.floor(Date.now() / 1000) + 60,
                messages: [
                    {
                        address: claimData.helper.address.toString(),
                        amount: '0',
                        payload: claimData.proof.toBoc().toString('base64'),
                    }
                ]
            };

            await tonConnectUI.sendTransaction(claimTransaction);
            
            toast.success(`Successfully claimed ${Number(claimData.claimAmount) / 1e9} tokens!`);
            
            return {
                claimedAmount: claimData.claimAmount,
            };

        } catch (error) {
            console.error('Claim error:', error);
            toast.error(error instanceof Error ? error.message : 'Claim failed');
            throw error;
        } finally {
            setIsClaiming(false);
        }
    }, [tonConnectUI]);

    return {
        deployAirdrop,
        claimTokens,
        isDeploying,
        isClaiming,
    };
}
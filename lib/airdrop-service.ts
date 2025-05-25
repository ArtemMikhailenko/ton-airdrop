import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { Airdrop, AirdropEntry, generateEntriesDictionary, airdropEntryValue } from './contracts/Airdrop';
import { AirdropHelper } from './contracts/AirdropHelper';
import { tonClient } from './ton-client';

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

            console.log('Merkle root:', merkleRoot.toString(16));
            console.log('Dictionary cell:', dictCell.toBoc().toString('base64'));

            // Create airdrop contract
            const airdrop = Airdrop.createFromConfig(
                {
                    merkleRoot,
                    helperCode,
                },
                airdropCode
            );

            console.log('Airdrop address:', airdrop.address.toString());

            // TODO: Get jetton wallet address for the airdrop contract
            // This would require calling the jetton minter's get_wallet_address method
            const jettonWalletAddress = Address.parse('EQAaGp_SEWMpCQmU4JrfEOrxGBRcKj1M9LnMJh7rnl2VNAVw'); // placeholder

            return {
                airdrop,
                dictCell,
                merkleRoot,
                jettonWalletAddress,
                deploymentData: {
                    totalRecipients: recipients.length,
                    totalAmount: entries.reduce((sum, entry) => sum + entry.amount, 0n),
                }
            };

        } catch (error) {
            console.error('Error deploying airdrop:', error);
            throw error;
        }
    }

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
            console.error('Error claiming airdrop:', error);
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
            console.error('Error getting airdrop status:', error);
            throw error;
        }
    }
}

export const airdropService = new AirdropService();

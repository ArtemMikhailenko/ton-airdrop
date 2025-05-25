import { TonClient, Address } from '@ton/ton';
import { getHttpEndpoint } from '@orbs-network/ton-access';

export class TonClientService {
    private client: TonClient | null = null;
    
    async getClient(): Promise<TonClient> {
        if (!this.client) {
            const endpoint = await getHttpEndpoint({ network: 'testnet' });
            this.client = new TonClient({ endpoint });
        }
        return this.client;
    }
    
    async getBalance(address: string): Promise<string> {
        const client = await this.getClient();
        const balance = await client.getBalance(Address.parse(address));
        return (Number(balance) / 1e9).toFixed(2);
    }
    
    async isContractDeployed(address: string): Promise<boolean> {
        const client = await this.getClient();
        const state = await client.getContractState(Address.parse(address));
        return state.state === 'active';
    }
}

export const tonClient = new TonClientService();

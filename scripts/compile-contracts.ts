import { compile, NetworkProvider } from '@ton/blueprint';
import { writeFileSync } from 'fs';
import path from 'path';

export async function run(provider: NetworkProvider) {
    console.log('Compiling contracts...');
    
    try {
        // Compile airdrop contract
        const airdropCode = await compile('Airdrop');
        const airdropCodeBase64 = airdropCode.toBoc().toString('base64');
        
        // Compile helper contract
        const helperCode = await compile('AirdropHelper');
        const helperCodeBase64 = helperCode.toBoc().toString('base64');
        
        // Save to file
        const contractCodes = {
            airdrop: airdropCodeBase64,
            helper: helperCodeBase64,
        };
        
        writeFileSync(
            path.join(process.cwd(), 'lib/contract-codes.json'),
            JSON.stringify(contractCodes, null, 2)
        );
        
        console.log('✅ Contracts compiled successfully!');
        console.log('Airdrop code length:', airdropCodeBase64.length);
        console.log('Helper code length:', helperCodeBase64.length);
        
    } catch (error) {
        console.error('❌ Compilation failed:', error);
        process.exit(1);
    }
}




# TON Airdrop Manager

A Next.js application for deploying and managing jetton airdrops on the TON blockchain.

## Features

- 🚀 Deploy airdrop contracts to TON testnet
- 💰 Claim tokens through Merkle proof verification
- 📊 Track airdrop statistics and status
- 🔗 TON Connect wallet integration
- 🎨 Modern, responsive UI

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Compile contracts:**
   ```bash
   npm run compile-contracts
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your settings
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

## Deployment to Testnet

### Prerequisites

1. **TON Wallet with testnet TON:**
   - Install TON Keeper or other TON wallet
   - Switch to testnet
   - Get testnet TON from faucet

2. **Jetton Minter Contract:**
   - Deploy a jetton minter first
   - Note the minter address

### Deploy Airdrop

1. **Prepare recipient list:**
   ```json
   [
     {
       "address": "EQBKgXCNLPexWhs2L79kiARR1phGH1LwXxRbNsCFF9doc2lN",
       "amount": "1000000000"
     }
   ]
   ```

2. **Connect wallet and deploy:**
   - Open the app
   - Connect your TON wallet
   - Go to "Deploy Airdrop" tab
   - Enter jetton minter address
   - Paste recipient list
   - Click "Deploy Airdrop Contract"

3. **Fund the airdrop:**
   - Send jettons to the airdrop contract
   - Users can now claim their tokens

### Testing

1. **Deploy to testnet:**
   ```bash
   npm run build
   npm run start
   ```

2. **Test claiming:**
   - Use a different wallet
   - Go to "Claim Tokens" tab
   - Enter airdrop contract address
   - Enter your wallet address
   - Click "Claim Tokens"

## Contract Addresses

- Airdrop Contract: `EQA...` (deployed)
- Helper Contract: Auto-generated per claim
- Jetton Minter: `EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqIw`

## Architecture

```
├── contracts/           # FunC smart contracts
├── lib/
│   ├── contracts/      # TypeScript contract wrappers
│   ├── airdrop-service.ts
│   └── ton-client.ts
├── components/         # React components
├── hooks/             # Custom React hooks
└── app/              # Next.js app directory
```

## Gas Costs

- Deploy Airdrop: ~0.05 TON
- Deploy Helper: ~0.15 TON per claim
- Claim Transaction: ~0.01 TON

## Security

- Uses Merkle trees for efficient verification
- Each user deploys their own helper contract
- No central authority can block claims
- All proofs are cryptographically verified
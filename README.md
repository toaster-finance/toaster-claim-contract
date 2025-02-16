# Toaster Claim Contract

A smart contract for token airdrop using Merkle Tree for efficient and secure token distribution.

## Features

- Merkle Tree based token claim system
- ERC20 token support
- Duplicate claim prevention
- Gas-efficient verification system
- Single-function airdrop initialization

## Tech Stack

- Solidity ^0.8.20
- Hardhat
- TypeScript
- Ethers.js v6
- OpenZeppelin Contracts v5.2
- MerkleTree.js

## Installation

```bash
# Install dependencies
yarn install

# Compile contracts
yarn compile

# Run tests
yarn test

# Generate ABI
yarn generate-abi
```

## Environment Setup

1. Create and configure `.env` file

```bash
cp .env.example .env
```

```env
# .env file configuration
METIS_RPC_URL=https://andromeda.metis.io/?owner=1088
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

## Deployment

### Local Testnet Deployment

```bash
# Start local node
yarn node

# In a new terminal, deploy to local network
yarn deploy:local
```

### Metis Mainnet Deployment

```bash
yarn deploy:metis
```

## Contract Usage

1. Save the deployed contract address

2. Initialize Airdrop

```typescript
await merkleAirdrop.initAirdrop(tokenAddress, merkleRoot, depositAmount);
```

3. User Claim

```typescript
await merkleAirdrop.claim(amount, merkleProof);
```

4. Start New Round

```typescript
// Withdraw remaining tokens from previous round
await merkleAirdrop.withdrawUnclaimed();

// Initialize new round
await merkleAirdrop.initAirdrop(newTokenAddress, newMerkleRoot, newDepositAmount);
```

## Development Commands

```bash
# Compile contracts
yarn compile

# Run tests
yarn test

# Run linter
yarn lint

# Fix linting issues
yarn lint:fix

# Format code
yarn format

# Clean artifacts
yarn clean

# Generate contract ABI
yarn generate-abi
```

## Contract ABI

The contract ABI is available in the `abi` directory after running `yarn generate-abi`. This ABI is required for interacting with the deployed contract from external applications.

## Security Considerations

- Single initialization function to prevent inconsistent states
- Automatic claim status reset on new round initialization
- Token balance must be zero before starting a new round
- Secure OpenZeppelin libraries implementation
- Efficient and secure verification through Merkle Tree
- Double-mapping for tracking claims per round

## License

MIT

## Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feat/AmazingFeature`)
5. Open a Pull Request

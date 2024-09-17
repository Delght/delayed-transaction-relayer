# Token Trading Bot

A decentralized application (dApp) for automated token trading on Ethereum-compatible blockchains. This project supports buying, selling, and withdrawing tokens using multiple sub-accounts.

## Features

- Multi-account management
- Batch processing of transactions
- Delayed execution of transactions in the future
- Automated buying and selling of tokens
- Balance monitoring and withdrawal
- Support for multiple Ethereum-compatible chains
- Integration with Uniswap V2 for token swaps

## Important Notes

- This is a source-only project and does not require any environment setup.
- We do not store any user data. All user information and transactions are handled client-side for maximum security and privacy.


## Getting Started

Follow these instructions to set up the project on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v20 or later)
- Yarn (latest version)
- Ethereum wallet with testnet or mainnet funds

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/Delght/delayed-transaction-relayer
   ```

2. Navigate to the project directory:
   ```
   cd delayed-transaction-relayer
   ```

3. Install dependencies:
   ```
   yarn
   ```

4. Run the development server:
   ```
   yarn dev
   ```

## Project Structure

```
src/
├── app/                  # React components and app logic
│   ├── components/       # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   └── ...               # Various app-specific components (buy, sell, config, etc.)
├── client/               # Client configuration for blockchain interaction
├── config/               # Configuration files (chains, constants)
├── modules/
│   ├── transaction/      # Core transaction management logic
│   └── trading/          # Trading-specific logic
├── utils/                # Utility functions and helpers
└── main.tsx              # Entry point of the application
```

## Usage

1. Configure your main account and token information in the application settings.
2. Import existing sub-accounts or generate new ones within the app.
3. Choose between buying, selling, or withdrawing tokens for each sub-account.
4. Monitor transactions and balances in real-time through the user interface.

## Configuration

To configure the application for your specific needs:

1. Update the `config/chains.ts` file to add or modify supported blockchain networks.
2. Adjust trading parameters and thresholds in `config/constants.ts`.
3. Customize the Uniswap V2 integration in `modules/trading/uniswapV2.ts` if needed.


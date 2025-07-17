# Alpha AI Storage - Decentralized Storage Platform

A decentralized storage platform built on BSC Testnet that allows users to securely store files using IPFS technology with provider-based storage allocation.

## 🌟 Features

- **Decentralized Storage**: Files stored on IPFS with multiple provider options
- **Blockchain Integration**: Smart contracts on BSC Testnet for storage purchases
- **End-to-End Encryption**: All files encrypted before storage
- **Provider Network**: Distributed storage providers worldwide
- **Web3 Wallet Integration**: MetaMask support for seamless transactions
- **Real-time Monitoring**: Live provider status and storage usage tracking

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Blockchain**: BSC Testnet (Binance Smart Chain)
- **Storage**: IPFS via Pinata
- **Smart Contracts**: Solidity contracts for token and storage management

## 📋 Prerequisites

- Node.js 18+ 
- MetaMask wallet
- BSC Testnet setup
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/alpha-ai-storage.git
cd alpha-ai-storage
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PINATA_JWT=your_pinata_jwt_token
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

### 4. Database Setup

The project uses Supabase for data management. Migration files are included in `supabase/migrations/`.

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🔧 Provider Setup

To run a storage provider:

### 1. Install IPFS

```bash
# Install IPFS
node cli/ipfs-installer.js

# Configure IPFS for remote access
node cli/ipfs-remote.mjs

# Start IPFS daemon
node cli/ipfs.mjs
```

### 2. Start Provider

```bash
cd cli
node provider.mjs start
```

Follow the prompts to:
- Enter your private key
- Select storage directory
- Set storage allocation size

## 📱 Usage

### For Users

1. **Connect Wallet**: Click "Connect Wallet" and connect your MetaMask
2. **Switch Network**: Ensure you're on BSC Testnet
3. **Browse Providers**: View available storage providers
4. **Purchase Storage**: Select a provider and purchase storage with AAI tokens
5. **Upload Files**: Drag and drop files to upload to your allocated storage
6. **Manage Files**: Download, view, or delete your stored files

### For Providers

1. **Setup Provider**: Run the provider CLI tool
2. **Configure Storage**: Set your storage allocation and pricing
3. **Monitor Activity**: Track file uploads and storage usage
4. **Earn Rewards**: Receive AAI tokens for providing storage

## 🔐 Smart Contracts

### AAI Token Contract
- **Address**: `0xd27362091923B8043C0b92d836f5f10e53207111`
- **Network**: BSC Testnet
- **Standard**: ERC-20

### Storage Contract
- **Address**: `0x5DC1612cca4E375e825b7f3EcD7B6725E3D4aDCB`
- **Network**: BSC Testnet
- **Functions**: Storage purchase, allocation management

## 🗄️ Database Schema

### Main Tables

- `storage_providers`: Provider information and status
- `storage_allocations`: User storage purchases
- `stored_files`: File metadata and IPFS hashes
- `provider_dummy_files`: Provider-side file tracking

## 🛠️ Development

### Project Structure

```
alpha-ai-storage/
├── src/                    # React frontend source
│   ├── components/         # Reusable UI components
│   ├── pages/             # Application pages
│   ├── lib/               # Utilities and configurations
│   └── main.tsx           # Application entry point
├── cli/                   # Provider CLI tools
│   ├── provider.mjs       # Storage provider daemon
│   ├── ipfs-installer.js  # IPFS installation script
│   └── ipfs-remote.mjs    # IPFS configuration
├── contracts/             # Smart contracts
├── supabase/             # Database migrations
└── public/               # Static assets
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### CLI Commands

```bash
# Provider management
node cli/provider.mjs start

# IPFS setup
node cli/ipfs-installer.js
node cli/ipfs-remote.mjs
node cli/ipfs.mjs
```

## 🔧 Configuration

### MetaMask Setup

1. Add BSC Testnet to MetaMask:
   - Network Name: BSC Testnet
   - RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545
   - Chain ID: 97
   - Symbol: tBNB
   - Block Explorer: https://testnet.bscscan.com

2. Get testnet BNB from [BSC Testnet Faucet](https://testnet.binance.org/faucet-smart)

### Pinata Setup

1. Create account at [Pinata](https://pinata.cloud)
2. Generate JWT token
3. Add to environment variables

## 🚨 Troubleshooting

### Common Issues

**Connection Failed**
- Check internet connectivity
- Verify Supabase URL and keys
- Ensure BSC Testnet is selected

**IPFS Installation Issues**
- Run with sudo: `sudo node cli/ipfs-installer.js`
- Check system permissions
- Verify network connectivity

**Provider Not Receiving Files**
- Check provider daemon is running
- Verify database connection
- Ensure storage allocation exists

**Transaction Failures**
- Check AAI token balance
- Verify network (BSC Testnet)
- Ensure sufficient BNB for gas

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Live Demo](hhttps://glistening-faloodeh-7c51ad.netlify.app/)
- [Documentation](https://docs.your-project.com)
- [BSC Testnet Explorer](https://testnet.bscscan.com)
- [Supabase](https://supabase.com)
- [IPFS](https://ipfs.io)

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Join our [Discord](https://discord.gg/your-server)
- Email: support@alphaaistorage.com

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for backend infrastructure
- [Pinata](https://pinata.cloud) for IPFS pinning services
- [BSC](https://www.binance.org/en/smartChain) for blockchain infrastructure
- [React](https://reactjs.org) and [Vite](https://vitejs.dev) for frontend tooling

---

**⚠️ Disclaimer**: This is a testnet application for demonstration purposes. Do not use real funds or sensitive data.
import { ethers } from 'ethers';

// BSC Testnet configuration
export const BSC_TESTNET_CONFIG = {
  chainId: '0x61',
  chainName: 'BSC Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
  blockExplorerUrls: ['https://testnet.bscscan.com/'],
};

// Alpha AI Token Contract (BSC Testnet)
export const AAI_TOKEN_ADDRESS = '0xd27362091923B8043C0b92d836f5f10e53207111';

// Storage Contract (BSC Testnet)
export const STORAGE_CONTRACT_ADDRESS = '0x5DC1612cca4E375e825b7f3EcD7B6725E3D4aDCB';

// Token Contract ABI
export const AAI_TOKEN_ABI = [
  // ERC20 Standard Interface
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// Storage Contract ABI
export const STORAGE_CONTRACT_ABI = [
  "function purchaseStorage(address provider, uint256 storageAmount, uint256 tokenAmount, uint256 duration) external",
  "function getStorageAllocation(address user, address provider) external view returns (uint256 amount, uint256 expiresAt, bool active)",
  "function isStorageValid(address user, address provider) external view returns (bool)",
  "event StoragePurchased(address indexed user, address indexed provider, uint256 amount)"
];

// Default token decimals (used as fallback)
export const DEFAULT_TOKEN_DECIMALS = 18;

export async function verifyContract(provider: ethers.Provider, address: string) {
  try {
    const validAddress = ethers.getAddress(address);
    const code = await provider.getCode(validAddress);
    return code.length > 2;
  } catch {
    return false;
  }
}

export async function getTokenDecimals(provider: ethers.Provider, tokenAddress: string): Promise<number> {
  try {
    const contract = new ethers.Contract(tokenAddress, ["function decimals() view returns (uint8)"], provider);
    const decimals = await contract.decimals();
    return Number(decimals);
  } catch (error) {
    console.warn('Failed to get token decimals, using default:', error);
    return DEFAULT_TOKEN_DECIMALS;
  }
}

export async function checkStorageAllocation(
  provider: ethers.Provider,
  userAddress: string,
  providerAddress: string
): Promise<{ amount: bigint; expiresAt: bigint; active: boolean }> {
  try {
    const contract = new ethers.Contract(STORAGE_CONTRACT_ADDRESS, STORAGE_CONTRACT_ABI, provider);
    return await contract.getStorageAllocation(userAddress, providerAddress);
  } catch (error) {
    console.error('Failed to check storage allocation:', error);
    return { amount: 0n, expiresAt: 0n, active: false };
  }
}

export async function isStorageValid(
  provider: ethers.Provider,
  userAddress: string,
  providerAddress: string
): Promise<boolean> {
  try {
    const contract = new ethers.Contract(STORAGE_CONTRACT_ADDRESS, STORAGE_CONTRACT_ABI, provider);
    return await contract.isStorageValid(userAddress, providerAddress);
  } catch (error) {
    console.error('Failed to check storage validity:', error);
    return false;
  }
}

export async function approveTokens(
  signer: ethers.Signer,
  amount: bigint
): Promise<boolean> {
  try {
    const tokenContract = new ethers.Contract(AAI_TOKEN_ADDRESS, AAI_TOKEN_ABI, signer);
    const tx = await tokenContract.approve(STORAGE_CONTRACT_ADDRESS, amount);
    await tx.wait();
    return true;
  } catch (error) {
    console.error('Failed to approve tokens:', error);
    return false;
  }
}

export async function purchaseStorage(
  signer: ethers.Signer,
  providerAddress: string,
  storageAmount: bigint,
  tokenAmount: bigint,
  duration: number
): Promise<ethers.TransactionReceipt | null> {
  try {
    const contract = new ethers.Contract(STORAGE_CONTRACT_ADDRESS, STORAGE_CONTRACT_ABI, signer);
    const tx = await contract.purchaseStorage(providerAddress, storageAmount, tokenAmount, duration);
    return await tx.wait();
  } catch (error) {
    console.error('Failed to purchase storage:', error);
    return null;
  }
}
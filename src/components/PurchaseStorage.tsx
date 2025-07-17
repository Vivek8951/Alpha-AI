import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ethers } from 'ethers';
import { 
  AAI_TOKEN_ADDRESS, 
  STORAGE_CONTRACT_ADDRESS,
  AAI_TOKEN_ABI,
  verifyContract,
  getTokenDecimals,
  approveTokens,
  purchaseStorage as purchaseStorageContract
} from '../lib/web3';
import CryptoJS from 'crypto-js';

interface StorageProvider {
  id: string;
  name: string;
  wallet_address: string;
  available_storage: number;
  price_per_gb: number;
}

interface PurchaseStorageProps {
  provider: StorageProvider;
  onPurchaseComplete: () => void;
}

export default function PurchaseStorage({ provider, onPurchaseComplete }: PurchaseStorageProps) {
  const [storageAmount, setStorageAmount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const uploadDummyFile = async (userAddress: string) => {
    // Create dummy encrypted data
    const dummyData = CryptoJS.lib.WordArray.random(1024).toString();
    const key = CryptoJS.lib.WordArray.random(256 / 8).toString();
    const encrypted = CryptoJS.AES.encrypt(dummyData, key);
    
    // Create form data for Pinata
    const formData = new FormData();
    const blob = new Blob([encrypted.toString()]);
    formData.append('file', blob, 'storage_allocation.dat');

    const metadata = JSON.stringify({
      name: 'Storage Allocation',
      keyvalues: {
        type: 'allocation',
        provider: provider.wallet_address,
        timestamp: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload allocation file');
    }

    const result = await response.json();
    
    // Create file record
    await supabase.from('stored_files').insert({
      user_address: userAddress,
      file_name: 'storage_allocation.dat',
      file_size: blob.size,
      mime_type: 'application/octet-stream',
      ipfs_cid: result.IpfsHash,
      encrypted_key: key,
      upload_status: 'complete'
    });

    return result.IpfsHash;
  };

  const handlePurchase = async () => {
    try {
      setIsLoading(true);

      if (!(window as any).ethereum) {
        throw new Error('Please install MetaMask or another Web3 wallet');
      }

      const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0x61') {
        throw new Error('Please switch to BSC Testnet to continue');
      }

      const bscProvider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await bscProvider.getSigner();
      const userAddress = await signer.getAddress();

      const [tokenExists, storageExists] = await Promise.all([
        verifyContract(bscProvider, AAI_TOKEN_ADDRESS),
        verifyContract(bscProvider, STORAGE_CONTRACT_ADDRESS)
      ]);

      if (!tokenExists || !storageExists) {
        throw new Error('Contract verification failed');
      }

      const tokenContract = new ethers.Contract(AAI_TOKEN_ADDRESS, AAI_TOKEN_ABI, signer);
      const decimals = await getTokenDecimals(bscProvider, AAI_TOKEN_ADDRESS);
      const totalCost = storageAmount * provider.price_per_gb;
      const tokenAmount = ethers.parseUnits(totalCost.toString(), decimals);

      const balance = await tokenContract.balanceOf(userAddress);
      if (balance < tokenAmount) {
        throw new Error(`Insufficient AAI tokens. You need ${ethers.formatUnits(tokenAmount, decimals)} AAI`);
      }

      const approved = await approveTokens(signer, tokenAmount);
      if (!approved) {
        throw new Error('Failed to approve token spending');
      }

      const duration = 30 * 24 * 60 * 60; // 30 days
      const receipt = await purchaseStorageContract(
        signer,
        provider.wallet_address,
        ethers.parseUnits(storageAmount.toString(), 0),
        tokenAmount,
        duration
      );

      if (!receipt) {
        throw new Error('Storage purchase failed');
      }

      // Upload dummy encrypted file
      const ipfsCid = await uploadDummyFile(userAddress);
      console.log('Allocation file uploaded:', ipfsCid);

      // Create allocation record
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // Get current provider storage
      const { data: currentProvider, error: providerError } = await supabase
        .from('storage_providers')
        .select('available_storage')
        .eq('id', provider.id)
        .single();

      if (providerError) {
        throw new Error('Failed to get current provider storage');
      }

      // Update provider's available storage
      const { error: updateError } = await supabase
        .from('storage_providers')
        .update({ 
          available_storage: currentProvider.available_storage - storageAmount 
        })
        .eq('id', provider.id);

      if (updateError) {
        throw new Error('Failed to update provider storage');
      }

      // Create allocation record
      const { error: allocationError } = await supabase
        .from('storage_allocations')
        .insert({
          user_address: userAddress,
          provider_id: provider.id,
          allocated_gb: storageAmount,
          paid_amount: totalCost,
          transaction_hash: receipt.hash,
          expires_at: expiryDate.toISOString(),
          used_gb: 0
        });

      if (allocationError) {
        throw new Error('Failed to create allocation record');
      }

      onPurchaseComplete();
    } catch (error) {
      console.error('Purchase failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to purchase storage');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Purchase Storage</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Storage Amount (GB)
          </label>
          <input
            type="number"
            min="1"
            max={provider.available_storage}
            value={storageAmount}
            onChange={(e) => setStorageAmount(Math.max(1, parseInt(e.target.value)))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Price per GB:</span>
          <span>{provider.price_per_gb} AAI</span>
        </div>

        <div className="flex justify-between text-sm font-medium">
          <span>Total Cost:</span>
          <span>{(storageAmount * provider.price_per_gb).toFixed(2)} AAI</span>
        </div>

        <button
          onClick={handlePurchase}
          disabled={isLoading || storageAmount < 1}
          className="w-full py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Purchase Storage'}
        </button>
      </div>
    </div>
  );
}
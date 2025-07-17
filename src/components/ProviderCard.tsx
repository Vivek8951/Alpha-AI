import React from 'react';
import { motion } from 'framer-motion';
import { HardDrive, ExternalLink } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  wallet_address: string;
  is_active: boolean;
  health_status: string;
  updated_at: string;
  available_storage: number;
}

interface ProviderCardProps {
  provider: Provider;
  allocation?: {
    allocated_gb: number;
    used_gb: number;
    paid_amount: number;
    transaction_hash: string;
  };
}

export function ProviderCard({ provider, allocation }: ProviderCardProps) {
  const lastUpdateTime = new Date(provider.updated_at).getTime();
  const currentTime = Date.now();
  const isRecentlyActive = lastUpdateTime > currentTime - 30000; // 30 seconds threshold
  const isOnline = isRecentlyActive && provider.is_active && provider.health_status === 'online';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl"
            >
              <HardDrive className="w-6 h-6 text-purple-600" />
            </motion.div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">{provider.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {provider.wallet_address.slice(0, 6)}...{provider.wallet_address.slice(-4)}
              </p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isOnline 
              ? 'bg-green-50 text-green-700' 
              : 'bg-gray-50 text-gray-700'
          }`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {allocation && (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(allocation.used_gb / allocation.allocated_gb) * 100}%` }}
                className="absolute h-full bg-gradient-to-r from-purple-500 to-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Storage Used</p>
                <p className="text-sm font-medium text-gray-900">
                  {allocation.used_gb} / {allocation.allocated_gb} GB
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Amount Paid</p>
                <p className="text-sm font-medium text-gray-900">
                  {allocation.paid_amount} AAI
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <a
                href={`https://testnet.bscscan.com/tx/${allocation.transaction_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 transition-colors"
              >
                View Transaction
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {!allocation && provider.available_storage > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Available Storage</p>
            <p className="text-lg font-medium text-gray-900">{provider.available_storage} GB</p>
          </div>
        )}
      </div>

      {/* Hover Effect Border */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-100 rounded-2xl transition-colors duration-300" />
    </motion.div>
  );
}
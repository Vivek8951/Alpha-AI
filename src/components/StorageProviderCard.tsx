import React from 'react';
import { motion } from 'framer-motion';
import { HardDrive, ExternalLink } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

interface StorageProviderCardProps {
  provider: {
    id: string;
    name: string;
    wallet_address: string;
    is_active: boolean;
    updated_at: string;
  };
  allocation?: {
    allocated_gb: number;
    used_gb: number;
    paid_amount: number;
    transaction_hash: string;
  };
}

export function StorageProviderCard({ provider, allocation }: StorageProviderCardProps) {
  const isOnline = provider.is_active && 
    new Date(provider.updated_at).getTime() > Date.now() - 30000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="relative overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg"
            >
              <HardDrive className="w-5 h-5 text-purple-600" />
            </motion.div>
            <div>
              <motion.h3
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium text-gray-900"
              >
                {provider.name}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-gray-500"
              >
                {provider.wallet_address.slice(0, 6)}...{provider.wallet_address.slice(-4)}
              </motion.p>
            </div>
          </div>
          <StatusBadge status={isOnline ? 'online' : 'offline'} />
        </div>

        {allocation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <ProgressBar
              progress={(allocation.used_gb / allocation.allocated_gb) * 100}
              className="mb-6"
            />

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
          </motion.div>
        )}
      </div>

      {/* Gradient border effect */}
      <div className="absolute inset-0 border border-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl pointer-events-none" />
    </motion.div>
  );
}
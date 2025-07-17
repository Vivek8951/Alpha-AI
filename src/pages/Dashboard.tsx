import React, { useEffect, useState } from 'react';
import { HardDrive, Upload, Download, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { ethers } from 'ethers';
import { useWallet } from '../lib/WalletContext';
import { StatsCard } from '../components/StatsCard';
import { ActivityCard } from '../components/ActivityCard';
import { ProviderCard } from '../components/ProviderCard';
import { AnimatedBackground } from '../components/AnimatedBackground';

interface StorageStats {
  totalStorage: number;
  usedStorage: number;
  totalFiles: number;
  downloadedThisMonth: number;
  remainingDays: number;
}

interface Provider {
  id: string;
  name: string;
  wallet_address: string;
  available_storage: number;
  price_per_gb: number;
  is_active: boolean;
  updated_at: string;
}

interface StorageAllocation {
  id: string;
  allocated_gb: number;
  expires_at: string;
  provider_id: string;
  paid_amount: number;
  transaction_hash: string;
}

function Dashboard() {
  const { address } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [storageStats, setStorageStats] = useState<StorageStats>({
    totalStorage: 0,
    usedStorage: 0,
    totalFiles: 0,
    downloadedThisMonth: 0,
    remainingDays: 0
  });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<StorageAllocation[]>([]);

  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const normalizedAddress = ethers.getAddress(address);

        const [allocationsData, files, providerData] = await Promise.all([
          supabase
            .from('storage_allocations')
            .select('*')
            .or(`user_address.eq.${normalizedAddress},user_address.eq.${normalizedAddress.toLowerCase()}`)
            .gte('expires_at', new Date().toISOString()),
          
          supabase
            .from('stored_files')
            .select('*')
            .or(`user_address.eq.${normalizedAddress},user_address.eq.${normalizedAddress.toLowerCase()}`)
            .order('created_at', { ascending: false }),
          
          supabase
            .from('storage_providers')
            .select('*')
        ]);

        if (allocationsData.error) throw allocationsData.error;
        if (files.error) throw files.error;
        if (providerData.error) throw providerData.error;

        setAllocations(allocationsData.data || []);
        setProviders(providerData.data || []);
        setRecentActivity(files.data?.slice(0, 5) || []);

        const totalStorage = allocationsData.data?.reduce((sum, alloc) => sum + Number(alloc.allocated_gb), 0) || 0;
        const usedStorage = files.data?.reduce((sum, file) => sum + Number(file.file_size), 0) / (1024 * 1024 * 1024) || 0;
        const nearestExpiry = allocationsData.data?.reduce((nearest, alloc) => 
          !nearest || new Date(alloc.expires_at) < new Date(nearest) ? alloc.expires_at : nearest
        , null);

        setStorageStats({
          totalStorage,
          usedStorage,
          totalFiles: files.data?.length || 0,
          downloadedThisMonth: 0,
          remainingDays: nearestExpiry ? 
            Math.ceil((new Date(nearestExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
            0
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    const subscription = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [address]);

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />

      <AnimatePresence>
        <div className="relative space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <StatsCard
              icon={HardDrive}
              title="Total Storage"
              value={`${storageStats.totalStorage} GB`}
              subValue={`Used: ${storageStats.usedStorage.toFixed(2)} GB`}
              trend={{
                value: 5,
                isPositive: true
              }}
            />
            <StatsCard
              icon={Upload}
              title="Uploaded Files"
              value={storageStats.totalFiles}
              subValue="Total files"
            />
            <StatsCard
              icon={Download}
              title="Downloaded"
              value={`${storageStats.downloadedThisMonth.toFixed(2)} GB`}
              subValue="This month"
            />
            <StatsCard
              icon={Clock}
              title="Storage Time"
              value={`${storageStats.remainingDays} days`}
              subValue="Remaining"
            />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityCard
              activities={recentActivity.map(activity => ({
                id: activity.id,
                type: 'upload',
                title: 'File uploaded',
                description: `${activity.file_name} • ${(activity.file_size / (1024 * 1024)).toFixed(2)} MB`,
                timestamp: activity.created_at
              }))}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Your Storage Providers
                </h3>
                <div className="space-y-4">
                  {providers.map(provider => {
                    const allocation = allocations.find(a => a.provider_id === provider.id);
                    return (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        allocation={allocation}
                      />
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatePresence>
    </div>
  );
}

export default Dashboard;
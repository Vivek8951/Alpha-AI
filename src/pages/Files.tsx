import React, { useState, useEffect } from 'react';
import { Upload, File as FileIcon, Download, Trash2, ExternalLink, Image, FileText, Music, Video, Archive, Code, RefreshCw, HardDrive } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWallet } from '../lib/WalletContext';
import { uploadFile } from '../lib/upload';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface StoredFile {
  id: string;
  file_name: string;
  file_size: number;
  ipfs_cid: string;
  mime_type: string;
  created_at: string;
  upload_status?: 'pending' | 'complete';
}

interface StorageAllocation {
  id: string;
  provider_id: string;
  allocated_gb: number;
  used_gb: number;
  storage_providers: {
    name: string;
    wallet_address: string;
    is_active: boolean;
    updated_at: string;
  };
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('text/')) return FileText;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.includes('zip') || mimeType.includes('tar')) return Archive;
  if (mimeType.includes('javascript') || mimeType.includes('json')) return Code;
  return FileIcon;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateString));
}

function StorageCard({ allocation }: { allocation: StorageAllocation }) {
  const lastUpdateTime = new Date(allocation.storage_providers.updated_at).getTime();
  const currentTime = Date.now();
  const isOnline = allocation.storage_providers.is_active && (lastUpdateTime > currentTime - 30000);
  const usagePercentage = (allocation.used_gb / allocation.allocated_gb) * 100;
  
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <HardDrive className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">{allocation.storage_providers.name}</h4>
            <p className="text-xs text-gray-500">{allocation.storage_providers.wallet_address.slice(0, 6)}...{allocation.storage_providers.wallet_address.slice(-4)}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          isOnline ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
        }`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Used Storage:</span>
          <span className="font-medium">{allocation.used_gb.toFixed(2)} / {allocation.allocated_gb} GB</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function FilePreview({ file }: { file: StoredFile }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY;

  useEffect(() => {
    if (!file.ipfs_cid || file.upload_status !== 'complete') return;

    if (file.mime_type.startsWith('image/')) {
      setPreviewUrl(`${ipfsGateway}${file.ipfs_cid}`);
    }

    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [file, ipfsGateway]);

  if (!previewUrl) {
    const Icon = getFileIcon(file.mime_type);
    return (
      <div className="h-32 bg-gray-50 flex items-center justify-center rounded-t-lg">
        <Icon className="w-12 h-12 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative group">
      <img
        src={previewUrl}
        alt={file.file_name}
        className="w-full h-32 object-cover rounded-t-lg"
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity rounded-t-lg" />
    </div>
  );
}

function Files() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [allocations, setAllocations] = useState<StorageAllocation[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { address } = useWallet();
  const [totalStorage, setTotalStorage] = useState<number>(0);
  const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY;

  const fetchFiles = async () => {
    if (!address) return;

    try {
      const [filesResponse, allocationsResponse] = await Promise.all([
        supabase
          .from('stored_files')
          .select('*')
          .or(`user_address.eq.${address},user_address.eq.${address.toLowerCase()})`)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('storage_allocations')
          .select(`
            id,
            provider_id,
            allocated_gb,
            used_gb,
            storage_providers (
              name,
              wallet_address,
              is_active,
              updated_at
            )
          `)
          .eq('user_address', address)
          .gte('expires_at', new Date().toISOString())
      ]);

      if (filesResponse.error) throw filesResponse.error;
      if (allocationsResponse.error) throw allocationsResponse.error;

      setFiles(filesResponse.data || []);
      setAllocations(allocationsResponse.data || []);

      const totalBytes = (filesResponse.data || [])
        .filter(f => f.upload_status === 'complete')
        .reduce((sum, file) => sum + (file.file_size || 0), 0);
      setTotalStorage(totalBytes);
    } catch (error) {
      console.error('Error refreshing files:', error);
      toast.error('Failed to refresh files');
    }
  };

  useEffect(() => {
    fetchFiles();

    const subscription = supabase
      .channel('stored_files')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stored_files' }, fetchFiles)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [address]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFiles();
    setRefreshing(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const getTotalAllocatedStorage = () => {
    return allocations.reduce((total, allocation) => total + allocation.allocated_gb, 0);
  };

  const handleFileUpload = async (file: File) => {
    if (!address) return;

    const totalAllocatedGB = getTotalAllocatedStorage();
    const maxSize = totalAllocatedGB > 0 ? totalAllocatedGB * 1024 * 1024 * 1024 : 1024 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error(`File size exceeds your storage limit of ${totalAllocatedGB > 0 ? totalAllocatedGB + 'GB' : '1GB'}`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const uploadToast = toast.loading('Preparing upload...');

    try {
      const { data: pendingFile, error: pendingError } = await supabase
        .from('stored_files')
        .insert({
          user_address: address,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          upload_status: 'pending'
        })
        .select()
        .single();

      if (pendingError) throw new Error(`Failed to create pending file record: ${pendingError.message}`);

      toast.loading('Uploading file...', { id: uploadToast });
      const result = await uploadFile(file, (progress) => {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        setUploadProgress(percentage);
        toast.loading(`Uploading: ${percentage}%`, { id: uploadToast });
      });

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      const { error: updateError } = await supabase
        .from('stored_files')
        .update({
          ipfs_cid: result.ipfsHash,
          upload_status: 'complete'
        })
        .eq('id', pendingFile.id);

      if (updateError) throw new Error(`Failed to update file record: ${updateError.message}`);

      toast.success('File uploaded successfully!', { id: uploadToast });
      setTotalStorage(prev => prev + file.size);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed', { id: uploadToast });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (file: StoredFile) => {
    const downloadToast = toast.loading('Downloading file...');
    try {
      const response = await fetch(`${ipfsGateway}${file.ipfs_cid}`);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('File downloaded successfully!', { id: downloadToast });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file', { id: downloadToast });
    }
  };

  const handleDelete = async (fileId: string) => {
    const deleteToast = toast.loading('Deleting file...');
    try {
      const { error } = await supabase
        .from('stored_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
      toast.success('File deleted successfully!', { id: deleteToast });
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file', { id: deleteToast });
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <FileIcon className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Connect Your Wallet</h3>
        <p className="text-gray-500 mt-2">Please connect your wallet to manage your files</p>
      </div>
    );
  }

  const totalAllocatedGB = getTotalAllocatedStorage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Files</h2>
          {totalStorage > 0 && (
            <p className="text-gray-500 mt-1">
              Storage used: {formatFileSize(totalStorage)}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-600 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {allocations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {allocations.map((allocation) => (
            <StorageCard key={allocation.id} allocation={allocation} />
          ))}
        </div>
      )}

      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-colors ${
          dragActive
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        <div className="text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">
            {uploading ? `Uploading... ${uploadProgress}%` : 'Drop files here or click to upload'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Maximum file size: {totalAllocatedGB > 0 ? `${totalAllocatedGB}GB` : '1GB'}
          </p>
          {uploading && (
            <motion.div 
              className="w-full h-2 bg-gray-200 rounded-full mt-4 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-full bg-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          )}
        </div>
      </div>

      {files.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <FilePreview file={file} />

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {file.file_name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {file.upload_status === 'complete' ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full">
                        Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {file.upload_status === 'complete' && (
                      <>
                        <button
                          onClick={() => handleDownload(file)}
                          className="flex items-center text-sm text-gray-500 hover:text-purple-600"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </button>
                        <a
                          href={`${ipfsGateway}${file.ipfs_cid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-sm text-gray-500 hover:text-purple-600"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </a>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No files yet</h3>
          <p className="text-gray-500 mt-1">Upload your first file to get started</p>
        </div>
      )}
    </div>
  );
}

export default Files;
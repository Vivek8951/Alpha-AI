import React, { useState, useEffect } from 'react';
import { FileIcon, Image, FileText, Music, Video, Archive, Code } from 'lucide-react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { decryptFile } from '../lib/ipfs';

interface FilePreviewProps {
  file: {
    file_name: string;
    mime_type: string;
    ipfs_cid: string;
    encrypted_key?: string;
    upload_status: string;
  };
  className?: string;
}

export function FilePreview({ file, className }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY;

  useEffect(() => {
    const loadPreview = async () => {
      if (!file.ipfs_cid || file.upload_status !== 'complete') {
        setIsLoading(false);
        return;
      }

      try {
        // Only attempt preview for supported file types
        if (!file.mime_type.startsWith('image/')) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${ipfsGateway}${file.ipfs_cid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch file');
        }

        const encryptedBlob = await response.blob();
        
        if (file.encrypted_key) {
          const decryptedBlob = await decryptFile(encryptedBlob, file.encrypted_key, file.mime_type);
          setPreviewUrl(URL.createObjectURL(decryptedBlob));
        } else {
          setPreviewUrl(URL.createObjectURL(encryptedBlob));
        }
      } catch (error) {
        console.error('Preview generation failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate preview');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, ipfsGateway]);

  const getFileIcon = () => {
    if (file.mime_type.startsWith('image/')) return Image;
    if (file.mime_type.startsWith('text/')) return FileText;
    if (file.mime_type.startsWith('audio/')) return Music;
    if (file.mime_type.startsWith('video/')) return Video;
    if (file.mime_type.includes('zip') || file.mime_type.includes('tar')) return Archive;
    if (file.mime_type.includes('javascript') || file.mime_type.includes('json')) return Code;
    return FileIcon;
  };

  const Icon = getFileIcon();

  if (isLoading) {
    return (
      <div className={twMerge("flex items-center justify-center h-32 bg-gray-50", className)}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={twMerge("flex flex-col items-center justify-center h-32 bg-gray-50", className)}>
        <Icon className="w-8 h-8 text-gray-400 mb-2" />
        <p className="text-xs text-gray-500">Preview unavailable</p>
      </div>
    );
  }

  if (file.mime_type.startsWith('image/') && previewUrl) {
    return (
      <div className={twMerge("relative group overflow-hidden h-32", className)}>
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          src={previewUrl}
          alt={file.file_name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity" />
      </div>
    );
  }

  return (
    <div className={twMerge("flex items-center justify-center h-32 bg-gray-50", className)}>
      <Icon className="w-12 h-12 text-gray-400" />
    </div>
  );
}
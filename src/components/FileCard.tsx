import React from 'react';
import { Download, Trash2, ExternalLink } from 'lucide-react';
import { FilePreview } from './FilePreview';
import { motion } from 'framer-motion';

interface FileCardProps {
  file: {
    id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    created_at: string;
    ipfs_cid: string;
    encrypted_key?: string;
    upload_status: string;
  };
  onDownload: () => void;
  onDelete: () => void;
  formatFileSize: (size: number) => string;
  formatDate: (date: string) => string;
}

export function FileCard({ file, onDownload, onDelete, formatFileSize, formatDate }: FileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
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
                  onClick={onDownload}
                  className="flex items-center text-sm text-gray-500 hover:text-purple-600 transition-colors"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </button>
                <a
                  href={`${import.meta.env.VITE_IPFS_GATEWAY}${file.ipfs_cid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-gray-500 hover:text-purple-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View
                </a>
              </>
            )}
          </div>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
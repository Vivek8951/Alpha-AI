import { supabase } from './supabase';
import axios from 'axios';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const FREE_STORAGE_LIMIT = 1024 * 1024 * 1024; // 1GB in bytes

interface UploadProgress {
  loaded: number;
  total: number;
}

interface UploadResult {
  success: boolean;
  ipfsHash?: string;
  error?: string;
}

async function uploadToPinata(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const metadata = {
    name: file.name,
    keyvalues: {
      originalType: file.type,
      size: file.size.toString()
    }
  };
  formData.append('pinataMetadata', JSON.stringify(metadata));

  const response = await axios.post(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    formData,
    {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total
          });
        }
      }
    }
  );

  return response.data.IpfsHash;
}

export async function uploadFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Validate file size
    if (file.size > FREE_STORAGE_LIMIT) {
      throw new Error('File size exceeds the 1GB limit');
    }

    // Upload to Pinata
    const ipfsHash = await uploadToPinata(file, onProgress);

    return {
      success: true,
      ipfsHash
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}
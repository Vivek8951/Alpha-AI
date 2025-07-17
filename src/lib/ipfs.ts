import axios from 'axios';
import FormData from 'form-data';
import CryptoJS from 'crypto-js';

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY;

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export async function createEncryptedDummyFile(size: number): Promise<{ data: Blob; key: string }> {
  // Generate random content matching the size
  const dummyContent = CryptoJS.lib.WordArray.random(size);
  
  // Generate encryption key
  const encryptionKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
  
  // Encrypt the dummy content
  const encrypted = CryptoJS.AES.encrypt(dummyContent, encryptionKey);
  const encryptedBlob = new Blob([encrypted.toString()], { type: 'application/encrypted' });
  
  return {
    data: encryptedBlob,
    key: encryptionKey
  };
}

export async function uploadToPinata(file: File): Promise<{ ipfsCid: string }> {
  try {
    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        originalType: file.type,
        size: file.size
      }
    });
    formData.append('pinataMetadata', metadata);

    // Upload to Pinata
    const response = await axios.post<PinataResponse>(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    return {
      ipfsCid: response.data.IpfsHash
    };
  } catch (error) {
    console.error('Pinata upload error:', error);
    throw new Error('Failed to upload file to Pinata');
  }
}

export async function downloadFromPinata(ipfsCid: string): Promise<Blob> {
  try {
    const response = await axios.get(`${PINATA_GATEWAY}${ipfsCid}`, {
      responseType: 'blob',
      timeout: 30000
    });

    return response.data;
  } catch (error) {
    console.error('Pinata download error:', error);
    throw new Error('Failed to download file from Pinata');
  }
}

export async function unpinFromPinata(ipfsCid: string): Promise<void> {
  try {
    await axios.delete(`${PINATA_API_URL}/pinning/unpin/${ipfsCid}`, {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      }
    });
  } catch (error) {
    console.error('Pinata unpin error:', error);
    throw new Error('Failed to unpin file from Pinata');
  }
}

export async function testPinataConnection(): Promise<boolean> {
  try {
    const response = await axios.get(`${PINATA_API_URL}/data/testAuthentication`, {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      }
    });
    return response.status === 200;
  } catch (error) {
    console.error('Pinata connection test failed:', error);
    return false;
  }
}
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import axios from 'npm:axios@1.6.7';
import FormData from 'npm:form-data@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface UploadResponse {
  success: boolean;
  ipfsHash?: string;
  providerResponse?: {
    status: string;
    message: string;
    timestamp: number;
  };
  error?: string;
}

async function uploadToPinata(file: Uint8Array, fileName: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', Buffer.from(file), fileName);

  const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
    headers: {
      'Authorization': `Bearer ${Deno.env.get('PINATA_JWT')}`,
      ...formData.getHeaders(),
    },
    maxBodyLength: Infinity,
  });

  return response.data.IpfsHash;
}

async function simulateProviderProcessing(fileHash: string): Promise<{
  status: string;
  message: string;
  timestamp: number;
}> {
  // Simulate provider validation and processing
  await new Promise(resolve => setTimeout(resolve, 2000));

  return {
    status: 'success',
    message: `File ${fileHash} processed and validated by provider`,
    timestamp: Date.now(),
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Get the file from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Read file content
    const fileContent = new Uint8Array(await file.arrayBuffer());

    // Upload to Pinata
    console.log('Uploading to Pinata...');
    const ipfsHash = await uploadToPinata(fileContent, file.name);
    console.log('IPFS Hash:', ipfsHash);

    // Simulate provider processing
    console.log('Simulating provider processing...');
    const providerResponse = await simulateProviderProcessing(ipfsHash);
    console.log('Provider response:', providerResponse);

    // Store the upload record in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: dbError } = await supabase
      .from('stored_files')
      .insert({
        ipfs_cid: ipfsHash,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        upload_status: 'complete'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store file record');
    }

    const response: UploadResponse = {
      success: true,
      ipfsHash,
      providerResponse
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    const response: UploadResponse = {
      success: false,
      error: error.message || 'Internal server error'
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});
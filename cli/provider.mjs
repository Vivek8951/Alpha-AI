import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, access, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import CryptoJS from 'crypto-js';
import mime from 'mime-types';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://umtbsoictwdddnshtkmu.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtdGJzb2ljdHdkZGRuc2h0a211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTcwMzYsImV4cCI6MjA2ODMzMzAzNn0.pmg81He6SA7XTU48ztfqlDQ4S06UbmP_mZhbO-lUxqo'
);

// Test database connection
async function testConnection() {
  try {
    console.log(chalk.blue('Testing database connection...'));
    const { data, error } = await supabase
      .from('storage_providers')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error(chalk.red('Database connection failed:'), error);
      return false;
    }
    
    console.log(chalk.green('✓ Database connection successful'));
    return true;
  } catch (error) {
    console.error(chalk.red('Network error:'), error.message);
    return false;
  }
}

let fileMonitoringInterval;
let storageMonitoringInterval;

async function getProviderId(walletAddress) {
  const { data, error } = await supabase
    .from('storage_providers')
    .select('id')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();

  if (error) throw error;
  return data.id;
}

async function createDummyFile(file, providerStorageDir) {
  const spinner = ora('Processing file...').start();
  try {
    // Generate encryption key
    const encryptionKey = CryptoJS.lib.WordArray.random(32).toString();

    // Create buffer with exact file size
    const buffer = Buffer.alloc(file.file_size);
    
    // Fill with random data that matches the file type pattern
    if (file.mime_type.startsWith('text/')) {
      // For text files, use readable characters
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = chars.charCodeAt(Math.floor(Math.random() * chars.length));
      }
    } else {
      // For binary files, use random bytes
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
    }

    // Encrypt the buffer
    const wordArray = CryptoJS.lib.WordArray.create(buffer);
    const encrypted = CryptoJS.AES.encrypt(wordArray, encryptionKey);
    
    // Get file extension from mime type
    const ext = mime.extension(file.mime_type) || 'bin';
    const timestamp = Date.now();
    const filePath = path.join(providerStorageDir, `file_${timestamp}.${ext}.enc`);
    
    // Write encrypted data
    await writeFile(filePath, encrypted.toString());
    
    spinner.succeed(`File received and encrypted (${(file.file_size / 1024 / 1024).toFixed(2)} MB)`);
    return { path: filePath, key: encryptionKey };
  } catch (error) {
    spinner.fail('Failed to process file');
    throw error;
  }
}

async function updateStorageUsage(providerId, userAddress) {
  try {
    // Get total file size for the user
    const { data: files, error: filesError } = await supabase
      .from('stored_files')
      .select('file_size')
      .eq('user_address', userAddress)
      .eq('upload_status', 'complete');

    if (filesError) throw filesError;

    const totalUsedBytes = files?.reduce((sum, file) => sum + file.file_size, 0) || 0;
    const usedGB = totalUsedBytes / (1024 * 1024 * 1024);

    // Update allocation with correct usage
    const { error: updateError } = await supabase
      .from('storage_allocations')
      .update({ used_gb: usedGB })
      .eq('provider_id', providerId)
      .eq('user_address', userAddress)
      .gte('expires_at', new Date().toISOString());

    if (updateError) throw updateError;

    return usedGB;
  } catch (error) {
    console.error('Error updating storage usage:', error);
    return null;
  }
}

async function monitorNewFiles(walletAddress, providerStorageDir) {
  try {
    const providerId = await getProviderId(walletAddress);

    // Get allocations for this provider
    const { data: allocations } = await supabase
      .from('storage_allocations')
      .select('*')
      .eq('provider_id', providerId)
      .gte('expires_at', new Date().toISOString());

    if (!allocations || allocations.length === 0) {
      return;
    }

    // Get user addresses with valid allocations
    const userAddresses = allocations.map(a => a.user_address.toLowerCase());

    // Get processed files for this provider
    const { data: processedFiles } = await supabase
      .from('provider_dummy_files')
      .select('original_file_id')
      .eq('provider_id', providerId);

    const processedIds = processedFiles?.map(f => f.original_file_id) || [];

    // Get new files that haven't been processed yet
    const { data: files, error } = await supabase
      .from('stored_files')
      .select('*')
      .eq('upload_status', 'complete')
      .in('user_address', userAddresses);

    if (error) {
      console.error('Error fetching files:', error);
      return;
    }

    // Filter out already processed files
    const newFiles = files?.filter(f => !processedIds.includes(f.id)) || [];

    if (newFiles.length > 0) {
      console.log(chalk.blue(`\n📥 Processing ${newFiles.length} new files...`));

      for (const file of newFiles) {
        try {
          // Find matching allocation
          const allocation = allocations.find(a => 
            a.user_address.toLowerCase() === file.user_address.toLowerCase()
          );

          if (!allocation) {
            console.log(chalk.yellow(`No valid allocation found for user ${file.user_address}`));
            continue;
          }

          // Create encrypted file
          const { path: filePath, key: encryptionKey } = await createDummyFile(file, providerStorageDir);

          // Record file
          const { error: insertError } = await supabase
            .from('provider_dummy_files')
            .insert({
              provider_id: providerId,
              allocation_id: allocation.id,
              original_file_id: file.id,
              file_name: path.basename(filePath),
              file_size: file.file_size,
              dummy_path: filePath,
              encryption_key: encryptionKey,
              received_at: new Date().toISOString()
            });

          if (insertError) throw insertError;

          // Update storage usage for the user
          await updateStorageUsage(providerId, file.user_address);

          console.log(chalk.green(`✓ File received and encrypted: ${file.file_name}`));
        } catch (error) {
          console.error(`Failed to process file:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error monitoring files:', error);
  }
}

async function checkStorageAllocations(walletAddress) {
  try {
    const providerId = await getProviderId(walletAddress);
    
    const { data: allocations, error } = await supabase
      .from('storage_allocations')
      .select('*')
      .eq('provider_id', providerId)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking allocations:', error);
      return;
    }

    if (allocations && allocations.length > 0) {
      // Update storage usage for all users
      for (const allocation of allocations) {
        const usedGB = await updateStorageUsage(providerId, allocation.user_address);
        if (usedGB !== null) {
          allocation.used_gb = usedGB;
        }
      }

      const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.allocated_gb), 0);
      const totalUsed = allocations.reduce((sum, a) => sum + Number(a.used_gb), 0);
      console.log(chalk.blue(`\n💾 Storage allocation: ${totalAllocated} GB`));
      console.log(chalk.blue(`📊 Used: ${totalUsed.toFixed(2)} GB`));
    }
  } catch (error) {
    console.error('Error checking allocations:', error);
  }
}

async function startProvider() {
  try {
    console.log(chalk.blue('🚀 Starting Alpha AI Storage Provider...'));
    
    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.error(chalk.red('Cannot proceed without database connection'));
      process.exit(1);
    }

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'privateKey',
        message: 'Enter your private key:',
        validate: (input) => {
          try {
            const formattedKey = input.startsWith('0x') ? input : `0x${input}`;
            new ethers.Wallet(formattedKey);
            return true;
          } catch {
            return 'Invalid private key';
          }
        }
      },
      {
        type: 'list',
        name: 'storageDir',
        message: 'Select storage directory:',
        choices: async () => {
          const drives = os.platform() === 'win32' 
            ? (await execAsync('wmic logicaldisk get name')).stdout.split('\r\r\n')
              .filter(d => d.trim() && d !== 'Name')
              .map(d => d.trim())
            : (await execAsync('df -h --output=target')).stdout.split('\n')
              .slice(1)
              .filter(d => d.trim())
              .filter(d => ["/", "/home", "/mnt", "/media"].some(prefix => d.startsWith(prefix)));

          return [
            ...drives.map(drive => ({
              name: `${drive} (${os.platform() === 'win32' ? 'Drive' : 'Mount Point'})`,
              value: drive
            })),
            { name: 'Custom Path', value: 'custom' }
          ];
        }
      },
      {
        type: 'input',
        name: 'customStorageDir',
        message: 'Enter custom storage path:',
        when: (answers) => answers.storageDir === 'custom',
        validate: async (input) => {
          try {
            await access(input);
            return true;
          } catch {
            return 'Invalid directory path';
          }
        }
      },
      {
        type: 'number',
        name: 'storageSize',
        message: 'Enter storage size to allocate (in GB):',
        validate: (input) => {
          const size = parseInt(input);
          if (isNaN(size) || size <= 0) {
            return 'Please enter a valid storage size greater than 0';
          }
          return true;
        }
      }
    ]);

    const privateKey = answers.privateKey;
    const storageDir = answers.storageDir === 'custom' ? answers.customStorageDir : answers.storageDir;
    const storageSize = parseInt(answers.storageSize);

    const wallet = new ethers.Wallet(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
    const address = wallet.address;

    let providerData = await supabase
      .from('storage_providers')
      .select('*')
      .eq('wallet_address', address.toLowerCase())
      .single();

    if (!providerData.data) {
      const { data: newProvider, error } = await supabase
        .from('storage_providers')
        .insert([{
          name: `Provider ${address.slice(0, 6)}`,
          wallet_address: address.toLowerCase(),
          available_storage: storageSize,
          price_per_gb: 1.00,
          ipfs_node_id: 'pinata',
          ipfs_url: 'https://api.pinata.cloud',
          is_active: true,
          health_status: 'online',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_health_check: new Date().toISOString(),
          uptime_percentage: 100.0
        }])
        .select()
        .single();

      if (error) throw error;
      providerData = newProvider;
    } else {
      await supabase
        .from('storage_providers')
        .update({
          is_active: true,
          health_status: 'online',
          updated_at: new Date().toISOString(),
          last_health_check: new Date().toISOString()
        })
        .eq('wallet_address', address.toLowerCase());
    }

    const providerStorageDir = path.join(
      os.platform() === 'win32' ? storageDir : os.homedir(),
      '.alpha-ai-storage'
    );
    await mkdir(providerStorageDir, { recursive: true });

    console.log(chalk.green('\n✅ Provider configuration complete:'));
    console.log(chalk.blue(`📂 Storage Directory: ${providerStorageDir}`));
    console.log(chalk.blue(`🔗 IPFS Provider: Pinata`));
    console.log(chalk.blue(`💰 Wallet Address: ${address}`));

    console.log(chalk.blue('\n📡 Starting storage monitoring...'));
    
    // Run initial checks
    await monitorNewFiles(address, providerStorageDir);
    await checkStorageAllocations(address);

    // Check for new files every 30 seconds
    fileMonitoringInterval = setInterval(() => {
      monitorNewFiles(address, providerStorageDir);
    }, 30000);

    // Update storage usage stats every hour
    storageMonitoringInterval = setInterval(() => {
      checkStorageAllocations(address);
    }, 3600000);

    // Keep status update interval at 15 seconds for provider health checks
    const statusInterval = setInterval(async () => {
      await supabase
        .from('storage_providers')
        .update({
          updated_at: new Date().toISOString(),
          last_health_check: new Date().toISOString()
        })
        .eq('wallet_address', address.toLowerCase());
    }, 15000);

    process.on('SIGINT', async () => {
      clearInterval(fileMonitoringInterval);
      clearInterval(storageMonitoringInterval);
      clearInterval(statusInterval);
      
      await supabase
        .from('storage_providers')
        .update({ 
          is_active: false,
          health_status: 'offline',
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', address.toLowerCase());
      
      console.log(chalk.yellow('\nProvider shutting down...'));
      process.exit(0);
    });

  } catch (error) {
    console.error(chalk.red('Error:', error.message));
    process.exit(1);
  }
}

const program = new Command();

program
  .name('alpha-ai-provider')
  .description('Alpha AI DePIN Storage Provider CLI')
  .version('1.0.0');

program.command('start')
  .description('Start providing storage')
  .action(startProvider);

program.parse(process.argv);
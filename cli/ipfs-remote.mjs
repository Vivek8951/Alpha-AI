import { exec } from 'child_process';
import { promisify } from 'util';
import ora from 'ora';

const execAsync = promisify(exec);

async function configureRemoteAccess() {
  const spinner = ora('Configuring IPFS for remote access...').start();
  try {
    // Configure API to listen on all interfaces
    await execAsync('ipfs config Addresses.API "/ip4/0.0.0.0/tcp/5001"');
    spinner.succeed('API configured to listen on all interfaces');

    // Configure Gateway to listen on all interfaces
    await execAsync('ipfs config Addresses.Gateway "/ip4/0.0.0.0/tcp/8080"');
    spinner.succeed('Gateway configured to listen on all interfaces');

    // Configure CORS headers with proper escaping
    const corsCommands = [
      'ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin \'["*"]\'',
      'ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods \'["PUT", "POST", "GET", "OPTIONS"]\'',
      'ipfs config --json API.HTTPHeaders.Access-Control-Allow-Headers \'["Authorization", "Content-Type", "X-Requested-With"]\'',
      'ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials \'["true"]\'',
      'ipfs config --json API.HTTPHeaders.Access-Control-Expose-Headers \'["Location", "Ipfs-Hash"]\''
    ];

    for (const cmd of corsCommands) {
      try {
        await execAsync(cmd);
      } catch (error) {
        spinner.fail(`CORS configuration failed: ${error.message}`);
        throw error;
      }
    }
    spinner.succeed('CORS headers configured');

    // Configure Swarm for external access
    await execAsync('ipfs config --json Addresses.Swarm \'["/ip4/0.0.0.0/tcp/4001", "/ip4/0.0.0.0/tcp/8081/ws"]\'');
    spinner.succeed('Swarm ports configured');

    // Enable pubsub
    await execAsync('ipfs config --json Pubsub.Enabled true');
    spinner.succeed('Pubsub enabled');

    // Set storage limit
    await execAsync('ipfs config Datastore.StorageMax "100GB"');
    spinner.succeed('Storage limit configured');

    // Configure routing
    await execAsync('ipfs config --json Routing.Type "dht"');
    spinner.succeed('DHT routing enabled');

    spinner.succeed('IPFS remote access configuration completed');
    return true;
  } catch (error) {
    spinner.fail(`Failed to configure IPFS remote access: ${error.message}`);
    return false;
  }
}

async function verifyConfiguration() {
  const spinner = ora('Verifying IPFS configuration...').start();
  try {
    const { stdout } = await execAsync('ipfs config show');
    const config = JSON.parse(stdout);

    const checks = {
      api: config.Addresses.API.includes('0.0.0.0'),
      gateway: config.Addresses.Gateway.includes('0.0.0.0'),
      cors: config.API.HTTPHeaders['Access-Control-Allow-Origin']?.includes('*'),
      swarm: config.Addresses.Swarm.some(addr => addr.includes('0.0.0.0')),
      pubsub: config.Pubsub.Enabled === true
    };

    const failed = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([key]) => key);

    if (failed.length > 0) {
      throw new Error(`Configuration verification failed for: ${failed.join(', ')}`);
    }

    spinner.succeed('IPFS configuration verified successfully');
    return true;
  } catch (error) {
    spinner.fail(`Configuration verification failed: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('Starting IPFS remote access configuration...');
    
    // Check if IPFS is initialized
    try {
      await execAsync('ipfs config show');
    } catch {
      console.error('Error: IPFS is not initialized. Please run "npm run setup:ipfs" first.');
      process.exit(1);
    }

    // Configure remote access
    const configured = await configureRemoteAccess();
    if (!configured) {
      throw new Error('Failed to configure remote access');
    }

    // Verify configuration
    const verified = await verifyConfiguration();
    if (!verified) {
      throw new Error('Configuration verification failed');
    }

    console.log('\nIPFS remote access configuration completed successfully!');
    console.log('\nTo start IPFS with remote access:');
    console.log('1. Run "npm run start:ipfs"');
    console.log('2. Your IPFS node will be accessible at:');
    console.log('   - API: http://localhost:5001');
    console.log('   - Gateway: http://localhost:8080');
    console.log('   - Swarm: TCP 4001, WebSocket 8081');
  } catch (error) {
    console.error('Configuration failed:', error.message);
    process.exit(1);
  }
}

export { configureRemoteAccess, verifyConfiguration };

if (import.meta.url === new URL(import.meta.url).href) {
  main();
}
import { exec } from 'child_process';
import { promisify } from 'util';
import ora from 'ora';

const execAsync = promisify(exec);

async function checkIpfsInstalled() {
  try {
    const { stdout } = await execAsync('ipfs --version');
    console.log('IPFS version:', stdout.trim());
    return true;
  } catch {
    return false;
  }
}

async function initializeIpfs() {
  const spinner = ora('Initializing IPFS...').start();
  try {
    await execAsync('ipfs init');
    spinner.succeed('IPFS initialized successfully!');
    return true;
  } catch (error) {
    if (!error.message.includes('already')) {
      spinner.fail(`Failed to initialize IPFS: ${error.message}`);
      return false;
    }
    spinner.info('IPFS already initialized');
    return true;
  }
}

async function startIpfsDaemon() {
  const spinner = ora('Starting IPFS daemon...').start();
  try {
    try {
      await execAsync('ipfs swarm peers');
      spinner.info('IPFS daemon is already running');
      return true;
    } catch {
      const daemon = exec('ipfs daemon');
      
      return new Promise((resolve) => {
        daemon.stdout.on('data', (data) => {
          if (data.includes('Daemon is ready')) {
            spinner.succeed('IPFS daemon started successfully!');
            resolve(true);
          }
        });

        daemon.stderr.on('data', (data) => {
          console.error('IPFS daemon error:', data);
        });
      });
    }
  } catch (error) {
    spinner.fail(`Failed to start IPFS daemon: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    const installed = await checkIpfsInstalled();
    if (!installed) {
      console.error('IPFS not found. Please run npm run setup:ipfs first');
      process.exit(1);
    }

    const initialized = await initializeIpfs();
    if (!initialized) {
      throw new Error('Failed to initialize IPFS');
    }

    const daemonStarted = await startIpfsDaemon();
    if (!daemonStarted) {
      throw new Error('Failed to start IPFS daemon');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export functions for use in other modules
export {
  checkIpfsInstalled,
  initializeIpfs,
  startIpfsDaemon
};

// Run if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  main();
}
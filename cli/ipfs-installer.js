import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import * as tar from 'tar';
import extract from 'extract-zip';
import which from 'which';
import chalk from 'chalk';

const execAsync = promisify(exec);

// Use a specific version of IPFS for stability
const IPFS_VERSION = 'v0.22.0';
const IPFS_DOWNLOAD_BASE = `https://dist.ipfs.tech/kubo/${IPFS_VERSION}/kubo_${IPFS_VERSION}_`;
const INSTALL_PATHS = {
  win32: path.join(os.homedir(), 'AppData', 'Local', 'IPFS'),
  darwin: path.join(os.homedir(), '.local', 'bin'),
  linux: path.join(os.homedir(), '.local', 'bin')
};

const MAX_RETRIES = 5;
const TIMEOUT = 60000; // 60 seconds

async function retry(fn, retries = MAX_RETRIES, delay = 5000) {
  try {
    return await fn();
  } catch (error) {
    console.error('Error during attempt:', error.message);
    if (retries === 0) throw error;
    console.log(chalk.yellow(`Retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`));
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 1.5);
  }
}

async function checkIPFSInstalled() {
  try {
    const ipfsPath = await which('ipfs');
    try {
      const { stdout } = await execAsync('ipfs --version');
      console.log(chalk.green(`✓ IPFS is already installed at ${ipfsPath}`));
      console.log(chalk.green(`  Version: ${stdout.trim()}`));
      return true;
    } catch (error) {
      console.log(chalk.yellow('IPFS binary found but not executable. Will attempt reinstallation.'));
      return false;
    }
  } catch {
    return false;
  }
}

async function downloadAndInstall() {
  const platform = os.platform();
  const arch = os.arch() === 'x64' ? 'amd64' : os.arch();
  const downloadUrl = `${IPFS_DOWNLOAD_BASE}${platform === 'win32' ? 'windows' : platform}-${arch}.${platform === 'win32' ? 'zip' : 'tar.gz'}`;
  const tempDir = path.join(os.tmpdir(), 'ipfs-install');
  const installPath = INSTALL_PATHS[platform];

  try {
    await fs.mkdir(tempDir, { recursive: true });
    console.log(chalk.blue('Downloading IPFS...'));
    console.log(chalk.blue(`Download URL: ${downloadUrl}`));
    
    const downloadFile = async () => {
      const response = await axios.get(downloadUrl, {
        timeout: TIMEOUT,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'ipfs-installer',
          'Accept': 'application/octet-stream'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      return response.data;
    };

    const fileData = await retry(downloadFile);
    const isZip = platform === 'win32';
    const archivePath = path.join(tempDir, isZip ? 'ipfs.zip' : 'ipfs.tar.gz');
    await fs.writeFile(archivePath, fileData);

    console.log(chalk.blue('Extracting files...'));
    if (isZip) {
      await extract(archivePath, { dir: tempDir });
    } else {
      await tar.extract({
        file: archivePath,
        cwd: tempDir
      });
    }

    const binaryName = platform === 'win32' ? 'ipfs.exe' : 'ipfs';
    const sourcePath = path.join(tempDir, 'kubo', binaryName);
    const targetPath = path.join(installPath, binaryName);

    await fs.mkdir(installPath, { recursive: true });
    await fs.copyFile(sourcePath, targetPath);
    await fs.chmod(targetPath, 0o755);
    
    // Add to PATH for current session
    if (platform !== 'win32') {
      process.env.PATH = `${installPath}:${process.env.PATH}`;
      
      // Add to shell profile for future sessions
      const shellProfile = path.join(os.homedir(), '.bashrc');
      try {
        const profileContent = await fs.readFile(shellProfile, 'utf8').catch(() => '');
        if (!profileContent.includes(installPath)) {
          await fs.appendFile(shellProfile, `\nexport PATH="${installPath}:$PATH"\n`);
          console.log(chalk.blue(`Added ${installPath} to PATH in ~/.bashrc`));
        }
      } catch (error) {
        console.log(chalk.yellow(`Note: Please add ${installPath} to your PATH manually`));
      }
    }
    
    await fs.rm(tempDir, { recursive: true, force: true });

    const { stdout } = await execAsync('ipfs --version');
    console.log(chalk.green(`✓ IPFS ${stdout.trim()} installed successfully`));
    console.log(chalk.blue(`Installation path: ${targetPath}`));
    
    if (platform !== 'win32') {
      console.log(chalk.yellow('\nTo use IPFS in new terminal sessions, run:'));
      console.log(chalk.cyan(`source ~/.bashrc`));
      console.log(chalk.yellow('Or restart your terminal.'));
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red('Error during installation:'), error.message);
    throw error;
  }
}

async function main() {
  try {
    if (await checkIPFSInstalled()) {
      return;
    }

    console.log(chalk.blue('Installing IPFS...'));
    await downloadAndInstall();

    if (await checkIPFSInstalled()) {
      console.log(chalk.green('✓ IPFS installation verified successfully!'));
    } else {
      throw new Error('Installation verification failed');
    }
  } catch (error) {
    console.error(chalk.red('Installation failed:'), error);
    process.exit(1);
  }
}

main();
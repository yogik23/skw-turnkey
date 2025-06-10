import { ethers } from "ethers";
import chalk from "chalk";
import cron from "node-cron";
import { displayskw } from './skw/displayskw.js';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const network = {
  name: 'sepolia',
  chainId: 11155111,
  ensAddress: null
};
const provider = new ethers.JsonRpcProvider(RPC, network);

const privateKeys = fs.readFileSync(path.join(__dirname, "privatekey.txt"), "utf-8")
  .split("\n")
  .map(k => k.trim())
  .filter(k => k.length > 0);

const addressList = fs.readFileSync(path.join(__dirname, "address.txt"), "utf-8")
  .split("\n")
  .map(k => k.trim().toLowerCase())
  .filter(k => k.length > 0);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const logAccount = (msg) => console.log(chalk.hex('#A259FF')(`🟣 ${msg}`));
const logCache = (message) => console.log(chalk.hex('#FF8C00')(`🟡 ${message}`));
const logInfo = (msg) => console.log(chalk.hex('#48D1CC')(`🔵 ${msg}`));
const logSuccess = (msg) => console.log(chalk.hex('#00FF00')(`🟢 ${msg}`));
const logError = (msg) => console.log(chalk.hex('#FF6347')(`🔴 ${msg}`));

function generateRandomAmount(min = 0.00001, max = 0.00008) {
  return (Math.random() * (max - min) + min).toFixed(8);
}

function randomdelay(min = 5000, max = 15000) {
  return Math.floor(Math.random() * (max - min) + min);
}

async function sendEth(wallet, toAddress, amountEth, nonce = undefined) {
  try {
    const baseFeeData = await provider.getFeeData();
    const gasPrice = (baseFeeData.gasPrice ?? 1n) + (baseFeeData.gasPrice ?? 1n) / 10n;
    const gasLimit = 100000n;

    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amountEth),
      gasPrice,
      gasLimit,
      nonce,
    });

    logCache(`Mengirim ${amountEth} ETH ke ${toAddress}`);
    logInfo(`txHash:>> https://sepolia.etherscan.io/tx/${tx.hash}`);
    await tx.wait();
    logSuccess(`Transaksi Berhasil\n`);
  } catch (err) {
    logError(`TX Gagal: ${err?.message || err}\n`);
  }
}

async function batchtx(wallet) {
  const entries = addressList.map(addr => {
    const amount = generateRandomAmount(0.00001, 0.00008);
    return { address: addr, amount };
  });

  const baseNonce = await provider.getTransactionCount(wallet.address);
  let nonce = baseNonce;

  for (let { address, amount } of entries) {
    if (address === wallet.address.toLowerCase()) {
      logWarning(`Lewatkan address sendiri: ${address}`);
      continue;
    }

    await sendEth(wallet, address, amount, nonce);
    nonce++;
    await delay(randomdelay());
  }
}

async function startBot() {
  displayskw();
  console.clear();
  await delay(1000);
  for (const pk of privateKeys) {
    const wallet = new ethers.Wallet(pk, provider);
    const walletAddress = wallet.address.toLowerCase();

    logAccount(`Wallet: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    logAccount(`Balance: ${ethers.formatEther(balance)} ETH`);

    for (const adrs of addressList) {
      if (adrs === walletAddress) {
        continue;
      }

      const amountEth = generateRandomAmount(0.00001, 0.00008);
      const nonce = await provider.getTransactionCount(wallet.address);
      await sendEth(wallet, adrs, amountEth, nonce);
      await delay(randomdelay());
    }

    await batchtx(wallet);
    await delay(randomdelay());
  }
}

async function main() {
  cron.schedule('0 1 * * *', async () => { 
    await startBot();
    console.log();
    console.log(chalk.hex('#FF00FF')(`Cron AKTIF`));
    console.log(chalk.hex('#FF1493')('Jam 08:00 WIB Autobot Akan Run'));
  });

  await startBot();
  console.log();
  console.log(chalk.hex('#FF00FF')(`Cron AKTIF`));
  console.log(chalk.hex('#FF1493')('Jam 08:00 WIB Autobot Akan Run'));
}

main();

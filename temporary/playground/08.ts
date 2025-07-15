import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { fromBase64 } from "@cosmjs/encoding";
import fs from "fs";
import path from "path";
import "dotenv/config";

const {
  FIN_CONTRACT_ADDRESS = '',
  TEAM_RUJIRA_WALLET_PRIVATE_KEY = '',
  FIN_RPC_ENDPOINT = '',
  TEAM_RUJIRA_WALLET_PUBLIC_KEY_THOR = '',
  FIN_ORDER_SIDE = 'quote',
  FIN_ORDER_PRICE_FIXED = '0.000000000000000000',
} = process.env;

const CONTRACT_ADDRESS = FIN_CONTRACT_ADDRESS;
const PRIVATE_KEY_BASE64 = TEAM_RUJIRA_WALLET_PRIVATE_KEY;
const RPC_ENDPOINT = FIN_RPC_ENDPOINT;
const OWNER = TEAM_RUJIRA_WALLET_PUBLIC_KEY_THOR;
const SIDE: 'base' | 'quote' = FIN_ORDER_SIDE as 'base' | 'quote';
const PRICE_FIXED = FIN_ORDER_PRICE_FIXED;

function getLogFilePath() {
  const logsDir = path.resolve(__dirname, '../../../logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const now = new Date();
  return path.join(logsDir, `playground-08-${now.toISOString().replace(/[:.]/g, '-')}.json`);
}
const logFilePath = getLogFilePath();
function logger(msg: unknown) {
  const timestamp = new Date().toISOString();
  const text = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
  const logLine = `[${timestamp}] ${text}`;
  fs.appendFileSync(logFilePath, logLine + '\n');
  console.log(logLine);
}

async function main() {
  logger(`Using PRICE_FIXED: ${PRICE_FIXED}`);
  if (!CONTRACT_ADDRESS || !PRIVATE_KEY_BASE64 || !OWNER) {
    logger('❌ Please configure CONTRACT_ADDRESS, PRIVATE_KEY_BASE64, and OWNER');
    logger({ CONTRACT_ADDRESS, PRIVATE_KEY_BASE64: PRIVATE_KEY_BASE64 ? '[set]' : '[not set]', OWNER });
    process.exit(1);
  }

  logger('🔗 Connecting to RPC: ' + RPC_ENDPOINT);
  const wallet = await DirectSecp256k1Wallet.fromKey(fromBase64(PRIVATE_KEY_BASE64), 'thor');
  const client = await CosmWasmClient.connect(RPC_ENDPOINT);
  const signingClient = await SigningCosmWasmClient.connectWithSigner(
    RPC_ENDPOINT,
    wallet,
    { gasPrice: GasPrice.fromString('0.025rune') }
  );
  const [{ address }] = await wallet.getAccounts();
  logger('Wallet address: ' + address);

  logger(`Querying orders for user: ${OWNER}`);
  const orders = await client.queryContractSmart(CONTRACT_ADDRESS, {
    orders: { owner: OWNER, side: SIDE, limit: 10 }
  });
  logger('Orders found:');
  logger(orders);

  const orderToCancel = orders.orders?.find((o: any) => parseFloat(o.price.fixed) === parseFloat(PRICE_FIXED) && o.side === SIDE);
  if (!orderToCancel) {
    logger('❌ No order found to cancel with the provided parameters.');
    logger({ owner: OWNER, side: SIDE, price: PRICE_FIXED });
    return;
  }
  logger('Order to cancel:');
  logger(orderToCancel);

  const executeMsg = {
    order: [
      [
        [SIDE, { fixed: PRICE_FIXED }, '0'],
      ],
      null
    ]
  };
  logger('Sending cancellation transaction...');
  try {
    const result = await signingClient.execute(
      address,
      CONTRACT_ADDRESS,
      executeMsg,
      'auto'
    );
    logger('✅ Transaction sent! Hash: ' + result.transactionHash);
    const ordersAfter = await client.queryContractSmart(CONTRACT_ADDRESS, {
      orders: { owner: OWNER, side: SIDE, limit: 10 }
    });
    logger('Orders after cancellation:');
    logger(ordersAfter);
  } catch (err) {
    logger('❌ Error running playground:');
    logger(err);
    if (err instanceof Error) {
      logger('Error message: ' + err.message);
      logger('Error stack: ' + err.stack);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Error running playground:', err);
  process.exit(1);
}); 
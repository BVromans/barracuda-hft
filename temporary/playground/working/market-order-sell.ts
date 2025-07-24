import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import { fromBase64 } from '@cosmjs/encoding';

(async () => {
  const wallet = await DirectSecp256k1Wallet.fromKey(
    fromBase64(process.env.TEAM_RUJIRA_WALLET_PRIVATE_KEY!),
    'thor'
  );
  const client = await SigningCosmWasmClient.connectWithSigner(
    'https://thornode-mainnet-rpc.bryanlabs.net',
    wallet,
    { gasPrice: GasPrice.fromString('0.025rune') }
  );

  // Sell 0.05 RUJI at 0.8435 USDC per RUJI
  // 0.05 RUJI * 0.8435 USDC = 0.042175 USDC
  // 6 decimals for both tokens
  const rujiAmount = '50000'; // 0.05 RUJI (6 decimals)
  const usdcAmount = '42175';  // 0.042175 USDC (6 decimals)
  const minReturn = '42000';   // Allow for a small slippage (0.042 USDC)

  const result = await client.execute(
    process.env.TEAM_RUJIRA_WALLET_PUBLIC_KEY_THOR!,
    'thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a', // RUJI/USDC market contract
    {
      swap: {
        min_return: minReturn,
        to: process.env.TEAM_RUJIRA_WALLET_PUBLIC_KEY_THOR!
      }
    },
    'auto',
    undefined,
    [{ denom: 'x/ruji', amount: rujiAmount }]
  );

  console.log('Transaction hash:', result.transactionHash);
})(); 
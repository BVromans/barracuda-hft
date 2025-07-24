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

  // Buy 0.01 RUJI at 0.8694 USDC per RUJI
  // 0.01 RUJI * 0.8694 USDC = 0.008694 USDC
  // 6 decimals for both tokens
  const rujiAmount = '10000'; // 0.01 RUJI (6 decimals)
  const usdcAmount = '8694';  // 0.008694 USDC (6 decimals)
  const minReturn = '9000';   // Allow for a small slippage (0.00998 RUJI)

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
    [{ denom: 'eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', amount: usdcAmount }]
  );

  console.log('Transaction hash:', result.transactionHash);
})();

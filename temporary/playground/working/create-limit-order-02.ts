import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import { fromBase64 } from '@cosmjs/encoding';

(async () => {
  try {
    const wallet = await DirectSecp256k1Wallet.fromKey(
      fromBase64(process.env.TEAM_RUJIRA_WALLET_PRIVATE_KEY!),
      'thor'
    );
    const client = await SigningCosmWasmClient.connectWithSigner(
      'https://thornode-mainnet-rpc.bryanlabs.net',
      wallet,
      { gasPrice: GasPrice.fromString('0.02rune') }
    );

    const result = await client.execute(
      process.env.TEAM_RUJIRA_WALLET_PUBLIC_KEY_THOR!,
      'thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a',
      {
        order: [[['quote', { fixed: '0.010000000000000000' }, '5000000']], null]
      },
      'auto',
      undefined,
      [{ denom: 'eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', amount: '5000000' }]
    );

    console.log('Transaction hash:', result.transactionHash);
  } catch (error) {
    console.error('Error:', error);
  }
})(); 
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
    const sender = process.env.TEAM_RUJIRA_WALLET_PUBLIC_KEY_THOR!;

    const contract = 'thor1txmrchsrzycmzvlwsjl20q9zkdsp0nywctefuceepf02phpudvxsxtzmty'; // NAMI/USDC
    const msg = {
      order: [
        [
          ["quote", { fixed: "0.219169" }, "0"]
        ],
        null
      ]
    };

    const result = await client.execute(sender, contract, msg, 'auto');
    console.log('Transaction hash:', result.transactionHash);
  } catch (error) {
    console.error('Error:', error);
  }
})(); 
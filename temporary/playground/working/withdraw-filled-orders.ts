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

    const contract = 'thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a'; // NAMI/USDC
    // const msg = {
    //   order: [
    //     [
		// 			// TODO check if the fixed is the price of the order, the amount or the amount you want to retrieve.
    //       ["quote", { fixed: "0.85" }, "0"]
    //     ],
    //     null
    //   ]
    // };

		 // This is to widthdraw just one order
		const msg = {
			"order": [
				[
					[
						"base",
						{
							"fixed": "0.850000000000"
						},
						null
					]
				],
				null
			]
		}

    const result = await client.execute(sender, contract, msg, 'auto');
    console.log('Transaction hash:', result.transactionHash);
  } catch (error) {
    console.error('Error:', error);
  }
})();

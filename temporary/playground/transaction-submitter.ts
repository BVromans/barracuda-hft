import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import { fromBase64 } from '@cosmjs/encoding';

const NETWORK_CONFIG = {
  rpc: 'https://thornode-mainnet-rpc.bryanlabs.net',
  gasPrice: GasPrice.fromString('0.02rune'),
  contractAddress: 'thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a'
};

interface OrderParams {
  side: 'buy' | 'sell';
  baseAsset: string;
  quoteAsset: string;
  amount: string;
  price: string;
  owner: string;
}

export class TransactionSubmitter {
  static async submitOrder(privateKey: string, params: OrderParams): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const wallet = await DirectSecp256k1Wallet.fromKey(fromBase64(privateKey), 'thor');
      const client = await SigningCosmWasmClient.connectWithSigner(NETWORK_CONFIG.rpc, wallet, { gasPrice: NETWORK_CONFIG.gasPrice });
      
      const side = params.side === 'buy' ? 'quote' : 'base';
      const denom = params.side === 'buy' ? params.quoteAsset : params.baseAsset;
      
      const result = await client.execute(
        params.owner,
        NETWORK_CONFIG.contractAddress,
        {
          order: [[[side, { fixed: parseFloat(params.price).toFixed(18) }, params.amount]], null]
        },
        'auto',
        undefined,
        [{ denom, amount: params.amount }]
      );

      console.log('✅ Transaction submitted:', result.transactionHash);
      return { success: true, txHash: result.transactionHash };

    } catch (error) {
      console.error('❌ Failed to submit order:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

async function demonstrateOrder() {
  try {
    const privateKey = process.env.TEAM_RUJIRA_WALLET_PRIVATE_KEY;
    const thorAddress = process.env.TEAM_RUJIRA_WALLET_PUBLIC_KEY_THOR;
    
    if (!privateKey || !thorAddress) throw new Error('Environment variables not found');

    const result = await TransactionSubmitter.submitOrder(privateKey, {
      side: 'buy',
      baseAsset: 'x/ruji',
      quoteAsset: 'eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      amount: '5000000',
      price: '0.01',
      owner: thorAddress
    });

    console.log('Order result:', result);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  demonstrateOrder().catch(console.error);
} 
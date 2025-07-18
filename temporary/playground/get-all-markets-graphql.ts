// Uses the built-in fetch API in Node.js v18+. If you are on an older Node.js version, install node-fetch and uncomment the import below.
// import fetch from 'node-fetch';

const MARKETS_GRAPHQL_ENDPOINT = 'https://api.rujira.network/api/graphiql';
const SHOW_ONLY_LIVE_MARKETS = true; // Set to false to show all markets (LIVE + PREVIEW)

const MARKETS_QUERY = `
  query {
    rujira {
      fin {
        id
        address
        tick
        feeTaker
        feeMaker
        feeAddress
        deploymentStatus

        # Asset Base
        assetBase {
          id
          asset
          type
          chain
          metadata {
            symbol
            name
            decimals
            description
            display
          }
          price {
            current
            changeDay
            mcap
            timestamp
          }
          variants {
            layer1 { asset }
            secured { asset }
            native { denom }
          }
        }

        # Asset Quote
        assetQuote {
          id
          asset
          type
          chain
          metadata {
            symbol
            name
            decimals
            description
            display
          }
          price {
            current
            changeDay
            mcap
            timestamp
          }
          variants {
            layer1 { asset }
            secured { asset }
            native { denom }
          }
        }

        # Oracles
        oracleBase {
          id
          asset {
            asset
            metadata { symbol name decimals }
          }
          price
        }
        oracleQuote {
          id
          asset {
            asset
            metadata { symbol name decimals }
          }
          price
        }

        
      }
    }
  }
`;

type Market = {
  id: string;
  address: string;
  baseAsset: {
    asset: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  quoteAsset: {
    asset: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  deploymentStatus: string;
  tick?: number;
  pairName: string;
  raw: any;
};

async function main() {
  console.log('🚀 Fetching all markets from Rujira GraphQL API...');
  const response = await fetch(MARKETS_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: MARKETS_QUERY })
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const json: any = await response.json();
  const { data, errors } = json;
  if (errors) {
    console.error('GraphQL errors:', errors);
    return;
  }

  const rawPairs = data?.rujira?.fin || [];
  let markets: Market[] = rawPairs.map((pair: any) => ({
    id: pair.id,
    address: pair.address,
    baseAsset: {
      asset: pair.assetBase.asset,
      symbol: pair.assetBase.metadata?.symbol || pair.assetBase.asset,
      name: pair.assetBase.metadata?.name || pair.assetBase.metadata?.symbol || pair.assetBase.asset,
      decimals: pair.assetBase.metadata?.decimals ?? 8
    },
    quoteAsset: {
      asset: pair.assetQuote.asset,
      symbol: pair.assetQuote.metadata?.symbol || pair.assetQuote.asset,
      name: pair.assetQuote.metadata?.name || pair.assetQuote.metadata?.symbol || pair.assetQuote.asset,
      decimals: pair.assetQuote.metadata?.decimals ?? 8
    },
    deploymentStatus: pair.deploymentStatus,
    tick: pair.tick,
    pairName: `${pair.assetBase.metadata?.symbol || pair.assetBase.asset}/${pair.assetQuote.metadata?.symbol || pair.assetQuote.asset}`,
    raw: pair
  }));

  // Filter to show only LIVE markets if enabled
  if (SHOW_ONLY_LIVE_MARKETS) {
    const originalCount = markets.length;
    markets = markets.filter(market => market.deploymentStatus === 'LIVE');
    console.log(`\n🔍 Filtered to show only LIVE markets (${markets.length}/${originalCount} markets)`);
  }

  console.log(`\n✅ Found ${markets.length} markets from Rujira GraphQL API.`);
  
  // Group by deployment status
  const byStatus = markets.reduce((acc, market) => {
    const status = market.deploymentStatus;
    if (!acc[status]) acc[status] = [];
    acc[status].push(market);
    return acc;
  }, {} as Record<string, Market[]>);

  for (const [status, statusMarkets] of Object.entries(byStatus)) {
    console.log(`\n📊 ${status} Markets (${statusMarkets.length}):`);
    for (const market of statusMarkets) {
      console.log(`  - ${market.pairName} (${market.address})`);
      console.log(`    Base: ${market.baseAsset.symbol} (${market.baseAsset.asset})`);
      console.log(`    Quote: ${market.quoteAsset.symbol} (${market.quoteAsset.asset})`);
      if (market.tick) console.log(`    Tick: ${market.tick}`);
      console.log('');
    }
  }

  console.log('\nFull market list:', markets);
}

main().catch(console.error); 
// Uses the built-in fetch API in Node.js v18+. If you are on an older Node.js version, install node-fetch and uncomment the import below.
// import fetch from 'node-fetch';

const GRAPHQL_ENDPOINT = 'https://api.rujira.network/api/graphiql';

const QUERY = `
  query {
    rujira {
      fin {
        id
        address
        assetBase {
          asset
          metadata {
            symbol
            name
            decimals
          }
        }
        assetQuote {
          asset
          metadata {
            symbol
            name
            decimals
          }
        }
        deploymentStatus
      }
    }
  }
`;

async function getAllTokens() {
  console.log('🚀 Fetching all tokens and markets from Rujira GraphQL API...');
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY })
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

  const pairs = data?.rujira?.fin || [];
  const tokenMap = new Map();

  for (const pair of pairs) {
    for (const asset of [pair.assetBase, pair.assetQuote]) {
      if (!tokenMap.has(asset.asset)) {
        tokenMap.set(asset.asset, {
          address: asset.asset,
          symbol: asset.metadata?.symbol || asset.asset,
          name: asset.metadata?.name || asset.metadata?.symbol || asset.asset,
          decimals: asset.metadata?.decimals ?? 8,
          raw: asset
        });
      }
    }
  }

  const tokens = Array.from(tokenMap.values());
  console.log(`\n✅ Found ${tokens.length} unique tokens across all FIN markets.`);
  for (const token of tokens) {
    console.log(`- ${token.symbol} (${token.address}): name=${token.name}, decimals=${token.decimals}`);
  }
  console.log('\nFull token list:', tokens);
}

getAllTokens().catch(console.error);

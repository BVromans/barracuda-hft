// Fetches OHLCV candle data for a FIN market using GraphQL
// Usage: bun run temporary/playground/get-candles-graphql.ts

// --- Use a contract from working-fin-contracts.ts ---
const WORKING_FIN_CONTRACTS = {
  "LQDY/BTC": {
    address: "thor1t76lvqjq7avt6kxnul4pt0zaq6y06fhkw29wxs5rm4kt873s6y9sdp8rxf",
    pairName: "LQDY/BTC"
  },
  "LQDY/USDC": {
    address: "thor1ax94w4rldvdgc4xgsfwgve7g7xfyxhvuvquvx57vtmr6y4alev0qw3mlvr",
    pairName: "LQDY/USDC"
  },
  "NAMI/USDC": {
    address: "thor1txmrchsrzycmzvlwsjl20q9zkdsp0nywctefuceepf02phpudvxsxtzmty",
    pairName: "NAMI/USDC"
  },
  "RUJI/USDC": {
    address: "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a",
    pairName: "RUJI/USDC"
  },
  "TCY/RUNE": {
    address: "thor12ds7fxj5g47jwzfzvzzhzxxd3cp6v55flgwxva0803r8k5mzm44skth6wa",
    pairName: "TCY/RUNE"
  }
};

// --- Select which contract to use here ---
const SELECTED_CONTRACT_KEY = "RUJI/USDC"; // Change to any key above
const SELECTED_CONTRACT = WORKING_FIN_CONTRACTS[SELECTED_CONTRACT_KEY];

const CANDLES_GRAPHQL_ENDPOINT = 'https://api.rujira.network/api/graphiql';
const CANDLE_RESOLUTION = '60'; // 1 hour
const CANDLE_COUNT = 20; // Number of candles to fetch

function toBase64(str: string) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

function isoNowMinus(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function fetchCandles(pairId: string, after: string, before: string, resolution: string, count: number) {
  const CANDLES_QUERY = `
    query GetCandles($pair: ID!, $after: String!, $before: String!, $resolution: String!, $last: Int) {
      node(id: $pair) {
        ... on FinPair {
          address
          candles(after: $after, before: $before, resolution: $resolution, last: $last) {
            edges {
              node {
                open
                close
                high
                low
                volume
                bin
              }
            }
          }
        }
      }
    }
  `;
  const response = await fetch(CANDLES_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: CANDLES_QUERY,
      variables: { pair: pairId, after, before, resolution, last: count }
    })
  });
  if (!response.ok) throw new Error(`Candles query failed: ${response.status}`);
  const json: any = await response.json();
  return json?.data?.node?.candles?.edges?.map((e: any) => e.node) || [];
}

(async function main() {
  const pairName = SELECTED_CONTRACT.pairName;
  const contractAddress = SELECTED_CONTRACT.address;
  const pairId = toBase64(`FinPair:${contractAddress}`);
  console.log(`\n📈 Fetching candles for market: ${pairName} (${contractAddress})`);

  const before = new Date().toISOString();
  const after = isoNowMinus(24); // last 24 hours

  const candles = await fetchCandles(pairId, after, before, CANDLE_RESOLUTION, CANDLE_COUNT);
  if (!candles.length) {
    console.log('No candle data found.');
    return;
  }

  console.log(`\n🕯️ Last ${candles.length} candles (resolution: ${CANDLE_RESOLUTION}min):`);
  console.log('Time                 |   Open     |   High     |   Low      |   Close    |   Volume');
  console.log('---------------------|------------|------------|------------|------------|------------');
  for (const c of candles) {
    const time = new Date(c.bin).toISOString().replace('T', ' ').slice(0, 19);
    const open = c.open.toString().padStart(10, ' ');
    const high = c.high.toString().padStart(10, ' ');
    const low = c.low.toString().padStart(10, ' ');
    const close = c.close.toString().padStart(10, ' ');
    const volume = c.volume.toString().padStart(10, ' ');
    console.log(`${time} |${open} |${high} |${low} |${close} |${volume}`);
  }
})(); 
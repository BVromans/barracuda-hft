import { CosmWasmClient, JsonObject, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { fromBase64 } from "@cosmjs/encoding";
import { GasPrice } from '@cosmjs/stargate';

let publicClient: CosmWasmClient;
let privateClient: SigningCosmWasmClient;

(async () => {
  const rpcEndpoint = 'https://thornode-mainnet-rpc.bryanlabs.net';
  const gasPrice = GasPrice.fromString('0.025rune');

  publicClient = await SigningCosmWasmClient.connect(
    rpcEndpoint
  );

  const wallet = await DirectSecp256k1Wallet.fromKey(
    fromBase64(process.env.TEAM_RUJIRA_WALLET_PRIVATE_KEY!),
    'thor'
  );

  privateClient = await SigningCosmWasmClient.connectWithSigner(
    rpcEndpoint,
    wallet,
    { gasPrice }
  );

  const contractsByCodeId = await getContractsByCodeId();
  // const contractsByCreator = await getContractsByCreator();

  for (const contract of contractsByCodeId) {
    // await getContract(contract);
    // await getContractConfig(contract);
		await getOrders(contract, (await wallet.getAccounts())[0].address);
  }
})();

async function getContractsByCodeId() {
    const contracts = await publicClient.getContracts(4); // 4 is the code id for the contracts
    console.log('\ngetContractsByCodeId');
    console.log(JSON.stringify(contracts, null, 2));
    console.log('--------------------------------\n');
    return contracts;
}

async function getContractsByCreator() {
    const contracts = await publicClient.getContractsByCreator('thor1e0lmk5juawc46jwjwd0xfz587njej7ay5fh6cd');
    console.log('\ngetContractsByCreator');
    console.log(JSON.stringify(contracts, null, 2));
    console.log('--------------------------------\n');
    return contracts;
}

async function getContract(address: string) {
    const contract = await publicClient.getContract(address);
    console.log('\ngetContract', address);
    console.log(JSON.stringify(contract, null, 2));
    console.log('--------------------------------\n');
    return contract;
}

async function publicQueryContract(address: string, query: JsonObject) {
    const result = await publicClient.queryContractSmart(address, query);
    console.log('\npublicQueryContract', address, query);
    console.log(JSON.stringify(result, null, 2));
    console.log('--------------------------------\n');
    return result;
}

async function privateQueryContract(address: string, query: JsonObject) {
    const result = await privateClient.queryContractSmart(address, query);
    console.log('\nprivateQueryContract', address, query);
    console.log(JSON.stringify(result, null, 2));
    console.log('--------------------------------\n');
    return result;
}

async function getContractConfig(address: string) {
  return publicQueryContract(address, {
    config: {}
  });
}

async function getDenom(address: string) {
  const result = await publicQueryContract(address, {
    denom: {}
  });
  console.log('\ngetDenom', address);
  console.log(JSON.stringify(result, null, 2));
  console.log('--------------------------------\n');
  return result;
}

async function getOrders(marketAddress: string, walletAddress: string) {
  const result = await privateClient.queryContractSmart(marketAddress, {
    orders: {
      owner: walletAddress,
      limit: 100
    }
  });
  console.log('\ngetOrders', marketAddress);
  console.log(JSON.stringify(result, null, 2));
  console.log('--------------------------------\n');
  return result;
}

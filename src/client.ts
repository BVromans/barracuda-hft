import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { ExecuteMsg, QueryMsg } from "./types";
import {CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";


export class RujiraClient {
  private constructor(
    public readonly client: CosmWasmClient,
    public readonly wallet: DirectSecp256k1HdWallet,
    public readonly contractAddress: string,
    public readonly rpcEndpoint: string
  ) {}

  static async connect(
    rpcEndpoint: string,
    mnemonic: string,
    contractAddress: string
  ): Promise<RujiraClient> {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: "sthor",
    });
    const client = await CosmWasmClient.connect(rpcEndpoint);
    return new RujiraClient(client, wallet, contractAddress, rpcEndpoint);
  }

  async query<T>(queryMsg: QueryMsg): Promise<T> {
    return this.client.queryContractSmart(this.contractAddress, queryMsg);
  }

  async execute(
    executeMsg: ExecuteMsg,
    funds?: { denom: string; amount: string }[]
  ) {
    const [{ address }] = await this.wallet.getAccounts();
    const gasPrice = GasPrice.fromString("0.025uatom");
    const signingClient = await SigningCosmWasmClient.connectWithSigner(
      this.rpcEndpoint,
      this.wallet,
      { gasPrice }
    );

    return signingClient.execute(
      address,
      this.contractAddress,
      executeMsg,
      "auto",
      undefined,
      funds
    );
  }
}
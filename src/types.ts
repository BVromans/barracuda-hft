export interface InstantiateMsg {
  denoms: {
    bid: string;
    ask: string;
  };
  market_maker?: string;
  oracles?: string[];
  tick: { exponent: number };
  fee_taker: string;
  fee_maker: string;
  fee_address: string;
}

export interface ExecuteMsg {
  swap?: {
    min_return?: string;
    to?: string;
    callback?: any;
  };
  order?: [Array<[string, any, string]>, any];
  arb?: {
    then?: any;
  };
  do_swap?: [string, any];
}

export interface QueryMsg {
  config?: {};
  order?: [string, string, any];
  orders?: {
    owner: string;
    side?: string;
    offset?: number;
    limit?: number;
  };
  book?: {
    limit?: number;
    offset?: number;
  };
  simulate?: {
    denom: string;
    amount: string;
  };
  strategy?: {
    denom: string;
    amount: string;
  };
  quote?: {
    denom: string;
    amount: string;
    offer_denom: string;
    offer_amount: string;
    ask_denom: string;
    ask_amount: string;
  };
}
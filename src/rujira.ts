export class Rujira {
	private readonly fin: Fin;

	constructor() {
		this.fin = undefined as unknown as Fin;
	}
}

export interface FinGetTokenRequest {}

export interface FinGetTokenResponse {}

export interface FinGetTokensRequest {}

export interface FinGetTokensResponse {}

export interface FinGetMarketRequest {}

export interface FinGetMarketResponse {}

export interface FinGetOrderBookRequest {}

export interface FinGetOrderBookResponse {}

export interface FinGetTickerRequest {}

export interface FinGetTickerResponse {}

export interface FinGetBalancesRequest {}

export interface FinGetBalancesResponse {}

export interface FinGetOrderRequest {}

export interface FinGetOrderResponse {}

export interface FinGetOrdersRequest {}

export interface FinGetOrdersResponse {}

export interface FinCreateOrderRequest {}

export interface FinCreateOrderResponse {}

export interface FinCreateOrdersRequest {}

export interface FinCreateOrdersResponse {}

export interface FinCancelOrderRequest {}

export interface FinCancelOrderResponse {}

export interface FinCancelOrdersRequest {}

export interface FinCancelOrdersResponse {}

export interface FinWithdrawRequest {}

export interface FinWithdrawResponse {}

export interface FinWithdrawsRequest {}

export interface FinWithdrawsResponse {}



export class Fin {

	async getToken(request: FinGetTokenRequest): Promise<FinGetTokenResponse> {
		throw new Error("Not implemented");
	}

	async getTokens(request: FinGetTokensRequest): Promise<FinGetTokensResponse> {
		throw new Error("Not implemented");
	}

	async getMarket(request: FinGetMarketRequest): Promise<FinGetMarketResponse> {
		throw new Error("Not implemented");
	}

	async getOrderBook(request: FinGetOrderBookRequest): Promise<FinGetOrderBookResponse> {
		throw new Error("Not implemented");
	}

	async getTicker(request: FinGetTickerRequest): Promise<FinGetTickerResponse> {
		throw new Error("Not implemented");
	}

	async getBalances(request: FinGetBalancesRequest): Promise<FinGetBalancesResponse> {
		throw new Error("Not implemented");
	}

	async getOrder(request: FinGetOrderRequest): Promise<FinGetOrderResponse> {
		throw new Error("Not implemented");
	}

	async getOrders(request: FinGetOrdersRequest): Promise<FinGetOrdersResponse> {
		throw new Error("Not implemented");
	}

	async createOrder(request: FinCreateOrderRequest): Promise<FinCreateOrderResponse> {
		throw new Error("Not implemented");
	}

	async createOrders(request: FinCreateOrdersRequest): Promise<FinCreateOrdersResponse> {
		throw new Error("Not implemented");
	}

	async cancelOrder(request: FinCancelOrderRequest): Promise<FinCancelOrderResponse> {
		throw new Error("Not implemented");
	}

	async cancelOrders(request: FinCancelOrdersRequest): Promise<FinCancelOrdersResponse> {
		throw new Error("Not implemented");
	}

	async withdrawFromMarket(request: FinWithdrawRequest): Promise<FinWithdrawResponse> {
		throw new Error("Not implemented");
	}

	async withdrawFromMarkets(request: FinWithdrawsRequest): Promise<FinWithdrawsResponse> {
		throw new Error("Not implemented");
	}
}

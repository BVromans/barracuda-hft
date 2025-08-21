import "./bootstrap";
import { properties } from "../../src/properties";
import { Rujira } from "../../src/rujira";
import { DECIMAL_100, OrderSide, RujiraConstructorOptions, RujiraInitializeOptions, WalletAddress, WalletMnemonic } from "../../src/types";
import { dump } from "../../src/utils";
import Decimal from "decimal.js";
import { Coin } from "@cosmjs/proto-signing";

(async function run() {
	const walletAddress = properties.getAs<WalletAddress>('rujira.wallet.publicKeys.thor');

	const rujira = new Rujira({
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
	} as RujiraConstructorOptions);

	await rujira.initialize({} as RujiraInitializeOptions);

	console.log('\n--------------------------------------------------------------------------------\n');

	const ownerAddress = walletAddress;
	const marketSymbol = 'THOR-RUJI/ETH-USDC';
	const market = await rujira.fin.getMarket({ symbol: marketSymbol});
	const baseToken = market.tokens.base;
	const quoteToken = market.tokens.quote;
	const nativeToken = rujira.fin.nativeToken;
	const usdToken = rujira.fin.usdToken;
	const orderBook = await rujira.fin.getOrderBook({ market });
	const ticker = await rujira.fin.getTicker({ market });
	const contractAddress = market.address;

	const slippagePercentage = Decimal('2.5'); // 1 means 1%

	const orderSide = OrderSide.BUY;

	let message: any;
	let funds: Coin[] | undefined;

	if (orderSide === OrderSide.BUY) {
		const amount = Decimal('0.1'); // USDC

		const outputToken = baseToken;
		const price = outputToken === baseToken ? ticker.middlePrice.baseToQuote! : ticker.middlePrice.quoteToBase!;
		const outputTokenAmount = amount.mul(price).mul(DECIMAL_100.minus(slippagePercentage).div(DECIMAL_100));
		const outputTokenAmountString = outputTokenAmount.mul(10 ** outputToken.decimals).toDecimalPlaces(0).toFixed();
		message = {
			swap: {
				min_return: outputTokenAmountString,
				to: ownerAddress
			}
		};

		const inputToken = quoteToken;
		const inputTokenAmount = amount;
		const inputTokenAmountString = inputTokenAmount.mul(10 ** inputToken.decimals).toDecimalPlaces(0).toFixed();
		funds = [
			{
				denom: inputToken.address,
				amount: inputTokenAmountString
			}
		];
	} else if (orderSide === OrderSide.SELL) {
		const amount = Decimal('0.1'); // RUJI

		const outputToken = quoteToken;
		const price = outputToken === baseToken ? ticker.middlePrice.baseToQuote! : ticker.middlePrice.quoteToBase!;
		const outputTokenAmount = amount.mul(price).mul(DECIMAL_100.minus(slippagePercentage).div(DECIMAL_100));
		const outputTokenAmountString = outputTokenAmount.mul(10 ** outputToken.decimals).toDecimalPlaces(0).toFixed();
		message = {
			swap: {
				min_return: outputTokenAmountString,
				to: ownerAddress
			}
		};

		const inputToken = baseToken;
		const inputTokenAmount = amount;
		const inputTokenAmountString = inputTokenAmount.mul(10 ** inputToken.decimals).toDecimalPlaces(0).toFixed();
		funds = [
			{
				denom: inputToken.address,
				amount: inputTokenAmountString
			}
		];
	} else {
		throw new Error('Invalid order side');
	}

	// @ts-ignore
	const response = await rujira.fin.cosmClient.execute(
		ownerAddress,
		contractAddress,
		message,
		'auto',
		undefined,
		funds
	);

	console.log(dump(response));
})();

import Decimal from "decimal.js";
import { List, Map } from "immutable";
import { loggedClass } from "../annotations";
import { logger } from "../logger";
import { properties } from "../properties";
import { Rujira } from "../rujira";
import {
  Balances,
  Candle,
  CandleInterval,
  CandleTimestamp,
  DECIMAL_0,
  DECIMAL_100,
  DECIMAL_NaN,
  FinPlaceOrderRequest,
  FinReplaceOrderRequest,
  Market,
  MarketSymbol,
  MList,
  MMap,
  Order,
  OrderId,
  OrderStatus,
  OrderType,
  RujiraConstructorOptions,
  StrategyStatus,
  TokenSymbol,
  WalletMnemonic,
  WalletPrivateKey,
} from "../types";
import { database } from "../database";
import { runAndRepeat, sleep, dump } from "../utils";
import { BaseStrategy, Proposal } from "./base_strategy";

/**
 * ✅ Pure market making strategy (async DB compatible)
 */
@loggedClass({
  enabled: true,
  logger: logger,
  allowedMethods: [
    "initialize",
    "run",
    "stop",
    "createProposal",
    "applyProposal",
    "updateOrdersDatabaseFromProposal",
    "startRepeatingTasks",
    "stopRepeatingTasks",
    "updateBalances",
    "updateOrders",
    "updateSummary",
    "cancelAllOrdersIfConfigured",
    "withdrawAllFilledOrdersIfConfigured",
    "updateTokens",
    "updateMarkets",
    "updateOrderBook",
    "updateIndicators",
    "monitorProfitAndLoss",
  ],
  includeStaticMethods: true,
  logStart: true,
  logEnd: true,
  logExecutionTime: true,
})
export abstract class BasePureMarketMakingStrategy implements BaseStrategy {
  public status: StrategyStatus;
  protected readonly rujira: Rujira;
  protected readonly state: Map<string, any> = MMap<string, any>({}, ".");

  constructor(options: { walletMnemonic?: WalletMnemonic; walletPrivateKey?: WalletPrivateKey }) {
    this.rujira = new Rujira({
      walletMnemonic:
        options.walletMnemonic ?? properties.getAs<WalletMnemonic | undefined>("rujira.wallet.mnemonic"),
      walletPrivateKey:
        options.walletPrivateKey ?? properties.getAs<WalletPrivateKey | undefined>("rujira.wallet.privateKey"),
    } as RujiraConstructorOptions);

    this.status = StrategyStatus.CREATED;
  }

  // === Initialization ===
  async initialize(_options: {}) {
    try {
      logger.info("Initializing strategy...");
      this.status = StrategyStatus.INITIALIZING;

      await this.rujira.initialize({});

      const tickInterval = Number(properties.getAs<number>("strategy.pure_market_making.common.tickInterval"));
      this.state.set("tickInterval", tickInterval);

      const market = await this.rujira.fin.getMarket({
        symbol: properties.getAs<MarketSymbol>("strategy.pure_market_making.common.market"),
      });
      this.state.set("market", market);

      await this.loadOrCreateSummaryFromDatabase({});
      this.state.set("summary.market.symbol", market.symbol);

      const candles = await this.rujira.fin.getCandles({
        market,
        after: new Date(Date.now() - 4 * 60 * 60 * 1000),
        before: new Date(),
        interval: CandleInterval.ONE_MINUTE,
      });
      this.state.set("candles", candles);

      await this.cancelAllOrdersIfConfigured({});
      await this.withdrawAllFilledOrdersIfConfigured({});

      this.state.set("tasks", MMap<string, NodeJS.Timeout>());
      await this.startRepeatingTasks({});
      await this.updateBalances({});
      await this.updateSummary({});

      if (![StrategyStatus.STOP_REQUESTED, StrategyStatus.STOPPING, StrategyStatus.STOPPED].includes(this.status)) {
        this.status = StrategyStatus.IDLE;
      }

      logger.info("Strategy initialized successfully.");
    } catch (e) {
      logger.error("Strategy failed to initialize.");
      throw e;
    }
  }

  // === Run loop ===
  async run(_options: {}) {
    while (true) {
      try {
        if (this.status !== StrategyStatus.IDLE) return;

        logger.info("Initiating new cycle...");
        this.status = StrategyStatus.RUNNING;

        await this.updateOrders({});
        await this.updateBalances({});
        await this.createProposal({});
        await this.applyProposal({});
        await this.updateBalances({});
        await this.updateSummary({});

        logger.info("Cycle completed successfully.");
      } catch (e) {
        logger.error("Cycle failed.");
        logger.ignoreException(e);
      } finally {
        if (this.status === StrategyStatus.RUNNING) {
          const tickInterval = this.state.getOrThrow("tickInterval");
          logger.info(`Waiting ${Decimal(tickInterval).div(1000).toFixed(2)}s before next cycle...`);
          await sleep(tickInterval);
          if (![StrategyStatus.STOP_REQUESTED, StrategyStatus.STOPPING, StrategyStatus.STOPPED].includes(this.status)) {
            this.status = StrategyStatus.IDLE;
          }
        }
      }
    }
  }

  // === Stop ===
  async stop(_options: {}) {
    try {
      this.status = StrategyStatus.STOPPING;
      await this.stopRepeatingTasks({});
      await this.cancelAllOrdersIfConfigured({});
      await this.withdrawAllFilledOrdersIfConfigured({});
    } finally {
      this.status = StrategyStatus.STOPPED;
    }
  }

  // === Lifecycle / Utility Stubs ===
  protected async startRepeatingTasks(_options: {}): Promise<void> {}
  protected async stopRepeatingTasks(_options: {}): Promise<void> {}
  protected async updateOrders(_options: {}): Promise<void> {}
  protected async updateBalances(_options: {}): Promise<void> {}
  protected async updateSummary(_options: {}): Promise<void> {}
  protected async cancelAllOrdersIfConfigured(_options: {}): Promise<void> {}
  protected async withdrawAllFilledOrdersIfConfigured(_options: {}): Promise<void> {}

  // === Logging helper ===
  protected convertProposalToJson(proposal: Proposal): any {
    const toPlain = (val: any): any => {
      if (val && typeof (val as any).toJS === "function") return toPlain((val as any).toJS());
      if ((Decimal as any).isDecimal?.(val)) return (val as Decimal).toString();
      if (Array.isArray(val)) return val.map(toPlain);
      if (val && typeof val === "object") {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) out[k] = toPlain(v);
        return out;
      }
      return val;
    };

    const asArray = (listLike: any): any[] => {
      if (!listLike) return [];
      if (typeof listLike.toArray === "function") return listLike.toArray();
      if (Array.isArray(listLike)) return listLike;
      return [listLike];
    };

    return {
      place: asArray(proposal.place).map(toPlain),
      replace: asArray(proposal.replace).map(toPlain),
      cancel: asArray(proposal.cancel).map(toPlain),
      withdraw: asArray(proposal.withdraw).map(toPlain),
    };
  }

  // === JSON helpers ===
  protected convertBalancesToJson(balances: Balances): any {
    const toPlain = (val: any): any => {
      if ((Decimal as any).isDecimal?.(val)) return (val as Decimal).toString();
      if (Array.isArray(val)) return val.map(toPlain);
      if (val && typeof val === "object") {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) out[k] = toPlain(v);
        return out;
      }
      return val;
    };
    return toPlain(balances);
  }

  protected convertOrdersToJson(orders: Map<OrderId, Order>): any[] {
    if (!orders) return [];
    return orders
      .valueSeq()
      .toArray()
      .map((order) => ({
        id: this.rujira.fin.getOrderId({ order }),
        side: order.side,
        type: order.type,
        price: order.price?.toString?.() ?? null,
        amount: order.amount?.toString?.() ?? null,
        status: order.status,
        filledPercentage: order.filledPercentage?.toString?.() ?? "0",
      }));
  }

  protected async createProposal(_options: {}) {
    throw new Error("Not implemented");
  }

  // === Proposal execution ===
  private async applyProposal(_options: {}) {
    const market: Market = this.state.getOrThrow("market");
    const proposal: Proposal = this.state.getOrThrow("proposal");

    if (
      !proposal ||
      [proposal.place, proposal.replace, proposal.cancel, proposal.withdraw].every(
        (p) => !p || (Array.isArray(p) ? p.length === 0 : (p as any).isEmpty?.())
      )
    ) {
      logger.debug("No proposal to apply.");
      return;
    }

    const result = await this.rujira.fin.persistOrders({
      ownerAddress: this.rujira.walletAddress,
      market,
      orders: proposal,
    });

    await this.updateOrdersDatabaseFromProposal({});
    logger.debug(`Proposal applied successfully. Transactions:\n${result.transactions.keySeq().toJS().join("\n")}`);
  }

  // === Summary persistence ===
  private async loadOrCreateSummaryFromDatabase(_options: {}) {
    const existing = await database.select_single(`SELECT data FROM summary LIMIT 1`);
    if (existing) {
      const data = (existing?.get("data") as string) ?? "";
      const parsed = JSON.parse(data, (_k, v) =>
        typeof v === "string" && /^-?\\d+(?:\\.\\d+)?$/.test(v) ? new Decimal(v) : v
      );
      this.state.set("summary", MMap<string, any>(parsed, "."));
    } else {
      const currentSummary = (this.state.get("summary") as any)?.toJS?.() ?? {};
      const json = JSON.stringify(currentSummary);
      await database.insert(`INSERT INTO summary (data) VALUES (:data)`, { data: json });
    }
  }

  private async persistSummaryToDatabase(_options: {}) {
    const summaryMap = this.state.get("summary");
    const summaryObject = summaryMap ? (summaryMap as any).toJS() : {};
    const json = JSON.stringify(summaryObject);

    const existing = await database.select_single(`SELECT rowid AS id FROM summary LIMIT 1`);
    if (existing) {
      await database.update(`UPDATE summary SET data = :data`, { data: json });
    } else {
      await database.insert(`INSERT INTO summary (data) VALUES (:data)`, { data: json });
    }
  }

  // === Orders DB sync ===
  private async updateOrdersDatabaseFromProposal(_options: {}) {
    const market: Market = this.state.getOrThrow("market");
    const currentOrders = this.state.getOrThrow("orders") as Map<OrderId, Order>;
    const proposal: Proposal = this.state.getOrThrow("proposal");
    const nowIso = new Date().toISOString();

    const rows: Array<Record<string, unknown>> = [];

    const mapOrderToRow = (order: Order, statusOverride?: OrderStatus) => ({
      id: this.rujira.fin.getOrderId({ order }),
      owner_address: order.ownerAddress,
      market_address: order.market.address,
      side: order.side,
      type: order.type,
      amount: order.amount?.toString?.() ?? String(order.amount),
      price: order.price?.toString?.() ?? null,
      deviation_in_percentage: order.deviationInPercentage?.toString?.() ?? null,
      filled_percentage: order.filledPercentage?.toString?.() ?? "0",
      status: statusOverride ?? order.status,
      creation_timestamp: order.creationTimestamp ? String(order.creationTimestamp) : nowIso,
      update_timestamp: order.updateTimestamp ? String(order.updateTimestamp) : nowIso,
    });

    const findMatchingOrder = (candidate: OrderId | Order): Order | undefined => {
      if (typeof candidate === "string") return currentOrders.get(candidate as OrderId);
      const id = (candidate as Order)?.id ?? this.rujira.fin.getOrderId({ order: candidate as Order });
      return currentOrders.get(id);
    };

    const handleList = async (items: any, handler: (it: any) => void) => {
      if (!items) return;
      for (const i of (MList<any>(items)).toArray()) handler(i);
    };

    await handleList(proposal.place, (req) => rows.push(mapOrderToRow(req, OrderStatus.OPEN)));
    await handleList(proposal.replace, (req) => rows.push(mapOrderToRow(req, OrderStatus.OPEN)));
    await handleList(proposal.cancel, (cand) => {
      const order = findMatchingOrder(cand);
      if (order) rows.push(mapOrderToRow(order, OrderStatus.CANCELLED));
    });
    await handleList(proposal.withdraw, (cand) => {
      const order = findMatchingOrder(cand);
      if (order) {
        const row = mapOrderToRow(order, OrderStatus.FILLED);
        (row as any).filled_percentage = "100";
        rows.push(row);
      }
    });

    for (const row of rows) {
      const existing = await database.select_single(`SELECT id FROM orders WHERE id = :id`, row);
      if (existing) {
        await database.update(
          `UPDATE orders SET amount=:amount, price=:price, deviation_in_percentage=:deviation_in_percentage,
             filled_percentage=:filled_percentage, status=:status, update_timestamp=:update_timestamp WHERE id=:id`,
          row
        );
      } else {
        await database.insert(
          `INSERT INTO orders (id, owner_address, market_address, side, type, amount, price, deviation_in_percentage, filled_percentage, status, creation_timestamp, update_timestamp)
           VALUES (:id, :owner_address, :market_address, :side, :type, :amount, :price, :deviation_in_percentage, :filled_percentage, :status, :creation_timestamp, :update_timestamp)`,
          row
        );
      }
    }

    const dbOrders = await database.select(
      `SELECT id FROM orders WHERE owner_address = :owner_address AND market_address = :market_address`,
      { owner_address: this.rujira.walletAddress, market_address: market.address }
    );

    const currentIds = new Set((currentOrders.keySeq?.().toArray?.() ?? []) as string[]);
    for (const row of dbOrders.toArray()) {
      const id = (row?.get?.("id") as string) ?? "";
      if (!id || currentIds.has(id)) continue;
      await database.update(
        `UPDATE orders SET status=:status, update_timestamp=:update_timestamp WHERE id=:id`,
        { id, status: OrderStatus.CANCELLED, update_timestamp: nowIso }
      );
    }
  }
}

# Barracuda HFT, a Rujira High-Frequency Trading Bot

A High-Frequency Trading (HFT) bot template, codenamed Barracuda, for Rujira Trade (also known as FIN).

# Instructions

## Prerequisites

- Unix-like operating system (Linux, macOS) or, for Windows, Windows Subsystem for Linux (WSL)
- Latest version of [Bun](https://bun.com/)
- [Keplr](https://www.keplr.app/) wallet and access to your wallet mnemonic or private key from Rujira
- Funds in THOR-RUNE to pay for the fees, and in your desired base and quote tokens (ex.: THOR-RUJI/ETH-USDC)
- A Rujira GraphQL API authentication token (see below)

## Installation

```sh
git clone https://github.com/funttastic/barracuda-hft.git
cd barracuda-hft

./setup
```

When prompted, provide your `wallet mnemonic` or your `wallet private key`, or configure them directly in your `resources/configuration/production.yml` file.

## Running

Review all configurations in `resources/configuration` (the documentation is present in loco there).
Pay special attention to the `rujira.wallet` and `strategy` sections, and double-check that all parameters are tailored to you.

IMPORTANT: The Rujira GraphQL API has restricted access; you will need an authentication token to use it.
Contact Rujira at `api@rujira.network` or Funttastic via [Discord](https://www.funttastic.com/discord) to request one.
Configure it in the `rujira.tokens.graphql` section of your `production.yml` configuration file.

Then run:

```sh
./start
```

or

```
bun run start
```

**Disclaimer**: This application is provided as a bootstrap for HFT strategies. You are solely responsible for your trading decisions and financial outcomes. Cryptocurrency trading involves substantial risk, including the potential loss of your entire investment. Funttastic and Rujira are not responsible for any financial losses, bugs, or technical issues. Use at your own risk and only invest what you can afford to lose.


# FAQ

- How do I resolve an error like `GraphQL errors: [{"message":"rate bucket full (5000). bucket drains 500/s.\ncontact api@rujira.network to increase your limit.\n","path":["node"],"locations":[{"line":3,"column":7}]}]`?

You have reached the Rujira GraphQL API rate limit. You will need to wait for it to reset or, preferably, request an authentication token by contacting Rujira at `api@rujira.network` or Funttastic via [Discord](https://www.funttastic.com/discord).

- How do I reset the strategy state (for example, the initial balances used for comparison and PnL calculations)?

Delete the file `resources/database/database.sqlite`, which stores the strategy state.
Optionally, also delete the log files in the `logs` folder.

- How to contact Rujira?

Join [Rujira's Discord](https://discord.gg/XPvsxhWKfb) and ask for support in the [#barracuda-hft-bot](https://discord.com/channels/1280807332766548052/1408109042051715294) dedicated channel.

- How to contact Funttastic?

Join [our Discord](https://www.funttastic.com/discord) and ask for support in our dedicated [#rujira](https://discord.com/channels/974407301521887273/1099305303352291358) channel.

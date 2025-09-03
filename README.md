# Barracuda HFT, a Rujira High-Frequency Trading Bot

A High-Frequency Trading (HFT) bot, codname Barracuda, for Rujira Trade (aka FIN).

# Instructions

## Prerequisites

- Unix-like operating system (Linux, macOS) or, for Windows, Windows Subsystem for Linux (WSL)
- Latest version of [Bun](https://bun.com/)

## Installation

```sh
git clone https://github.com/funttastic/barracuda-hft.git
cd barracuda-hft

./setup
```

When asked, inform your `wallet mnemonic` or your `wallet private key` or directly configure it in your `resources/configuration/production.yml` configuration file.

## Running

Check all the configurations present in the `resources/configuration`.
Have an especial attention to the `rujira.wallet` and `strategy` sections, double checking if all the parameters are tailored to you.

IMPORTANT: The Rujira GraphQL API have restricted access, you will need an authentication token to use it.
Contact Rujira (api@rujira.network) or Funttastic (https://www.funttastic.com/discord) to ask for one.
Configure it in the `rujira.tokens.graphql` section in your `production.yml` configuration file.

Then run:

```sh
./start
```

or

```
bun run start
```

**Disclaimer**: This application is provided as a bootstrap for HFT strategies. You are solely responsible for your trading decisions and financial outcomes. Cryptocurrency trading involves substantial risk, including potential loss of your entire investment. Funttastic and Rujira are not responsible for any financial losses, bugs, or technical issues. Use at your own risk and only invest what you can afford to lose.


# FAQ

- How to solve an error like `GraphQL errors: [{"message":"rate bucket full (5000). bucket drains 500/s.\ncontact api@rujira.network to increase your limit.\n","path":["node"],"locations":[{"line":3,"column":7}]}]`?

You hit the Rujira GraphQL API limit, you will need to wait, or, preferably, request one authentication token contacting Rujira (api@rujira.network) or Funttastic (https://www.funttastic.com/discord).

- How to reset the strategy state (for example the initial balances used for comparision and PnL calculation)?

Delete the file `resources/database/database.sqlite`, the state of the strategy is saved there.
Optionally, also delete the log files from `logs` folder.

- How to contact Rujira?

Join [Rujira's Discord](https://discord.gg/XPvsxhWKfb) and access the [#barracuda-hft-bot](https://discord.com/channels/1280807332766548052/1408109042051715294) dedicated channel.

- How to contact Funttastic?

Join [our Discord](https://www.funttastic.com/discord) and ask for support in our dedicated [#rujira](https://discord.com/channels/974407301521887273/1099305303352291358) channel.

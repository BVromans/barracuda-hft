# Barracuda HFT, a Rujira High-Frequency Trading Bot

A High-Frequency Trading (HFT) bot, codname Barracuda, for Rujira FIN.

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

Check if all the configurations present in the `resources/configuration`.
Have an especial attention to the `rujira.wallet` and `strategy` sections, double checking if all the parameters are tailored for you.
Then run:

```sh
./start
```

or

```
bun run start
```

**Disclaimer**: This application is provided as a bootstrap for HFT strategies. You are solely responsible for your trading decisions and financial outcomes. Cryptocurrency trading involves substantial risk, including potential loss of your entire investment. Funttastic and Rujira are not responsible for any financial losses, bugs, or technical issues. Use at your own risk and only invest what you can afford to lose.

# Rujira High-Frequency Trading Bot

A High-Frequency Trading (HFT) bot, codname Barracuda, for Rujira FIN.

# Instructions

## Prerequisites

- Unix-like operating system (Linux, macOS) or, for Windows, Windows Subsystem for Linux (WSL)
- Latest version of [Bun](https://bun.com/)

## Installation

```sh
git clone https://github.com/funttastic/rujira-hft-bot.git
cd rujira-hft-bot

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

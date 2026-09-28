# Burbit Frontend

Burbit is a prediction market where every event is captured from a bonding-curve launchpad (pump.fun, Raydium LaunchLab, Pons, and more). It follows the look and structure of Polymarket and Kalshi: YES/NO shares priced in cents, a winning share pays $1 in USDC, and every trade goes through a limit-order book. Burbit is not a launchpad and has no curve of its own; it reads launchpad data to open, check and settle markets.

## What's here

| Path | What it is |
| --- | --- |
| `prototype/index.html` | The clickable prototype. Open it in any browser, no install needed. |
| `prototype/burbit-prototype.html` | Source of the prototype, in the format used by the Claude artifact viewer (no `<html>`/`<head>` wrapper). Edit this file, then rebuild `index.html`. |
| `scripts/build-standalone.sh` | Rebuilds `prototype/index.html` from the source and wires in the PWA files. |
| `prototype/manifest.webmanifest`, `prototype/sw.js`, `prototype/icons/` | Progressive web app: install manifest, offline service worker, app icons. |
| `design/BURBIT-DESIGN.md` | Early design notes. Out of date: the prototype is the current reference. |

## Running the prototype

Open `prototype/index.html` in a browser. Everything is simulated in the page: markets, prices, the order book, other traders and the clock. Nothing connects to a wallet or a chain.

Two tools help when presenting it:

- **Explain** (top bar): outlines each part of the screen; click one to see what it is and why it exists.
- **Demo** (bottom right): speeds up or pauses time and triggers events on the open market, such as ending the auction, graduating the token, filling the market to its maximum size, or voiding it.

## Installing it as an app (PWA)

When `prototype/index.html` is served over HTTPS (for example GitHub Pages), it can be installed: on a phone use **Add to Home Screen**; on desktop Chrome use the install icon in the address bar. It then opens full screen with its own icon and keeps working offline from the last visit. Opening the file directly from disk works for browsing, but browsers only allow installing from a web address.

## Editing

1. Edit `prototype/burbit-prototype.html`.
2. Run `./scripts/build-standalone.sh`.
3. Commit both files.

## What the prototype covers

- Home: featured top launches, biggest movers, launchpads as categories, market cards, and a status filter (live, in auction, ending soon, settled).
- Market page: chance and chart, stats, Trade Yes / Trade No order book, recent trades, and grouped markets when one token has several.
- Trade panel in Kalshi's style: Buy/Sell, Dollars / Shares / Limit, YES/NO, limit price in cents, expiration, "resting order only", and a review step. Every order shows its cost, fee, total and max payout.
- Fees from `docs/09-FEES-AND-ECONOMICS.md` in Burbitarch at launch (tier 0): taker 2% of your own fill value, maker fee waived (normally 1%), opening-auction fills 1%, limit buys hold cost plus a 2% buffer.
- Mobile: bottom tab bar (Markets, Portfolio, How it works) and a sticky Buy YES / Buy NO bar on market pages.
- Every market state from the Burbit spec: opening auction, live, full (maximum size reached), halted, settled YES or NO, and void.
- Portfolio: positions, orders, and winnings to claim.

## Placeholders to confirm

- Launchpads, token names, prices and volumes are made up.
- Pons and Raydium LaunchLab reuse pump.fun's curve numbers.
- The market's maximum size uses a fixed demo price of $150 per SOL.
- Showing NO in blue (because red is the brand colour) is a design choice the team hasn't confirmed.

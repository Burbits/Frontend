# Burbit Product and Design Guide

The decisions every screen in this app follows. Read this before building or reviewing UI. Where it disagrees with the older architecture docs in `Burbits/Burbitarch` (for example `docs/10-FRONTEND-SPEC.md`), **this guide wins** for the frontend; the architecture docs still define the mechanics it doesn't cover, such as fees.

The clickable HTML prototype in `prototype/index.html` is the visual reference for everything below.

## What Burbit is

- A **prediction market** where every event is captured from a **bonding-curve launchpad**: will a token graduate, how fast, will its creator dump.
- It follows the **look and structure of Polymarket and Kalshi**: market cards, a market page, a trade panel, a portfolio.
- Burbit is **not a launchpad and has no curve of its own**. It reads each launchpad's data in the background to open, validate and settle markets.
- It is **not an aggregator of other prediction markets** and has nothing to do with Polymarket. Polymarket and Kalshi are design references only.

## Navigation and categories

- The top-level categories are **the launchpads themselves** (All · pump.fun · Raydium LaunchLab · Pons), the way Polymarket uses Politics or Sports.
- Every market shows the **launchpad its event comes from**, because that launchpad's data validates the event. **Never show the chain** a launchpad runs on.
- Status filters: Live · New (in auction) · Ending soon · Settled.
- The home page opens with a **featured top-launch carousel** and a **biggest movers** list, then the market cards.
- A token with several markets is shown as **one grouped card**, with a row per market (like a Polymarket event).

## What a market screen shows

- The question, **Yes/No odds and prices**, **volume**, a **chance-over-time chart**, and a **limit-order book with a Trade Yes / Trade No switch**.
- **Do not show bonding-curve progress anywhere**: no curve bars, curve percentages or curve lines on charts. It makes the curve look like part of Burbit.
- The "curve guard" order option from the spec is **hidden** unless the team decides to bring it back.

## Money

- Markets settle in **USDC**. Amounts show in **dollars**, prices in **cents**.
- **YES + NO always equals $1**, and each winning share pays **$1**. 1,000 YES bought at 4¢ costs $40 and pays $1,000 if YES wins.
- Say **"market size"** and **"max"**, never "open interest" (that reads as perpetual-futures jargon).

## Trading panel

Follows Kalshi's layout:

1. **Buy | Sell**, and an order-type menu: **Dollars / Shares / Limit** (Sell offers Shares and Limit).
2. A **YES | NO** toggle showing the price of each.
3. The inputs for the chosen order type. Limit adds a **limit price in cents**, the **Ask · Bid** line, **Expiration**, and **Submit as resting order only**.
4. **Always show the fee and the total**: Cost → Fee → **Total you pay** → Max payout for buys; Proceeds → Fee → **You receive** for sells.
5. **Review** step before confirming.

## Fees

Taken from `Burbitarch/docs/09-FEES-AND-ECONOMICS.md`. At launch every trader is **tier 0**:

| Order | Fee |
| --- | --- |
| Buying or selling at the current price (taker) | **2%** of your own fill value |
| Your resting limit order, when filled (maker) | **waived at launch** (normally 1%) |
| Opening auction fill | **1%** |
| Merge, cancel, claim, withdraw | free |

Limit buys hold their cost plus a **2% buffer**; the unused part is returned.

## Visual design

- **Light theme** built from the logo: white surfaces, **Burbit red** as the brand and primary action colour.
- **YES is green, NO is blue**, so NO never reads as the brand red. Always label YES and NO in text, never colour alone.
- Fonts: **IBM Plex Sans** for text, **IBM Plex Mono** with tabular numbers for every price, amount and timer, **Silkscreen** (pixel) for the wordmark, section titles and state badges.
- Use the design tokens in `src/index.css` through Tailwind classes; don't hard-code colours.

### It must not look AI-generated

Avoid: purple or indigo gradients, gradient text, glassmorphism, neon glows, emoji or icons in coloured circles as decoration, hero-plus-three-feature-cards layouts, untouched component-library defaults, the same rounded shadowed card everywhere, filler marketing copy, and made-up stats. Prefer real content, dense readable data, colour only where it carries meaning, and every product state designed (auction, live, full, halted, settled, void, empty, loading, errors).

## Portfolio

Laid out like Polymarket's profile page:

- **Summary**: portfolio value (cash + money held in open orders + positions at today's price), all-time profit/loss against what was deposited, "available to trade", and **Deposit** / **Withdraw** buttons for USDC.
- **Profit/Loss chart** with 5M / 15M / 1H / ALL ranges (demo ranges; the real app may use 1D / 1W / 1M / ALL). Deposits and withdrawals don't count as profit.
- Three tabs:
  - **Positions**: one row per side held (YES and NO of one market are separate rows), with average → current price, value and profit/loss. Search and sort included. Settled winnings to claim live here, with a "Claim all" banner. A lost position shows LOST, and a live one has a **Sell** button that opens the trade panel set to sell.
  - **Open orders**, with Cancel all.
  - **History**: every trade, order outcome (filled, cancelled, expired, refunded, rejected), merge, claim, deposit and withdrawal. It can be filtered by type, including "Failed & cancelled".
- The home page's side panel shows a compact version: value, available, "$X to claim" and the top live positions.

## Mobile and PWA

- Phones get a **labelled bottom tab bar** (Markets, Portfolio, How it works) and a sticky **Buy YES / Buy NO** bar on market pages.
- The app is a **progressive web app**: installable from its HTTPS address and usable offline from the last visit.

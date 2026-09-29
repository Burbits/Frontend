# Burbit Frontend

Burbit is a prediction market where every event is captured from a bonding-curve launchpad (pump.fun, Raydium LaunchLab, Pons, and more). It follows the look and structure of Polymarket and Kalshi: YES/NO shares priced in cents, a winning share pays $1 in USDC, and every trade goes through a limit-order book. Burbit is not a launchpad and has no curve of its own; it reads launchpad data to open, check and settle markets.

**Before building UI, read [`docs/PRODUCT-GUIDE.md`](docs/PRODUCT-GUIDE.md).** It lists the product and design decisions every screen follows.

This repository holds two things:

| Path | What it is |
| --- | --- |
| `src/`, `index.html`, `public/` | **The Burbit app**: React, TypeScript, Tailwind CSS, Vite. This is what we build and ship. |
| `prototype/` | The clickable HTML prototype. It's the **visual reference** while screens are ported to React. Open `prototype/index.html` in a browser. |
| `design/` | Early design notes, out of date. |
| `docs/PRODUCT-GUIDE.md` | Product and design decisions for the app. |

## Running the app

Requires Node 20 or newer.

```sh
npm install
npm run dev        # local dev server with hot reload
npm run build      # type-check and production build into dist/
npm run preview    # serve the production build locally
npm run lint       # lint src/
```

## Stack

- **React 19 + TypeScript**, built with **Vite**.
- **Tailwind CSS v4.** Design tokens (colours, fonts, radii) live in `src/index.css` under `@theme`. Use them through classes such as `bg-surface`, `text-yes`, `text-no`, `bg-brand`, `font-mono`, `font-pixel`; don't hard-code hex values.
- **React Router** for pages: Markets (`/`), a market (`/market/:marketId`), Portfolio (`/portfolio`), How it works (`/how-it-works`).
- **vite-plugin-pwa** makes the app installable and usable offline. Installing needs the app served over HTTPS.

## Project layout

```
src/
  app/            App routes
  components/
    layout/       App shell: top bar, desktop side rail, mobile bottom tabs
    ui/           Shared pieces (logo, icons, ...)
  pages/          One file per screen
  index.css       Tailwind import and Burbit design tokens
```

## Working together

- Don't push to `main`. Create a branch (`feat/...`, `fix/...`), push it, and open a pull request.
- Every pull request runs lint and build on GitHub Actions (`.github/workflows/ci.yml`); keep it green.
- Keep screens faithful to `prototype/` and `docs/PRODUCT-GUIDE.md`.

## Roadmap

1. **Setup** (this PR): React + Tailwind + PWA, design tokens, app shell with navigation, page routes.
2. **Mock API** shaped like the real indexer API (`Burbitarch/docs/08-INDEXER-AND-API-SPEC.md`), so screens are built against the real contract and later switch to the live backend without changes.
3. **Screens**, ported from the prototype: markets home, market page, trade panel, portfolio, how it works.
4. **Wallet**: Solana wallet adapter (Phantom, Solflare, Backpack), USDC balance, trading session keys.
5. **Live backend**: swap the mock API for the real indexer and program.

## The prototype

`prototype/index.html` is a single self-contained page with a simulated market (prices, order book, other traders, clock). **Explain** (top bar) describes each part of the screen; **Demo** (bottom right) triggers events such as ending the auction, graduating the token, or voiding a market. `prototype/burbit-prototype.html` is its source; `scripts/build-standalone.sh` rebuilds `index.html` from it.

> **Out of date (27 Sep 2026).** The team chose a light red-and-white theme based on the logo, launchpads as categories, and "market size" instead of "open interest". The live prototype (`prototype/burbit-prototype.html`) is the current reference until this file is rewritten.

---
version: draft-1
name: Burbit
description: Dark-first, terminal-dense prediction market for tokens on bonding curves. Polymarket's clarity, pump.fun's speed. Color only carries meaning; numbers are the hero.
references: [polymarket.com, kalshi.com, pump.fun]
colors:
  bg: "#0B0C0E"          # page
  surface: "#121317"     # cards, panels
  surface-2: "#1A1C21"   # inputs, hovered rows, nested panels
  border: "#26282E"      # hairlines
  border-strong: "#363941"
  text: "#EDEEF0"
  text-muted: "#8B8F98"
  text-faint: "#5A5E66"
  yes: "#2FBF71"         # YES side, wins, up-moves
  yes-tint: "#2FBF7126"
  brand: "#F70000"       # logo red: logo tile only, never UI chrome
  no: "#F2555A"          # NO side, losses, down-moves (softer than brand red)
  no-tint: "#E5484D26"
  curve: "#F2B531"       # Burbit signature: bonding-curve progress + graduation
  curve-tint: "#F2B53126"
  info: "#4C8DFF"        # auction phase, links, focus ring
  on-accent: "#0B0C0E"   # text on yes/no/curve fills
typography:
  sans: "IBM Plex Sans"  # all UI copy
  mono: "IBM Plex Mono"  # every number: prices, %, SOL, timers, addresses (tabular-nums)
  pixel: "Silkscreen"    # brand voice from the pixel-B logo: wordmark, section titles, state badges. Never body copy.
  scale:
    display: { size: 28px, line: 34px, weight: 600 }  # market question on market page
    title:   { size: 20px, line: 26px, weight: 600 }
    body:    { size: 14px, line: 20px, weight: 400 }
    label:   { size: 13px, line: 18px, weight: 500 }
    micro:   { size: 12px, line: 16px, weight: 500 }  # metadata, column headers (uppercase, +0.04em)
    price-xl: { family: mono, size: 32px, weight: 500 }  # big odds on market page
rounded:
  none: 0px
  sm: 4px     # inputs, small buttons, badges
  md: 8px     # cards, panels, trade ticket
  full: 9999px  # chips/filters only
spacing: [4, 8, 12, 16, 24, 32, 48]   # 4px base; nothing off-scale
elevation: none   # borders separate surfaces; one shadow allowed for popovers/modals only
motion:
  price-flash: "150ms bg flash to yes-tint/no-tint on change, then fade 600ms"
  curve-fill: "width transition 400ms ease-out"
  countdown: "turns no-color under 60s; no pulsing"
  max-duration: 400ms
---

# Overview

Burbit is a live board, not a magazine. Markets live 5–15 minutes and the underlying token moves every second, so the UI borrows **Polymarket/Kalshi's structure** (market card, big YES/NO, clear trade ticket, portfolio) and **pump.fun's environment** (dark, dense, fast, feed-first).

The homepage *is* the app: the live launch feed. No hero, no marketing sections.

# Burbit's own identity: the pixel

The logo is a pixel-art white B on red. That pixel grid carries through the product so Burbit doesn't look like Polymarket or pump.fun:
- **Curve bar as pixel blocks**: the bonding curve fills block by block (20 blocks in the feed, 40 on the market page). Blocks sold before the market opened are dimmer amber.
- **Pixel identicons** for tokens (5×5 symmetric grid generated from the ticker) instead of generic circles.
- **Silkscreen** pixel font for the wordmark, section titles and state badges (LIVE, AUCTION, GRADUATED, CAP FULL).
- Square status dots, open-interest meter as blocks.
- Brand red appears only in the logo tile. It never marks UI state, so it can't be confused with NO.

# What we take from each reference

| From | Take | Leave |
|---|---|---|
| Polymarket | Market card anatomy, "title → odds → metadata" order, restraint (one accent), borders over shadows | Blue brand, Inter, big 15px-radius cards |
| Kalshi | Right-aligned odds pills in rows, numbered trend lists, condensed/dense data rows | Green brand (our green means YES), light-only |
| pump.fun | Dark base, density, left-aligned feed rows with token avatar, right-aligned numbers | Neon green brand, Geist, huge pill buttons |

# Colors

Mostly grayscale. Every saturated color has exactly one job:

- **yes / no**: sides of the market, P&L, price movement. Never decorative.
- **curve (amber)**: bonding-curve progress and graduation. This is Burbit's signature: the one thing no other prediction market has, so it owns the brand color.
- **info (blue)**: auction phase, links, focus rings.
- Everything else (logo, nav, primary buttons that aren't YES/NO) uses text/surface grays.

Never put yes and curve side by side as equals; never tint large areas. Tints (`*-tint`) are for selected states and price flashes only.

# Typography

- **IBM Plex Sans** for words, **IBM Plex Mono** for every number. Mono with `font-variant-numeric: tabular-nums` so prices, SOL and countdowns never jitter as they update.
- Odds shown as **percent** in feeds (`23%`) and as **price** in the trade ticket (`0.23`), with "to win" payout alongside.
- Question text is sentence case, short, specific: "Graduates within 15m?", "Dev sells 50% before 18:00?".
- Column headers: `micro`, uppercase, text-faint.

# Layout

- Desktop: left nav rail (narrow) · main feed · right rail (your positions / recently resolved).
- Market page: header (token + question + state) · left: curve + odds chart + order book · right: sticky trade ticket.
- Mobile: feed as single column; market page stacks; trade ticket becomes a bottom sheet.
- Dense rows over big cards. Feed rows ~64px tall.

# Components

## Launch feed row
`[token avatar] TICKER · question` · `curve bar (amber) + %` · `YES 23% / NO 77%` buttons · `countdown` · `state badge`. Numbers right-aligned.

## Curve bar
Thin amber bar (4–6px) with tick marks at listing milestones (70/80/90%) and a graduation flag at 100%. Shows the live launchpad state. Most important visual on the market page (taller there, ~10px, with SOL-to-graduate label).

## YES / NO buttons
Solid-outline pair, `sm` radius. Unselected: surface-2 bg with yes/no text. Selected: yes/no fill with on-accent text. Show price in mono inside the button.

## Market state badge
Small, `sm` radius, text + dot:
- `AUCTION 0:42` (info) · `LIVE` (yes dot) · `HALTED` (gray) · `GRADUATED → YES` (curve) · `RESOLVED NO` (no) · `VOID` (gray, striped).

## Trade ticket
Tabs: **Quick bet** / **Set your odds**. Side toggle YES/NO → amount (SOL) → summary: avg price, shares, "to win", fee. Set-your-odds adds price input and optional **"Cancel if curve passes __%"** (the curve guard), collapsed by default.

## Order book
Two-column ladder in mono, depth bars as low-opacity yes/no tints behind rows. Spread line in the middle.

## Open-interest meter
`2.10 / 4.31 SOL` with a thin bar. Tooltip explains the cap in one sentence.

## Countdown
Mono. `mm:ss`. Turns `no` color under 60s. No pulsing, no glow.

# States to design (all of them, not just the happy path)
Auction running · live · cap full ("market full, only sells/merges") · order voided by curve guard · partially filled · halted · resolved YES/NO · void (refund at half payout per share) · claimable winnings · empty feed · loading (skeleton rows, not spinners) · wallet not connected · RPC/indexer lag.

# Do's
- Do use real token names, real %, real SOL amounts in every mockup.
- Do right-align and mono every number.
- Do let the curve bar and the odds be the loudest things on screen.
- Do write copy in the trenches' voice: short, specific, no corporate filler.

# Don'ts (anti-vibecoded checklist)
- No gradients, glassmorphism, glows, blurred blobs.
- No purple/indigo, no neon.
- No hero section, no 3-feature-card grid, no fake stats.
- No icons in colored circles, no decorative emoji.
- No large radius (>8px) on containers; no drop shadows on cards.
- No untouched component-library defaults.
- Don't use color without a label (color-blind users: YES/NO always spelled out).

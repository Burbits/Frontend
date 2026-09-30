// Data shapes for the simulated markets. When the real indexer API lands
// (Burbitarch docs/08-INDEXER-AND-API-SPEC.md) these become its response types.

export type Side = 'yes' | 'no'
export type MarketType = 'grad' | 'rug' | 'bonded'
export type MarketState = 'auction' | 'live' | 'halted' | 'resolved' | 'void'
export type Outcome = 'yes' | 'no' | 'void' | null

export type HistPoint = { t: number; pct: number; mid: number | null; auc?: boolean }

export type Trade = {
  t: number
  side: string
  p: number
  n: number
  kind: 'MINT' | 'TRANSFER' | 'MERGE' | 'AUCTION'
  you?: boolean
}

export type Market = {
  id: string
  tick: string
  name: string
  col: string
  q: string
  type: MarketType
  win: number
  launchpad: string
  state: MarketState
  outcome: Outcome
  pct: number
  openPct: number
  mid: number
  oi: number
  volSol: number
  capFix: number | null
  fairFix: number
  mu: number
  vol: number
  /** When the market opened (sim seconds). Settled demo markets have none, like in the prototype. */
  created?: number
  auctionEnd: number
  closeAt: number
  deadlineAt: number
  clear?: number
  halt: 'grad' | 'close' | 'rug' | null
  haltT?: number
  resolveAt?: number
  resT?: number
  gradIn?: number
  follow?: string
  rugHit?: boolean
  bond?: number
  bagTokens?: number
  dev: string
  mint: string
  trades: Trade[]
  hist: HistPoint[]
}

export type OrderStatus = 'open' | 'partial' | 'queued' | 'filled' | 'voided' | 'refunded' | 'cancelled' | 'expired'

export type Order = {
  id: number
  mid: string
  act: 'buy' | 'sell'
  side: Side
  price: number
  shares: number
  filled: number
  status: OrderStatus
  guard: [number, number] | null
  escrow: number
  basis: number
  created: number
  note: string
  expireAt?: number | null
  makerFee?: number
  fillPx?: number
}

export type Position = { yes: number; no: number; cy: number; cn: number; claimed?: boolean; claimedAmt?: number }

export type ToastKind = 'yes' | 'no' | 'cur' | 'info' | 'mut'
export type ToastAction = { act: 'open' | 'claim'; id: string; label: string }
export type Toast = { id: number; msg: string; kind: ToastKind; action?: ToastAction }

export type TicketTab = 'dollars' | 'shares' | 'limit'
export type Ticket = {
  act: 'buy' | 'sell'
  side: Side
  tab: TicketTab
  amount: string
  priceC: string
  shares: string
  exp: 'gtc' | 'close' | 'm5'
  postOnly: boolean
  review: boolean
  err: string
}

export type Quote = { p: number; n: number; cost: number; fee: number; clip?: string; yesEq?: number; hold?: number }

export type ActivityKind = 'Deposit' | 'Withdraw' | 'Claim' | 'Buy' | 'Sell' | 'Merge' | 'Filled' | 'Order' | 'Cancelled' | 'Expired' | 'Refunded' | 'Voided' | 'Rejected'
/** One line of the portfolio's History tab. `amt` is the USDC change (negative = paid out). */
export type Activity = { t: number; kind: ActivityKind; mid: string | null; text: string; amt: number | null }
export type PortfolioTab = 'positions' | 'orders' | 'history'
export type PositionSort = 'value' | 'pl' | 'settle' | 'name'
export type HistoryFilter = 'all' | 'trades' | 'orders' | 'failed' | 'transfers'

/*
  Burbit market simulation, ported 1:1 from the HTML prototype.

  It stands in for the real backend until the indexer API and the on-chain
  program exist: markets, prices, the order book, other traders, fees,
  settlement and the demo wallet all live here. Components read `S` (app state)
  and `T` (trade ticket state) and re-render through `useSim()` whenever
  `emit()` is called.
*/
import { clamp, clock, cents, hash, hm, mmss, r2, rnd, usd } from './format'
import type { Activity, ActivityKind, HistoryFilter, Market, Order, PortfolioTab, Position, PositionSort, Quote, Side, Ticket, Toast, ToastAction, ToastKind, Trade } from './types'

export const U = 1 // one winning share pays $1 USDC
export const SOLUSD = 150 // demo SOL price, to value the launchpad-side forcing cost in USDC
export const BASE = 18 * 3600 // the simulated clock starts at 18:00

const FORCE: [number, number][] = [[0, 19.52], [30, 16.28], [50, 13.12], [70, 8.62], [80, 5.70], [90, 2.46], [95, 0.95], [100, 0]]
export function forcing(p: number) {
  p = clamp(p, 0, 100)
  for (let i = 1; i < FORCE.length; i++) {
    const [a, x] = FORCE[i - 1], [b, y] = FORCE[i]
    if (p <= b) return x + (y - x) * (p - a) / (b - a)
  }
  return 0
}
export function raised(p: number) { const s = clamp(p, 0, 100) / 100 * 793.1; return 30 * s / (1073 - s) }

// Fees follow Burbitarch docs/09-FEES-AND-ECONOMICS.md. Everyone is tier 0 at launch.
export const FEE = { taker: 0.02, maker: 0, makerSteady: 0.01, auction: 0.01, buffer: 0.02, tier: 0 }
export const feeOf = (n: number, p: number) => n * p * U * FEE.taker // taker fee on your own fill value
export const makerFeeOf = (n: number, p: number) => n * p * U * FEE.maker // waived at launch (normally 1%)
export const auctionFeeOf = (n: number, p: number) => n * p * U * FEE.auction // half the taker rate, both sides

/** Launchpads: brand colour and short mark for their source badges. */
export const LP: Record<string, [string, string]> = { 'pump.fun': ['#86C9A0', 'P'], 'Raydium LaunchLab': ['#8FB0E0', 'R'], Pons: ['#E3A55B', 'Po'] }

/* ---------- state ---------- */
export type View = 'feed' | 'market' | 'port' | 'how'
export const S = {
  t: 138, speed: 1, paused: false, view: 'feed' as View, mid: null as string | null,
  filter: 'active' as 'active' | 'new' | 'ending' | 'settled', cat: 'all', q: '',
  explain: false, explainKey: null as string | null, demo: false, walletOpen: false,
  wallet: null as string | null, bal: 500,
  markets: [] as Market[], pos: {} as Record<string, Position>, orders: [] as Order[], oid: 1, spawnAt: 200,
  heroIdx: 0, heroHold: 0, bookSide: 'yes' as Side,
  toasts: [] as Toast[], toastId: 1,
  // portfolio
  ptab: 'positions' as PortfolioTab, psearch: '', psort: 'value' as PositionSort, htype: 'all' as HistoryFilter, prange: 'all' as string,
  act: [] as Activity[], pvHist: [] as { t: number; v: number }[], deposited: 0, walletUsdc: 250,
  transfer: null as null | 'deposit' | 'withdraw',
}
export const T: Ticket = { act: 'buy', side: 'yes', tab: 'dollars', amount: '10', priceC: '28', shares: '100', exp: 'gtc', postOnly: false, review: false, err: '' }

/* ---------- store ---------- */
let version = 0
const listeners = new Set<() => void>()
export function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export function getVersion() { return version }
export function emit() { version++; listeners.forEach((fn) => fn()) }

/* ---------- markets ---------- */
function M(o: Partial<Market> & Pick<Market, 'id' | 'tick' | 'name' | 'col'>): Market {
  const m = Object.assign({ type: 'grad', win: 15, launchpad: 'pump.fun', volSol: 0, state: 'live', openPct: 70, mu: 0.03, vol: 0.3, oi: 0, trades: [], hist: [], outcome: null, capFix: null, halt: null, fairFix: 0.3, dev: '9fQ2…k1Lm', q: '', pct: 0, mid: 0.3, auctionEnd: 0, closeAt: 0, deadlineAt: 0, mint: '' }, o) as Market
  m.mint = (m.launchpad === 'Pons' ? '0x' + (hash(m.tick) % 65536).toString(16) : m.tick.slice(0, 4)) + '…' + (m.launchpad === 'pump.fun' ? 'pump' : m.launchpad === 'Pons' ? '7c1e' : 'rlab')
  if (!m.volSol) m.volSol = m.oi * 2.6 + rnd(45, 300)
  return m
}
export function cap(m: Market) { return m.capFix != null ? m.capFix : 0.5 * forcing(m.pct) * SOLUSD }
export function capRoomPairs(m: Market) { return Math.max(0, Math.floor((cap(m) - m.oi) / U + 1e-9)) }
export function isOpen(m: Market) { return m.state === 'live' || m.state === 'auction' }
export const isFull = (m: Market) => m.oi >= cap(m) - 1e-6
export const isSettled = (m: Market) => m.state === 'resolved' || m.state === 'void'
export function mk(id: string | null | undefined) { return S.markets.find((m) => m.id === id) }

function fair(m: Market) {
  if (m.type !== 'grad') return m.fairFix
  const x = clamp((m.pct - 60) / 40, 0, 1)
  const tl = clamp((m.deadlineAt - S.t) / 600, 0.15, 1.6)
  return clamp(Math.pow(x, 2.2) * (0.55 + 0.45 * tl) * 1.2, 0.02, 0.97)
}
function lvlSize(m: Market, p: number) { const h = hash(m.tick + p.toFixed(2) + Math.floor(S.t / 6)); return 20 + (h % 38) * 10 }
export type Level = { p: number; s: number; you: number }
export function book(m: Market) {
  const a0 = r2(clamp(m.mid + 0.015, 0.02, 0.99)), b0 = r2(clamp(m.mid - 0.015, 0.01, 0.98))
  const asks: Level[] = [], bids: Level[] = []
  for (let i = 0; i < 5; i++) {
    const ap = r2(a0 + i * 0.01), bp = r2(b0 - i * 0.01)
    if (ap <= 0.99) asks.push({ p: ap, s: lvlSize(m, ap), you: 0 })
    if (bp >= 0.01) bids.push({ p: bp, s: lvlSize(m, bp), you: 0 })
  }
  for (const o of S.orders) {
    if (o.mid !== m.id || !(o.status === 'open' || o.status === 'partial' || o.status === 'queued')) continue
    const yp = o.side === 'yes' ? o.price : r2(1 - o.price)
    const list = isBid(o) ? bids : asks
    const rem = o.shares - o.filled
    const l = list.find((x) => x.p === yp)
    if (l) { l.s += rem; l.you += rem } else list.push({ p: yp, s: rem, you: rem })
  }
  asks.sort((a, b) => a.p - b.p); bids.sort((a, b) => b.p - a.p)
  return { asks, bids }
}
export function bestAsk(m: Market) { return r2(clamp(m.mid + 0.015, 0.02, 0.99)) }
export function bestBid(m: Market) { return r2(clamp(m.mid - 0.015, 0.01, 0.98)) }
export function priceFor(m: Market, side: Side) { return side === 'yes' ? bestAsk(m) : r2(1 - bestBid(m)) }

function seedHist(m: Market, from: number, p0: number, p1: number, o0: number, o1: number) {
  const n = Math.max(2, S.t - from)
  for (let i = 0; i <= n; i++) {
    const f = i / n, t = from + i
    const auc = m.auctionEnd != null && t < m.auctionEnd
    m.hist.push({ t, pct: p0 + (p1 - p0) * f + (i && i < n ? rnd(-0.3, 0.3) : 0), mid: auc ? null : r2(clamp(o0 + (o1 - o0) * f + (i && i < n ? rnd(-0.015, 0.015) : 0), 0.01, 0.99)), auc })
  }
}
function seedTrades(m: Market, n: number) {
  const kinds: Trade['kind'][] = ['MINT', 'TRANSFER', 'MINT', 'MERGE', 'TRANSFER', 'MINT']
  for (let i = 0; i < n; i++) {
    const yes = Math.random() < 0.55, p = r2(clamp(m.mid + rnd(-0.03, 0.02), 0.01, 0.99))
    const k = kinds[i % kinds.length]
    m.trades.push({ t: S.t - 4 - i * 9, side: k === 'MERGE' ? 'SELL YES' : (yes ? 'BUY YES' : 'BUY NO'), p: yes || k === 'MERGE' ? p : r2(1 - p), n: 10 + Math.floor(rnd(0, 18)) * 5, kind: k })
  }
  if (m.auctionEnd != null && m.auctionEnd <= S.t) m.trades.push({ t: m.auctionEnd, side: 'UNCROSS', p: m.clear || r2(m.mid * 0.6), n: 150, kind: 'AUCTION' })
}

export function init() {
  S.t = 138; S.markets = []; S.orders = []; S.pos = {}; S.bal = 500; S.oid = 1; S.spawnAt = 200; S.heroIdx = 0; S.heroHold = 0
  const add = (o: Parameters<typeof M>[0]) => { const m = M(o); S.markets.push(m); return m }
  const g = add({ id: 'gorp', tick: 'GORP', name: 'Gorp the Frog', col: '#7FB77E', q: 'Graduates within 15m?', pct: 82.4, mid: 0.31, oi: 276, created: 0, auctionEnd: 60, closeAt: 600, deadlineAt: 900, mu: 0.075, vol: 0.32, clear: 0.18 })
  seedHist(g, 0, 70, 82.4, 0.18, 0.31)
  const g2 = add({ id: 'gorp30', follow: 'gorp', tick: 'GORP', name: 'Gorp the Frog', col: '#7FB77E', win: 30, pct: 82.4, mid: 0.42, oi: 135, created: 0, auctionEnd: 60, closeAt: 1500, deadlineAt: 1800, clear: 0.27 })
  seedHist(g2, 0, 70, 82.4, 0.27, 0.42)
  const sp = add({ id: 'spud', tick: 'SPUD', name: 'Spud', col: '#D9A45B', q: 'Graduates within 15m?', pct: 91, mid: 0.59, oi: 144, created: -212, auctionEnd: -152, closeAt: 388, deadlineAt: 688, mu: 0.035, vol: 0.3, clear: 0.34 })
  seedHist(sp, S.t - 180, 86, 91, 0.45, 0.59)
  const kr = add({ launchpad: 'Raydium LaunchLab', id: 'krill', tick: 'KRILL', name: 'Krill Inc', col: '#E07A6B', q: 'Graduates within 15m?', pct: 70.3, mid: 0.06, oi: 0, created: 120, auctionEnd: 180, closeAt: 720, deadlineAt: 1020, state: 'auction', mu: 0.05, vol: 0.3 })
  seedHist(kr, 120, 70, 70.3, 0.06, 0.06)
  const mo = add({ launchpad: 'Raydium LaunchLab', id: 'moth', tick: 'MOTH', name: 'Moth Lamp', col: '#9DB4D9', type: 'rug', q: 'Will the dev sell half their bag before 18:30?', pct: 76, mid: 0.44, fairFix: 0.44, oi: 46, capFix: 75, created: -300, auctionEnd: -240, closeAt: 1500, deadlineAt: 1800, mu: 0.005, vol: 0.2, clear: 0.40 })
  seedHist(mo, S.t - 180, 75, 76, 0.40, 0.44)
  const br = add({ id: 'brrr', tick: 'BRRR', name: 'Brrr', col: '#6FC3C9', q: 'Graduates within 15m?', pct: 88, mid: 0.39, oi: 230, created: -67, auctionEnd: -7, closeAt: 533, deadlineAt: 833, mu: 0.01, vol: 0.25, clear: 0.22 })
  br.oi = r2(cap(br) + 0.02)
  seedHist(br, S.t - 180, 84, 88, 0.30, 0.39)
  const pl = add({ launchpad: 'Pons', id: 'plank', tick: 'PLANK', name: 'Plank', col: '#C9B26F', q: 'Graduates within 15m?', pct: 73, mid: 0.09, oi: 63, created: -165, auctionEnd: -105, closeAt: 435, deadlineAt: 735, mu: -0.008, vol: 0.22, clear: 0.07 })
  seedHist(pl, S.t - 180, 72, 73, 0.07, 0.09)
  const lu = add({ id: 'lumen', tick: 'LUMEN', name: 'Lumen', col: '#E8D48B', type: 'bonded', q: 'Will the dev pull their bonded bag before 19:00?', pct: 64, mid: 0.12, fairFix: 0.12, oi: 165, created: -900, auctionEnd: -840, closeAt: 3300, deadlineAt: 3600, mu: 0.004, vol: 0.12, bond: 1200, bagTokens: 62e6, clear: 0.15 })
  lu.capFix = lu.bond ?? null
  seedHist(lu, S.t - 180, 63, 64, 0.14, 0.12)
  add({ launchpad: 'Pons', id: 'zorb', tick: 'ZORB', name: 'Zorb', col: '#8FD19E', q: 'Graduated within 15m', pct: 100, mid: 0.99, oi: 210, state: 'resolved', outcome: 'yes', closeAt: 20, deadlineAt: 320, gradIn: 252, resT: 60, auctionEnd: -600 })
  add({ id: 'hollow', win: 10, tick: 'HOLLOW', name: 'Hollow', col: '#A0A4AD', q: 'Graduated within 10m', pct: 79.2, mid: 0.01, oi: 120, state: 'resolved', outcome: 'no', closeAt: 10, deadlineAt: 110, resT: 110, auctionEnd: -600 })
  add({ launchpad: 'Raydium LaunchLab', id: 'vanta', tick: 'VANTA', name: 'Vanta', col: '#B0A0C8', q: 'Graduates within 15m?', pct: 81, mid: 0.3, oi: 90, state: 'void', outcome: 'void', closeAt: 400, deadlineAt: 700, resT: 90, auctionEnd: -300 })
  for (const m of S.markets) if (m.state === 'live') seedTrades(m, 10)
  kr.trades = []
  S.pos = {
    gorp: { yes: 120, no: 0, cy: 120 * 0.22 * U, cn: 0 },
    spud: { yes: 0, no: 40, cy: 0, cn: 40 * 0.48 * U },
    plank: { yes: 20, no: 20, cy: 20 * 0.08 * U, cn: 20 * 0.92 * U },
    zorb: { yes: 80, no: 0, cy: 80 * 0.35 * U, cn: 0 },
    hollow: { yes: 50, no: 0, cy: 50 * 0.2 * U, cn: 0 },
    vanta: { yes: 30, no: 0, cy: 30 * 0.3 * U, cn: 0 },
  }
  addOrder({ mid: 'gorp', side: 'yes', price: 0.26, shares: 100, guard: null, status: 'open' })
  addOrder({ mid: 'krill', side: 'yes', price: 0.07, shares: 150, guard: null, status: 'queued' })
  S.bal = 500 - (0.26 * 100 * U + 0.07 * 150 * U) * (1 + FEE.buffer)
  // demo history: what this wallet did before the page opened
  S.act = []; S.pvHist = []; S.walletUsdc = 250; S.ptab = 'positions'; S.psearch = ''; S.htype = 'all'
  const pl0 = posRows().reduce((a, r) => a + r.pl, 0)
  S.deposited = Math.round((pvNow() - pl0) * 100) / 100
  const seed: [number, ActivityKind, string | null, string, number | null][] = [
    [-1500, 'Deposit', null, 'Deposited from your wallet', S.deposited],
    [-1180, 'Buy', 'hollow', 'Bought 50 YES at 20¢', -50 * 0.2],
    [-1020, 'Buy', 'vanta', 'Bought 30 YES at 30¢', -30 * 0.3],
    [-960, 'Rejected', 'zorb', 'Order rejected: price would fill right away (resting order only)', null],
    [-900, 'Buy', 'zorb', 'Bought 80 YES at 35¢', -80 * 0.35],
    [-600, 'Buy', 'plank', 'Bought 20 YES at 8¢', -20 * 0.08],
    [-590, 'Buy', 'plank', 'Bought 20 NO at 92¢', -20 * 0.92],
    [-420, 'Expired', 'spud', 'BUY 60 NO @ 45¢ expired unfilled', null],
    [-300, 'Buy', 'spud', 'Bought 40 NO at 48¢', -40 * 0.48],
    [70, 'Buy', 'gorp', 'Bought 120 YES at 22¢', -120 * 0.22],
    [100, 'Order', 'gorp', 'Placed BUY 100 YES @ 26¢ (good \'til canceled)', null],
    [125, 'Order', 'krill', 'Queued BUY 150 YES @ 7¢ for the opening auction', null],
  ]
  for (const [t, kind, mid, text, amt] of seed) S.act.unshift({ t, kind, mid, text, amt })
}
export const isBid = (o: Order) => (o.act !== 'sell') === (o.side === 'yes')
function addOrder(o: Partial<Order> & Pick<Order, 'mid' | 'side' | 'price' | 'shares' | 'status'>) {
  const ord = Object.assign({ id: S.oid++, act: 'buy', filled: 0, created: S.t, note: '', basis: 0, guard: null, escrow: 0 }, o) as Order
  ord.escrow = ord.act === 'sell' ? 0 : ord.price * ord.shares * U * (1 + FEE.buffer) // buys lock cost x 1.02
  S.orders.unshift(ord)
  return ord
}
function P(id: string) { return S.pos[id] || (S.pos[id] = { yes: 0, no: 0, cy: 0, cn: 0 }) }

/* ---------- toasts ---------- */
/** `msg` may contain simple inline markup (<b>, <span class="mono">) built only from app data. */
export function toast(msg: string, kind: ToastKind = 'info', action?: ToastAction) {
  const id = S.toastId++
  S.toasts = [{ id, msg, kind, action }, ...S.toasts].slice(0, 4)
  setTimeout(() => dismissToast(id), 7000)
}
export function dismissToast(id: number) { S.toasts = S.toasts.filter((t) => t.id !== id); emit() }

/* ---------- market events ---------- */
function release(o: Order) {
  const rem = o.shares - o.filled
  if (o.act === 'sell') { const p = P(o.mid); if (o.side === 'yes') { p.yes += rem; p.cy += rem * o.basis } else { p.no += rem; p.cn += rem * o.basis } return rem + ' ' + o.side.toUpperCase() + ' back in your position' }
  const v = rem * o.price * U * (1 + FEE.buffer); S.bal += v; return usd(v) + ' refunded'
}
function refundOrders(m: Market, reason: string) {
  const back: string[] = []
  for (const o of S.orders) {
    if (o.mid !== m.id || !['open', 'partial', 'queued'].includes(o.status)) continue
    const lbl = o.act.toUpperCase() + ' ' + (o.shares - o.filled) + ' ' + o.side.toUpperCase() + ' @ ' + cents(o.price)
    const r = release(o); back.push(r); o.status = 'refunded'; o.note = reason
    logAct('Refunded', m.id, lbl + ' returned (' + reason + ')', o.act === 'sell' ? null : (o.shares - o.filled) * o.price * U * (1 + FEE.buffer))
  }
  if (back.length && S.wallet) toast(back.length + ' resting order' + (back.length > 1 ? 's' : '') + ' on $' + m.tick + ' cancelled by the halt: <span class="mono">' + back.join(', ') + '</span>.', 'mut')
}
function uncross(m: Market) {
  m.state = 'live'
  const p = r2(m.mid); m.clear = p
  m.trades.unshift({ t: S.t, side: 'UNCROSS', p, n: 90, kind: 'AUCTION' }, { t: S.t, side: 'UNCROSS', p, n: 120, kind: 'AUCTION' })
  m.oi = Math.min(cap(m), m.oi + (2.1 * p + 0.5) * SOLUSD)
  for (const o of S.orders) {
    if (o.mid !== m.id || o.status !== 'queued') continue
    if (o.act === 'sell') { o.status = 'open'; continue }
    if (o.guard && (m.pct < o.guard[0] || m.pct > o.guard[1])) { voidByGuard(o, m); continue }
    const crosses = o.side === 'yes' ? o.price >= p : o.price >= r2(1 - p)
    if (!crosses) { o.status = 'open'; if (S.wallet) toast('Auction on $' + m.tick + ' cleared at <span class="mono">' + cents(p) + '</span>. Your order didn\'t cross, so it now rests on the book.', 'info'); continue }
    const px = o.side === 'yes' ? p : r2(1 - p)
    const n = Math.min(o.shares, capRoomPairs(m) || o.shares)
    const cost = n * px * U, f = auctionFeeOf(n, px)
    S.bal += o.escrow - cost - f
    const ps = P(m.id); if (o.side === 'yes') { ps.yes += n; ps.cy += cost + f } else { ps.no += n; ps.cn += cost + f }
    o.filled = n; o.fillPx = px; o.status = n < o.shares ? 'partial' : 'filled'
    if (n < o.shares) { o.status = 'filled'; o.note = 'rest refunded: market full' }
    m.oi = Math.min(cap(m) + 0.001, m.oi + n * U)
    m.trades.unshift({ t: S.t, side: o.side === 'yes' ? 'BUY YES' : 'BUY NO', p: px, n, kind: 'AUCTION', you: true })
    logAct('Filled', m.id, 'Bought ' + n + ' ' + o.side.toUpperCase() + ' at ' + cents(px) + ' in the opening auction (+1% fee)', -(cost + f))
    if (S.wallet) toast('Auction on $' + m.tick + ' cleared at <span class="mono">' + cents(p) + '</span>. Your ' + n + ' ' + o.side.toUpperCase() + ' filled at the clearing price <span class="mono">' + cents(px) + '</span> (your limit was ' + cents(o.price) + '). Auction fee 1%: ' + usd(f) + '. Everything unused was returned.', 'info', { act: 'open', id: m.id, label: 'View market' })
  }
}
function halt(m: Market, why: 'grad' | 'close' | 'rug') {
  m.state = 'halted'; m.halt = why; m.haltT = S.t
  refundOrders(m, why === 'grad' ? 'halted: graduated' : 'halted: trading closed')
}
function graduate(m: Market) {
  m.pct = 100; m.gradIn = S.t - (m.created ?? 0); halt(m, 'grad'); m.resolveAt = S.t + 3
  toast('$' + m.tick + ' graduated on ' + m.launchpad + '. Market halted; settling YES.', 'cur', { act: 'open', id: m.id, label: 'View market' })
}
function resolve(m: Market, out: 'yes' | 'no') {
  m.state = 'resolved'; m.outcome = out; m.resT = S.t
  const p = S.pos[m.id]
  if (p && S.wallet) {
    const pay = payout(m, p)
    if (pay > 0) toast('$' + m.tick + ' settled <b>' + out.toUpperCase() + '</b>. You have <span class="mono">' + usd(pay) + '</span> to claim.', out === 'yes' ? 'yes' : 'no', { act: 'claim', id: m.id, label: 'Claim ' + usd(pay) })
    else if (p.yes + p.no > 0) toast('$' + m.tick + ' settled <b>' + out.toUpperCase() + '</b>. Your shares lost.', 'mut')
  }
}
function voidM(m: Market) {
  m.state = 'void'; m.outcome = 'void'; m.resT = S.t
  refundOrders(m, 'market voided')
  toast('$' + m.tick + ': the launchpad account could not be read, so the market is VOID. Every share redeems for 50¢; each pair gets its full $1 back.', 'mut', { act: 'open', id: m.id, label: 'View market' })
}
export function payout(m: Market, p: Position | undefined) {
  if (!p || p.claimed) return 0
  if (m.outcome === 'yes') return p.yes * U
  if (m.outcome === 'no') return p.no * U
  if (m.outcome === 'void') return (p.yes + p.no) * U / 2
  return 0
}
function voidByGuard(o: Order, m: Market) {
  const back = release(o)
  const g = o.guard as [number, number]
  logAct('Voided', m.id, o.act.toUpperCase() + ' ' + o.side.toUpperCase() + ' @ ' + cents(o.price) + ' voided by its guard', null)
  o.status = 'voided'; o.note = 'curve ' + m.pct.toFixed(1) + '% left ' + g[0] + '–' + g[1] + '%'
  if (S.wallet) toast('Order voided: $' + m.tick + '\'s curve moved to <span class="mono">' + m.pct.toFixed(1) + '%</span>, outside your ' + g[0] + '–' + g[1] + '% guard. Never filled: <span class="mono">' + back + '</span>.', 'cur')
}

/* ---------- simulation ---------- */
function step(m: Market) {
  const moving = m.state === 'auction' || m.state === 'live' || (m.state === 'halted' && m.halt === 'close')
  if (m.follow) { const L = mk(m.follow); if (L) m.pct = L.pct }
  else if (moving) m.pct = clamp(m.pct + m.mu + m.vol * rnd(-1, 1), 40, m.type === 'grad' ? 100 : 99.5)
  if (m.state === 'auction') {
    m.mid = r2(clamp(m.mid + (fair(m) - m.mid) * 0.1, 0.02, 0.98))
    if (S.t >= m.auctionEnd) uncross(m)
  } else if (m.state === 'live') {
    if (m.type === 'grad' && m.pct >= 100) graduate(m)
    else if (S.t >= m.closeAt) { halt(m, 'close'); if (S.wallet) toast('Trading closed on $' + m.tick + '. It still settles YES if the token graduates before ' + hm(BASE + m.deadlineAt) + '.', 'mut') }
    else {
      m.mid = r2(clamp(m.mid + (fair(m) - m.mid) * 0.12 + rnd(-0.012, 0.012), 0.02, 0.98))
      if (Math.random() < 0.45) randomTrade(m)
    }
  } else if (m.state === 'halted') {
    if (m.halt === 'grad' && S.t >= (m.resolveAt ?? 0)) resolve(m, 'yes')
    else if (m.halt === 'close') {
      if (m.type === 'grad' && m.pct >= 100) { m.gradIn = S.t - (m.created ?? 0); m.halt = 'grad'; m.resolveAt = S.t + 3; toast('$' + m.tick + ' graduated after trading closed but before the deadline. Settling YES.', 'cur') }
      else if (S.t >= m.deadlineAt) resolve(m, m.type === 'grad' ? 'no' : (m.rugHit ? 'yes' : 'no'))
    }
  }
  if (moving || m.state === 'halted') {
    m.hist.push({ t: S.t, pct: m.pct, mid: m.state === 'auction' ? null : m.mid, auc: m.state === 'auction' })
    if (m.hist.length > 1200) m.hist.shift()
  }
}
function randomTrade(m: Market) {
  const r = Math.random()
  const n = 10 + Math.floor(rnd(0, 18)) * 5
  let kind: Trade['kind'], side: string, p: number
  if (r < 0.15 && m.oi > n * U) { kind = 'MERGE'; side = 'SELL YES'; p = bestBid(m); m.oi -= n * U }
  else if (r < 0.6 && capRoomPairs(m) >= n) { kind = 'MINT'; const y = Math.random() < 0.5; side = y ? 'BUY YES' : 'BUY NO'; p = y ? bestAsk(m) : r2(1 - bestBid(m)); m.oi += n * U }
  else { kind = 'TRANSFER'; const y = Math.random() < 0.5; side = y ? 'BUY YES' : 'BUY NO'; p = y ? bestAsk(m) : r2(1 - bestBid(m)) }
  if (m.type === 'bonded' && side === 'BUY NO') { side = 'BUY YES'; p = bestAsk(m) }
  m.trades.unshift({ t: S.t, side, p, n, kind })
  m.volSol += n * p * U
  if (m.trades.length > 40) m.trades.pop()
}
function processOrders() {
  for (const o of S.orders) {
    if (!['open', 'partial'].includes(o.status)) continue
    const m = mk(o.mid); if (!m || m.state !== 'live') continue
    if (o.expireAt && S.t >= o.expireAt) { logAct('Expired', m.id, o.act.toUpperCase() + ' ' + (o.shares - o.filled) + ' ' + o.side.toUpperCase() + ' @ ' + cents(o.price) + ' expired unfilled', null); const back = release(o); o.status = 'expired'; if (S.wallet) toast('Your order on $' + m.tick + ' expired unfilled: <span class="mono">' + back + '</span>.', 'mut'); continue }
    if (o.guard && (m.pct < o.guard[0] || m.pct > o.guard[1])) { voidByGuard(o, m); continue }
    const yp = o.side === 'yes' ? o.price : r2(1 - o.price), bid = isBid(o)
    const near = bid ? (m.mid - yp <= 0.025) : (yp - m.mid <= 0.025)
    const through = bid ? bestAsk(m) <= yp : bestBid(m) >= yp
    if (!(through || (near && Math.random() < 0.14))) continue
    let n = Math.min(o.shares - o.filled, 15 + Math.floor(rnd(0, 12)) * 5)
    let kind: Trade['kind']
    const ps = P(m.id)
    if (o.act === 'sell') {
      kind = Math.random() < 0.5 && m.oi >= n * U ? 'MERGE' : 'TRANSFER'
      if (kind === 'MERGE') m.oi -= n * U
      S.bal += n * o.price * U - makerFeeOf(n, o.price)
    } else {
      const mint = capRoomPairs(m) > 0
      if (mint) n = Math.min(n, capRoomPairs(m))
      if (n <= 0) continue
      kind = mint ? 'MINT' : 'TRANSFER'
      if (mint) m.oi += n * U
      const mf = makerFeeOf(n, o.price)
      S.bal += n * o.price * U * FEE.buffer - mf // unused 2% buffer back, minus the maker fee
      if (o.side === 'yes') { ps.yes += n; ps.cy += n * o.price * U + mf } else { ps.no += n; ps.cn += n * o.price * U + mf }
    }
    o.filled += n; o.makerFee = (o.makerFee || 0) + makerFeeOf(n, o.price)
    o.status = o.filled >= o.shares ? 'filled' : 'partial'
    m.volSol += n * o.price * U
    m.trades.unshift({ t: S.t, side: (o.act === 'sell' ? 'SELL ' : 'BUY ') + o.side.toUpperCase(), p: o.price, n, kind, you: true })
    logAct('Filled', m.id, (o.act === 'sell' ? 'Sold ' : 'Bought ') + n + ' ' + o.side.toUpperCase() + ' at ' + cents(o.price) + ' (your limit order, ' + o.filled + '/' + o.shares + ')', (o.act === 'sell' ? 1 : -1) * n * o.price * U)
    if (S.wallet) toast('Your ' + o.act + ' order on $' + m.tick + ' filled <span class="mono">' + o.filled + '/' + o.shares + ' ' + o.side.toUpperCase() + '</span> at ' + cents(o.price) + (o.act === 'sell' ? ' (' + (kind === 'MERGE' ? 'merged with a ' + (o.side === 'yes' ? 'NO' : 'YES') + ' seller' : 'bought by another trader') + ')' : '') + '. Maker fee <span class="mono">' + usd(makerFeeOf(n, o.price)) + '</span> (waived at launch).', o.side === 'yes' ? 'yes' : 'no')
  }
}
const POOL: [string, string, string][] = [['FLUX', 'Flux', '#8FC1D9'], ['OKRA', 'Okra', '#9FCB7C'], ['DINGO', 'Dingo', '#D99B6C'], ['PEBL', 'Pebble', '#B8B8C8'], ['YAWN', 'Yawn', '#C9A8E0'], ['SNAX', 'Snax', '#E0B870'], ['GLOOP', 'Gloop', '#7FD1B9'], ['BIRB', 'Birb', '#E09C9C'], ['TUSK', 'Tusk', '#C8C0A0'], ['MEEP', 'Meep', '#A0C0E8']]
export function spawn() {
  const used = new Set(S.markets.map((m) => m.tick))
  const pick = POOL.find((x) => !used.has(x[0]))
  if (!pick) return
  const win = Math.random() < 0.5 ? 10 : 15
  const m = M({ launchpad: Object.keys(LP)[Math.floor(Math.random() * 3)], id: pick[0].toLowerCase(), tick: pick[0], name: pick[1], col: pick[2], q: 'Graduates within ' + win + 'm?', win, pct: 70, mid: 0.05, oi: 0, created: S.t, auctionEnd: S.t + 60, closeAt: S.t + win * 60 - 300, deadlineAt: S.t + win * 60, state: 'auction', mu: rnd(-0.01, 0.07), vol: rnd(0.2, 0.35) })
  m.mid = r2(fair(m))
  const firstDone = S.markets.findIndex((x) => !isOpen(x) && x.state !== 'halted')
  S.markets.splice(firstDone >= 0 ? firstDone : S.markets.length, 0, m)
  toast('New market: <b>' + question(m) + '</b> ($' + m.tick + ' on ' + m.launchpad + ' is close to graduating). Opening auction running.', 'info', { act: 'open', id: m.id, label: 'Open auction' })
  const settled = S.markets.filter((x) => isSettled(x))
  if (settled.length > 5) { const old = settled.sort((a, b) => (a.resT ?? 0) - (b.resT ?? 0))[0]; if (!S.pos[old.id] || payout(old, S.pos[old.id]) === 0) S.markets.splice(S.markets.indexOf(old), 1) }
}
export function tick() {
  S.t += 1
  for (const m of S.markets) step(m)
  processOrders()
  if (S.t >= S.spawnAt) { spawn(); S.spawnAt = S.t + 90 }
  samplePV()
  // featured carousel advances every 8 seconds unless the user just moved it
  if (S.t >= S.heroHold && S.t % 8 === 0) S.heroIdx = S.heroIdx + 1
  emit()
}
let timer: ReturnType<typeof setInterval> | null = null
export function setSpeed(v: number) {
  S.speed = v; S.paused = v === 0
  if (timer) clearInterval(timer)
  timer = v > 0 ? setInterval(tick, 1000 / v) : null
  emit()
}

/* ---------- labels ---------- */
export function question(m: Market) { return m.type === 'grad' ? 'Will $' + m.tick + ' graduate within ' + m.win + ' minutes?' : m.q }
export function shortQ(m: Market) { return m.type === 'grad' ? 'Graduates within ' + m.win + 'm' : m.type === 'bonded' ? 'Dev pulls bonded bag' : 'Dev sells half their bag' }
export const nowClock = () => clock(BASE + S.t)
export { mmss }

/* ---------- home page queries ---------- */
export const STATUS: [typeof S.filter, string][] = [['active', 'Live'], ['new', 'New · in auction'], ['ending', 'Ending soon'], ['settled', 'Settled']]
const active = (m: Market) => isOpen(m) || m.state === 'halted'
export const FT: Record<typeof S.filter, (m: Market) => boolean> = {
  active, new: (m) => m.state === 'auction', ending: (m) => isOpen(m) && m.closeAt - S.t < 600, settled: (m) => !active(m),
}
export function passes(m: Market, ignore?: 'cat' | 'status') {
  const q = S.q.trim().toLowerCase()
  return (ignore === 'cat' || S.cat === 'all' || m.launchpad === S.cat) &&
    (ignore === 'status' || FT[S.filter](m)) &&
    (!q || (m.tick + ' ' + m.name + ' ' + question(m) + ' ' + m.launchpad).toLowerCase().includes(q))
}
/** Markets grouped by token (a token with several questions is one event). */
export function events(ms: Market[]) {
  const map = new Map<string, Market[]>()
  for (const m of ms) { if (!map.has(m.tick)) map.set(m.tick, []); map.get(m.tick)!.push(m) }
  const ev = [...map.values()]
  if (S.filter === 'settled') return ev.sort((a, b) => (b[0].resT || 0) - (a[0].resT || 0))
  if (S.filter === 'ending') return ev.sort((a, b) => a[0].closeAt - b[0].closeAt)
  return ev.sort((a, b) => Number(a[0].state === 'halted') - Number(b[0].state === 'halted') || b.reduce((s, m) => s + m.volSol, 0) - a.reduce((s, m) => s + m.volSol, 0))
}
/** Up to five biggest live tokens by volume, for the featured carousel. */
export function heroTop() {
  const pool = S.markets.filter((m) => isOpen(m) && (S.cat === 'all' || m.launchpad === S.cat))
  const seen = new Set<string>(), top: Market[] = []
  for (const m of [...pool].sort((a, b) => b.volSol - a.volSol)) { if (seen.has(m.tick)) continue; seen.add(m.tick); top.push(m); if (top.length === 5) break }
  return { pool, top }
}
export function movers() {
  const { pool } = heroTop()
  return pool.filter((x) => x.state === 'live' && x.clear != null).sort((a, b) => Math.abs(b.mid - (b.clear as number)) - Math.abs(a.mid - (a.clear as number))).slice(0, 5)
}
export function posValue(m: Market, p: Position) {
  if (!isOpen(m) && m.state !== 'halted') return payout(m, p)
  if (m.state === 'auction' || m.state === 'halted') return p.yes * m.mid * U + p.no * (1 - m.mid) * U
  return p.yes * bestBid(m) * U + p.no * (1 - bestAsk(m)) * U
}

/* ---------- trade ticket ---------- */
export const sellPx = (m: Market, side: Side) => side === 'yes' ? bestBid(m) : r2(1 - bestAsk(m))
export function held(m: Market, side: Side) { const p = S.pos[m.id]; return p && !p.claimed ? (side === 'yes' ? p.yes : p.no) : 0 }
function defaultPrice(m: Market | undefined, act: Ticket['act'], side: Side) {
  if (!m || m.state !== 'live') return act === 'buy' ? (side === 'yes' ? r2(m ? m.mid : 0.3) : r2(1 - (m ? m.mid : 0.3))) : 0.5
  const v = act === 'buy' ? (side === 'yes' ? bestBid(m) - 0.02 : 1 - bestAsk(m) - 0.02) : (side === 'yes' ? bestAsk(m) + 0.02 : 1 - bestBid(m) + 0.02)
  return r2(clamp(v, 0.01, 0.99))
}
const defaultPriceC = (m: Market | undefined, act: Ticket['act'], side: Side) => String(Math.round(defaultPrice(m, act, side) * 100))
export const OTYPES: Record<Ticket['tab'], string> = { dollars: 'Dollars', shares: 'Shares', limit: 'Limit' }
export const EXP: Record<Ticket['exp'], string> = { gtc: 'Good \'til canceled', close: 'Until trading closes', m5: '5 minutes' }

/** Keep the ticket consistent with the market it is showing (the prototype did this while rendering). */
export function normalizeTicket(m: Market) {
  if (m.state === 'auction') { T.tab = 'limit'; T.act = 'buy' }
  if (T.act === 'sell' && T.tab === 'dollars') T.tab = 'shares'
  if (m.type === 'bonded' && T.side === 'no') T.side = 'yes'
}

export function quote(m: Market): Quote {
  const buy = T.act === 'buy'
  if (T.tab === 'dollars') {
    const p = priceFor(m, T.side), amt = parseFloat(T.amount) || 0
    let n = Math.max(0, Math.floor(amt / (p * U * (1 + FEE.taker)) + 1e-9)), clip = ''
    const room = capRoomPairs(m)
    if (room <= 0) { if (n > 35) { n = 35; clip = 'Only 35 shares are for sale at this price (market full).' } }
    else if (n > room + 40) { n = room + 40; clip = 'Clipped by the market\'s maximum size.' }
    return { p, n, cost: n * p * U, fee: feeOf(n, p), clip }
  }
  const n = Math.max(0, parseInt(T.shares, 10) || 0)
  if (T.tab === 'shares') {
    const p = buy ? priceFor(m, T.side) : sellPx(m, T.side)
    const hv = held(m, T.side)
    return { p, n: buy ? n : Math.min(n, hv), cost: n * p * U, fee: feeOf(n, p), clip: !buy && n > hv ? 'You only hold ' + hv + ' ' + T.side.toUpperCase() + '.' : '' }
  }
  const lp = (parseFloat(T.priceC) || 0) / 100
  const auc = m.state === 'auction'
  return { p: lp, n, cost: lp * n * U, fee: auc ? auctionFeeOf(n, lp) : makerFeeOf(n, lp), yesEq: T.side === 'yes' ? lp : r2(1 - lp), hold: lp * n * U * (1 + FEE.buffer) }
}
export type FeeRow = [label: string, amount: string, style: '' | 'fee' | 'big' | 'pay', sub: string]
export function feeLines(m: Market, q: Quote): FeeRow[] {
  const buy = T.act === 'buy', side = T.side.toUpperCase(), auc = m.state === 'auction', lim = T.tab === 'limit'
  const notional = q.n * q.p * U
  if (buy) {
    const feeLabel = auc ? 'Auction fee · 1%' : lim ? 'Maker fee · waived at launch' : 'Fee · 2% taker'
    const rows: FeeRow[] = [
      ['Cost', usd(notional), '', q.n.toLocaleString('en-US') + ' ' + side + ' at ' + cents(q.p)],
      [feeLabel, usd(q.fee), 'fee', lim && !auc ? 'normally 1%; 2% if your price fills right away' : ''],
      ['Total you pay', usd(notional + q.fee), 'big', lim ? 'if it fills at your price' : ''],
      ['Max payout', usd(q.n * U), 'pay', 'if ' + side + ' wins · settles by ' + clock(BASE + m.deadlineAt).slice(0, 5)],
    ]
    if (lim) rows.push(['Held now', usd(q.hold ?? 0), '', 'cost + 2% buffer, unused part returned'])
    return rows
  }
  const feeLabel = lim ? 'Maker fee · waived at launch' : 'Fee · 2% taker'
  return [
    ['Proceeds', usd(notional), '', q.n.toLocaleString('en-US') + ' ' + side + ' at ' + cents(q.p)],
    [feeLabel, (q.fee > 0 ? '−' : '') + usd(q.fee), 'fee', lim ? 'normally 1%; 2% if your price fills right away' : ''],
    ['You receive', usd(Math.max(0, notional - q.fee)), 'pay', lim ? 'if it fills at your price' : ''],
  ]
}
export function validate(m: Market) {
  const q = quote(m), buy = T.act === 'buy'
  if (q.n <= 0) return T.tab === 'dollars' ? 'Enter an amount of at least ' + usd(q.p * U * 1.02) + '.' : 'Enter at least 1 share.'
  if (T.tab === 'limit' && !(q.p >= 0.01 && q.p <= 0.99)) return 'Limit price must be between 1¢ and 99¢.'
  const need = T.tab === 'limit' && buy ? (q.hold ?? 0) : q.cost + q.fee
  if (buy && need > S.bal + 1e-9) return 'Not enough USDC. You need ' + usd(need) + (T.tab === 'limit' ? ' held (cost + 2% buffer)' : ' including the fee') + '; you have ' + usd(S.bal) + '.'
  if (!buy && q.n > held(m, T.side)) return 'You only hold ' + held(m, T.side) + ' ' + T.side.toUpperCase() + '.'
  if (T.tab === 'limit' && T.postOnly && m.state === 'live') {
    const yesEq = q.yesEq ?? 0
    const crosses = buy ? (T.side === 'yes' ? yesEq >= bestAsk(m) : yesEq <= bestBid(m)) : q.p <= sellPx(m, T.side)
    if (crosses) return 'This price would fill right away. Change the price, or untick "resting order only".'
  }
  return ''
}
export function submit() {
  const m = mk(S.mid); if (!m) return
  T.review = false
  const err = validate(m)
  if (err) { T.err = err; logAct('Rejected', m.id, 'Order rejected: ' + err.replace(/\.$/, ''), null); return emit() }
  T.err = ''
  const q = quote(m), side = T.side, SIDE = side.toUpperCase()
  const expireAt = T.tab === 'limit' ? (T.exp === 'm5' ? S.t + 300 : T.exp === 'close' ? m.closeAt : null) : null
  if (T.act === 'buy' && T.tab !== 'limit') {
    if (m.state !== 'live') return
    const fee = feeOf(q.n, q.p), cost = q.n * q.p * U
    S.bal -= cost + fee
    const ps = P(m.id); if (side === 'yes') { ps.yes += q.n; ps.cy += cost + fee } else { ps.no += q.n; ps.cn += cost + fee }
    const mint = capRoomPairs(m) >= q.n
    if (mint) m.oi += q.n * U
    m.trades.unshift({ t: S.t, side: 'BUY ' + SIDE, p: q.p, n: q.n, kind: mint ? 'MINT' : 'TRANSFER', you: true })
    m.volSol += cost
    m.mid = r2(clamp(m.mid + (side === 'yes' ? 0.01 : -0.01), 0.02, 0.98))
    logAct('Buy', m.id, 'Bought ' + q.n + ' ' + SIDE + ' at ' + cents(q.p) + ' (fee ' + usd(fee) + ')', -(cost + fee))
    toast('Bought <span class="mono">' + q.n.toLocaleString('en-US') + ' ' + SIDE + '</span> at ' + cents(q.p) + ': ' + usd(cost) + ' + ' + usd(fee) + ' fee = ' + usd(cost + fee) + '. If ' + SIDE + ' wins you get <span class="mono">' + usd(q.n * U) + '</span>.', side === 'yes' ? 'yes' : 'no')
  } else if (T.tab !== 'limit') {
    if (m.state !== 'live') return
    sellShares(m, side, q.n)
  } else if (T.act === 'buy') {
    const yp = q.yesEq ?? 0
    if (m.state === 'live' && ((side === 'yes' && yp >= bestAsk(m)) || (side === 'no' && yp <= bestBid(m)))) {
      const px = priceFor(m, side), fee = feeOf(q.n, px), cost = q.n * px * U
      S.bal -= cost + fee
      const ps = P(m.id); if (side === 'yes') { ps.yes += q.n; ps.cy += cost + fee } else { ps.no += q.n; ps.cn += cost + fee }
      const o = addOrder({ mid: m.id, side, price: q.p, shares: q.n, guard: null, status: 'filled' }); o.filled = q.n; o.note = 'filled right away at ' + cents(px)
      logAct('Buy', m.id, 'Bought ' + q.n + ' ' + SIDE + ' at ' + cents(px) + ' (limit crossed the book, fee ' + usd(fee) + ')', -(cost + fee))
      m.trades.unshift({ t: S.t, side: 'BUY ' + SIDE, p: px, n: q.n, kind: capRoomPairs(m) >= q.n ? 'MINT' : 'TRANSFER', you: true })
      toast('Your limit crossed the book, so it filled right away at <span class="mono">' + cents(px) + '</span>, better than your ' + cents(q.p) + '.', 'info')
    } else {
      S.bal -= q.hold ?? 0
      const o = addOrder({ mid: m.id, side, price: q.p, shares: q.n, guard: null, status: m.state === 'auction' ? 'queued' : 'open' })
      o.expireAt = expireAt; o.note = EXP[T.exp].toLowerCase() + (T.postOnly ? ' · resting only' : '')
      logAct('Order', m.id, (m.state === 'auction' ? 'Queued ' : 'Placed ') + 'BUY ' + q.n + ' ' + SIDE + ' @ ' + cents(q.p) + ' (' + EXP[T.exp].toLowerCase() + ')', null)
      toast((m.state === 'auction' ? 'Queued for the auction: ' : 'Buy order resting on the book: ') + '<span class="mono">' + q.n.toLocaleString('en-US') + ' ' + SIDE + ' at ' + cents(q.p) + '</span>. ' + usd(q.hold ?? 0) + ' held until it fills (cost + 2% buffer).', 'info')
    }
  } else {
    if (q.p <= sellPx(m, side)) sellShares(m, side, q.n, 'Your price was at or below the best bid, so it sold right away at ' + cents(sellPx(m, side)) + '.')
    else {
      const ps = P(m.id), basis = side === 'yes' ? ps.cy / ps.yes : ps.cn / ps.no
      if (side === 'yes') { ps.yes -= q.n; ps.cy -= basis * q.n } else { ps.no -= q.n; ps.cn -= basis * q.n }
      const o = addOrder({ mid: m.id, act: 'sell', side, price: q.p, shares: q.n, guard: null, status: 'open', basis })
      o.expireAt = expireAt; o.note = EXP[T.exp].toLowerCase() + (T.postOnly ? ' · resting only' : '')
      logAct('Order', m.id, 'Placed SELL ' + q.n + ' ' + SIDE + ' @ ' + cents(q.p) + ' (' + EXP[T.exp].toLowerCase() + ')', null)
      toast('Sell order resting on the book: <span class="mono">' + q.n + ' ' + SIDE + ' at ' + cents(q.p) + '</span>. Your shares are held until it fills.', 'info')
    }
  }
  emit()
}
function sellShares(m: Market, side: Side, n: number, lead?: string) {
  const p = S.pos[m.id]; if (!p || m.state !== 'live') return
  n = Math.min(n, side === 'yes' ? p.yes : p.no); if (!n) return
  const px = sellPx(m, side), fee = feeOf(n, px), got = n * px * U - fee
  S.bal += got
  const merge = Math.random() < 0.5 && m.oi >= n * U
  if (merge) m.oi -= n * U
  if (side === 'yes') { p.cy -= p.cy / p.yes * n; p.yes -= n } else { p.cn -= p.cn / p.no * n; p.no -= n }
  m.volSol += n * px * U
  m.trades.unshift({ t: S.t, side: 'SELL ' + side.toUpperCase(), p: px, n, kind: merge ? 'MERGE' : 'TRANSFER', you: true })
  logAct('Sell', m.id, 'Sold ' + n + ' ' + side.toUpperCase() + ' at ' + cents(px) + ' (fee ' + usd(fee) + ')', got)
  toast((lead ? lead + ' ' : '') + 'Sold <span class="mono">' + n + ' ' + side.toUpperCase() + '</span> at ' + cents(px) + ' for <span class="mono">' + usd(got) + '</span> (' + (merge ? 'merged with a ' + (side === 'yes' ? 'NO' : 'YES') + ' seller: the pair was burned' : 'another trader bought them') + ').', 'info')
}

/* ---------- user actions (each ends with emit so the UI re-renders) ---------- */
export function sellAll(side: Side) { const m = mk(S.mid); if (!m) return; sellShares(m, side, Infinity); emit() }
export function merge() {
  const m = mk(S.mid); if (!m) return
  const p = S.pos[m.id]; if (!p) return
  const n = Math.min(p.yes, p.no); if (!n) return
  const fy = p.cy / p.yes, fn = p.cn / p.no
  p.yes -= n; p.no -= n; p.cy -= fy * n; p.cn -= fn * n
  S.bal += n * U; m.oi = Math.max(0, m.oi - n * U)
  m.trades.unshift({ t: S.t, side: 'MERGE', p: 1, n, kind: 'MERGE', you: true })
  logAct('Merge', m.id, 'Merged ' + n + ' YES+NO pairs back into USDC', n * U)
  toast('Merged <span class="mono">' + n + '</span> YES+NO pairs back into <span class="mono">' + usd(n * U) + '</span>. Free, no fee.', 'info')
  emit()
}
export function cancel(id: number) {
  const o = S.orders.find((x) => x.id === id); if (!o) return
  logAct('Cancelled', o.mid, 'Cancelled ' + o.act.toUpperCase() + ' ' + (o.shares - o.filled) + ' ' + o.side.toUpperCase() + ' @ ' + cents(o.price), null)
  const back = release(o); o.status = 'cancelled'
  toast('Order cancelled: <span class="mono">' + back + '</span>.', 'mut')
  emit()
}
export function claim(id: string, quiet = false) {
  const m = mk(id), p = S.pos[id]; if (!m || !p) return
  const pay = payout(m, p); if (pay <= 0) return
  S.bal += pay; p.claimed = true; p.claimedAmt = pay
  logAct('Claim', id, (m.state === 'void' ? 'Redeemed voided shares' : 'Claimed winnings (' + (m.outcome || '').toUpperCase() + ')'), pay)
  if (!quiet) { toast('Claimed <span class="mono">' + usd(pay) + '</span> from $' + m.tick + '.', 'yes'); emit() }
}
export function claimAll() {
  for (const k in S.pos) { const m = mk(k); if (m && isSettled(m) && payout(m, S.pos[k]) > 0) claim(k, true) }
  emit()
}

/** Called when the app navigates. Opening a market from a Yes/No button pre-selects that side. */
export function setView(view: View, id: string | null = null, side?: Side) {
  const changed = S.view !== view || S.mid !== id
  S.view = view; S.mid = id; T.err = ''
  if (side) { T.side = side; T.act = 'buy'; T.tab = 'dollars'; T.review = false }
  if (changed || side) emit()
}

export const ticket = {
  setAct(v: Ticket['act']) {
    const m0 = mk(S.mid)
    T.act = v; T.err = ''; T.review = false
    if (v === 'sell' && m0 && !held(m0, T.side) && held(m0, T.side === 'yes' ? 'no' : 'yes')) T.side = T.side === 'yes' ? 'no' : 'yes'
    if (v === 'sell' && T.tab === 'dollars') T.tab = 'shares'
    T.priceC = defaultPriceC(m0, T.act, T.side)
    T.shares = v === 'sell' && m0 ? String(held(m0, T.side) || '') : '100'
    emit()
  },
  setSide(v: Side) {
    const m0 = mk(S.mid)
    T.side = v; T.err = ''; T.review = false
    T.priceC = defaultPriceC(m0, T.act, v)
    if (T.act === 'sell' && m0) T.shares = String(held(m0, v) || '')
    emit()
  },
  setTab(v: Ticket['tab']) { T.tab = v; T.err = ''; T.review = false; T.priceC = defaultPriceC(mk(S.mid), T.act, T.side); emit() },
  setField(field: 'amount' | 'priceC' | 'shares', value: string) {
    T[field] = field === 'priceC' ? value.replace(/[^0-9.]/g, '') : value
    T.err = ''; T.review = false
    emit()
  },
  setExp(v: Ticket['exp']) { T.exp = v; emit() },
  setPostOnly(v: boolean) { T.postOnly = v; T.err = ''; emit() },
  review() { const m0 = mk(S.mid); const err = m0 ? validate(m0) : ''; T.err = err; T.review = !err; if (err) logAct('Rejected', S.mid, 'Order rejected: ' + err.replace(/\.$/, ''), null); emit() },
  edit() { T.review = false; emit() },
  mobileBuy(v: Side) { T.side = v; T.act = 'buy'; T.tab = 'dollars'; T.review = false; emit() },
}

export const ui = {
  setFilter(v: typeof S.filter) { S.filter = v; emit() },
  setCat(v: string) { S.cat = v; S.heroIdx = 0; emit() },
  setQuery(v: string) { S.q = v; emit() },
  heroStep(d: number, count: number) { S.heroIdx = ((S.heroIdx % count) + d + count) % count; S.heroHold = S.t + 20; emit() },
  heroGo(i: number) { S.heroIdx = i; S.heroHold = S.t + 20; emit() },
  setBookSide(v: Side) { S.bookSide = v; emit() },
  toggleExplain() { S.explain = !S.explain; S.explainKey = S.explain ? 'feed' : null; emit() },
  showExplain(key: string | null) { S.explainKey = key; emit() },
  toggleDemo() { S.demo = !S.demo; emit() },
  closeDemo() { S.demo = false; emit() },
  openWallet() { S.walletOpen = true; emit() },
  closeWallet() { S.walletOpen = false; emit() },
  connect(name: string) { S.wallet = name; seedPV(); S.walletOpen = false; toast('Connected ' + name + '. Demo wallet with $500 USDC on devnet; nothing real is touched.', 'yes'); emit() },
  disconnect() { S.wallet = null; S.walletOpen = false; emit() },
  reset() { init(); toast('Demo reset.', 'mut'); emit() },
  spawnNow() { spawn(); emit() },
}

/* ---------- portfolio ---------- */
/** Record something the user did; the History tab lists these newest first. */
export function logAct(kind: ActivityKind, mid: string | null, text: string, amt: number | null) {
  S.act.unshift({ t: S.t, kind, mid: mid || null, text, amt: amt == null ? null : amt })
  if (S.act.length > 300) S.act.pop()
}
export const ACT_GROUP: Record<ActivityKind, 'transfers' | 'trades' | 'orders'> = { Deposit: 'transfers', Withdraw: 'transfers', Claim: 'transfers', Buy: 'trades', Sell: 'trades', Merge: 'trades', Filled: 'trades', Order: 'orders', Cancelled: 'orders', Expired: 'orders', Refunded: 'orders', Voided: 'orders', Rejected: 'orders' }
export const ACT_BADGE: Record<ActivityKind, string> = { Deposit: 'b-live', Withdraw: 'b-mut', Claim: 'b-cur', Buy: 'b-live', Sell: 'b-mut', Merge: 'b-mut', Filled: 'b-live', Order: 'b-auc', Cancelled: 'b-mut', Expired: 'b-mut', Refunded: 'b-mut', Voided: 'b-cur', Rejected: 'b-no' }
export const FAILED_KINDS: ActivityKind[] = ['Rejected', 'Cancelled', 'Expired', 'Refunded', 'Voided']
export function heldInOrders() {
  return S.orders.filter((o) => o.act !== 'sell' && ['open', 'partial', 'queued'].includes(o.status)).reduce((s, o) => s + (o.shares - o.filled) * o.price * U * (1 + FEE.buffer), 0)
}
export type PosRow = { m: Market; id: string; side: Side; n: number; avg: number; now: number; cost: number; value: number; pl: number; settled: boolean; won: boolean; claimable: number }
/** One row per side held, like Polymarket: YES and NO of the same market are separate positions. */
export function posRows(): PosRow[] {
  const rows: PosRow[] = []
  for (const id in S.pos) {
    const m = mk(id), p = S.pos[id]
    if (!m || p.claimed) continue
    const settled = isSettled(m)
    for (const side of ['yes', 'no'] as Side[]) {
      const n = side === 'yes' ? p.yes : p.no
      if (!n) continue
      const cost = side === 'yes' ? p.cy : p.cn
      const now = settled ? (m.state === 'void' ? 0.5 : (m.outcome === side ? 1 : 0)) : m.state === 'live' ? (side === 'yes' ? bestBid(m) : r2(1 - bestAsk(m))) : (side === 'yes' ? m.mid : r2(1 - m.mid))
      const value = n * now * U
      rows.push({ m, id, side, n, avg: cost / n / U, now, cost, value, pl: value - cost, settled, won: settled && (m.state === 'void' || m.outcome === side), claimable: settled ? payout(m, p) : 0 })
    }
  }
  return rows
}
/** Cash + money held in open buy orders + positions at today's price. */
export function pvNow() { return S.bal + heldInOrders() + posRows().reduce((s, r) => s + r.value, 0) }
export function toClaim() { let s = 0; for (const id in S.pos) { const m = mk(id); if (m && isSettled(m)) s += payout(m, S.pos[id]) } return s }
function samplePV() { if (S.wallet) { S.pvHist.push({ t: S.t, v: pvNow() }); if (S.pvHist.length > 4000) S.pvHist.shift() } }
function seedPV() {
  // give the chart a short history when a wallet connects (demo only)
  const now = pvNow(), from = S.deposited
  S.pvHist = []
  for (let i = 0; i <= 120; i++) S.pvHist.push({ t: S.t - 120 + i, v: from + (now - from) * (i / 120) + (i && i < 120 ? rnd(-1.5, 1.5) : 0) })
}
export const PRANGE: [string, number][] = [['5m', 300], ['15m', 900], ['1h', 3600], ['all', Infinity]]
export function plChart() {
  const span = (PRANGE.find((r) => r[0] === S.prange) ?? PRANGE[3])[1]
  const pts = S.pvHist.filter((p) => p.t >= S.t - span)
  const W = 600, H = 120
  if (pts.length < 2) return { d: '', area: '', pl: 0, W, H }
  const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, t0 + 1)
  const lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v)), rg = Math.max(1, hi - lo)
  const X = (t: number) => ((t - t0) / (t1 - t0) * W).toFixed(1)
  const Y = (v: number) => (H - 6 - (v - lo) / rg * (H - 12)).toFixed(1)
  const d = pts.map((p) => X(p.t) + ',' + Y(p.v)).join(' ')
  return { d, area: X(t0) + ',' + H + ' ' + d + ' ' + X(t1) + ',' + H, pl: pts[pts.length - 1].v - pts[0].v, W, H }
}
export const portfolio = {
  setTab(v: PortfolioTab) { S.ptab = v; emit() },
  setRange(v: string) { S.prange = v; emit() },
  setHistory(v: HistoryFilter) { S.htype = v; emit() },
  setSearch(v: string) { S.psearch = v; emit() },
  setSort(v: PositionSort) { S.psort = v; emit() },
  openTransfer(kind: 'deposit' | 'withdraw') { S.transfer = kind; emit() },
  closeTransfer() { S.transfer = null; emit() },
  /** Move USDC between the wallet and Burbit. Returns an error message, or '' when it went through. */
  transfer(raw: string) {
    const dep = S.transfer === 'deposit'
    const amt = Math.round((parseFloat(raw) || 0) * 100) / 100
    const max = dep ? S.walletUsdc : S.bal
    const err = amt <= 0 ? 'Enter an amount.' : amt > max + 1e-9 ? (dep ? 'Your wallet only has ' + usd(max) + '.' : 'You can withdraw up to ' + usd(max) + '.') : ''
    if (err) return err
    if (dep) { S.walletUsdc -= amt; S.bal += amt; S.deposited += amt } else { S.walletUsdc += amt; S.bal -= amt; S.deposited -= amt }
    logAct(dep ? 'Deposit' : 'Withdraw', null, (dep ? 'Deposited from ' : 'Withdrew to ') + S.wallet, dep ? amt : -amt)
    S.transfer = null
    toast((dep ? 'Deposited ' : 'Withdrew ') + '<span class="mono">' + usd(amt) + '</span> ' + (dep ? 'into Burbit.' : 'to your wallet.'), dep ? 'yes' : 'info')
    samplePV()
    emit()
    return ''
  },
  maxTransfer() { return (S.transfer === 'deposit' ? S.walletUsdc : S.bal).toFixed(2) },
  cancelAll() { S.orders.filter((o) => ['open', 'partial', 'queued'].includes(o.status)).forEach((o) => cancel(o.id)) },
  goToClaims() { S.ptab = 'positions'; S.psort = 'settle'; emit() },
  /** Open a market with the trade panel set to sell this position. */
  sellPosition(id: string, side: Side) {
    const m0 = mk(id)
    T.act = 'sell'; T.side = side; T.tab = 'shares'; T.review = false
    T.shares = String((m0 && held(m0, side)) || '')
    emit()
  },
}

/* ---------- demo controls (presentation only, not part of the product) ---------- */
export function demoAction(v: string) {
  let m = mk(S.mid); if (!m) return
  if (m.follow && (v === 'pump' || v === 'dump' || v === 'grad')) m = mk(m.follow) as Market
  if (v === 'uncross' && m.state === 'auction') { m.auctionEnd = S.t; uncross(m) }
  if (v === 'pump') { m.pct = clamp(m.pct + 8, 0, m.type === 'grad' ? 99.6 : 99.5); m.mid = r2(clamp(fair(m), 0.02, 0.98)); toast('$' + m.tick + ' surged on ' + m.launchpad + ': buyers poured in.', 'cur') }
  if (v === 'dump') { m.pct = clamp(m.pct - 10, 40, 100); m.mid = r2(clamp(fair(m), 0.02, 0.98)); toast('Insiders sold: $' + m.tick + ' dropped on ' + m.launchpad + '.', 'no') }
  if (v === 'grad') { if (m.state === 'auction') m.state = 'live'; graduate(m) }
  if (v === 'fill') { m.oi = cap(m); m.trades.unshift({ t: S.t, side: 'BUY YES', p: bestAsk(m), n: 200, kind: 'MINT' }); toast('$' + m.tick + ' reached its maximum market size of <span class="mono">' + usd(cap(m)) + '</span>. No new pairs can be created.', 'cur') }
  if (v === 'close') { m.closeAt = S.t; halt(m, 'close'); toast('Trading closed on $' + m.tick + '. It still settles YES if the token graduates before the deadline.', 'mut') }
  if (v === 'deadline') { if (m.state === 'live') halt(m, 'close'); m.deadlineAt = S.t; resolve(m, 'no') }
  if (v === 'void') voidM(m)
  if (v === 'rug') { if (m.state === 'live' || m.state === 'auction') halt(m, 'rug'); resolve(m, 'yes'); toast(m.type === 'bonded' ? 'The dev withdrew their bag from escrow. That is the rug: YES holders are paid from the ' + usd(m.bond ?? 0) + ' bond.' : 'The dev wallet sold over half its bag. Settled YES from its token balance.', 'no') }
  emit()
}

export const countdown = (m: Market) => mmss(m.closeAt - S.t)

init()
setSpeed(1)

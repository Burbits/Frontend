import { useEffect, useLayoutEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Ident, SrcMark, TypeTag } from '../components/burbit/bits'
import { MarketChart } from '../components/burbit/charts'
import TradeTicket from '../components/burbit/TradeTicket'
import {
  BASE, S, SOLUSD, U, bestAsk, bestBid, book, cancel, cap, claim, feeOf, isFull, isOpen, isSettled, merge, mk, payout, posValue,
  question, raised, sellAll, setView, shortQ, ticket, ui,
} from '../sim/engine'
import { cents, clock, hm, mmss, r2, sgn, usd } from '../sim/format'
import type { Market, Order } from '../sim/types'
import { useOpenMarket, useSim } from '../sim/useSim'
import NotFoundPage from './NotFoundPage'

export default function MarketPage() {
  useSim()
  const { marketId } = useParams()
  const open = useOpenMarket()
  const navigate = useNavigate()
  // Record the open market before the page paints, so a click can never act on the previous one.
  useLayoutEffect(() => { setView('market', marketId ?? null) }, [marketId])

  const m = mk(marketId)
  // The phone "Buy YES / Buy NO" bar needs extra room at the bottom of the page.
  const live = m?.state === 'live'
  useEffect(() => {
    document.body.classList.toggle('has-mobbar', !!live)
    return () => document.body.classList.remove('has-mobbar')
  }, [live])

  if (!m) return <NotFoundPage />
  const p = S.pos[m.id] || { yes: 0, no: 0, cy: 0, cn: 0 }

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <button onClick={() => navigate('/')}>Markets</button>
        <span>/</span>
        <button onClick={() => { ui.setCat(m.launchpad); navigate('/') }}>{m.launchpad}</button>
        <span>/</span>
        <span style={{ color: 'var(--tx)' }}>${m.tick}</span>
      </nav>
      <div className="mk">
        <div className="mk-l">
          <Head m={m} />
          <div id="r-banner"><Banner m={m} /></div>
          <div id="r-event"><Siblings m={m} open={open} /></div>
          <div className="mrow">
            <section className="panel pad" data-x="odds"><Odds m={m} /></section>
            <section className="panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }} data-x="chart">
              <MarketChart m={m} />
            </section>
          </div>
          <section className="panel mstats">
            <div data-x="odds"><b className="mono">{m.state === 'live' ? cents(bestAsk(m)) + ' / ' + cents(r2(1 - bestBid(m))) : '—'}</b><span>Yes / No price</span></div>
            <div><b className="mono">{usd(m.volSol)}</b><span>volume</span></div>
            <div data-x="oi"><b className="mono">{m.oi.toFixed(2)} / {cap(m).toFixed(2)}</b><span>market size / max</span></div>
            <div data-x="countdown"><b className="mono">{clock(BASE + m.deadlineAt).slice(0, 5)}</b><span>deadline · closes {hm(BASE + m.closeAt)}</span></div>
            <div data-x="source"><b>{m.launchpad}</b><span>event source</span></div>
          </section>
          <div id="r-extra"><Extra m={m} /></div>
          <div className="mrow2">
            <section className="panel bk" data-x="book"><Book m={m} /></section>
            <section className="panel bk" data-x="trades"><Trades m={m} /></section>
          </div>
        </div>
        <div className="mk-r">
          <section className="panel" id="r-ticket"><TradeTicket m={m} /></section>
          <section className="panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }} data-x="pos">
            <PositionBox m={m} p={p} />
          </section>
          {S.wallet && (
            <section className="panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }} data-x="orders">
              <h2 className="h2">YOUR ORDERS</h2>
              <MyOrders m={m} />
            </section>
          )}
          <section className="panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }} data-x="oi"><MarketSize m={m} /></section>
          <section className="rules" data-x="rules"><Rules m={m} /></section>
        </div>
      </div>
      {live && (
        <div className="mobbar" id="mobbar">
          <button className="btn solid-yes" onClick={() => { ticket.mobileBuy('yes'); document.getElementById('r-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
            Buy YES <span className="mono">{cents(bestAsk(m))}</span>
          </button>
          <button className="btn solid-no" disabled={m.type === 'bonded'} onClick={() => { ticket.mobileBuy('no'); document.getElementById('r-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
            Buy NO <span className="mono">{cents(r2(1 - bestBid(m)))}</span>
          </button>
        </div>
      )}
    </>
  )
}

function Head({ m }: { m: Market }) {
  const tleft = m.state === 'auction' ? m.auctionEnd - S.t : m.state === 'live' ? m.closeAt - S.t : m.state === 'halted' && m.halt === 'close' ? m.deadlineAt - S.t : 0
  const tlabel = m.state === 'auction' ? 'auction ends · then trading' : m.state === 'live' ? 'until trading closes · ' + hm(BASE + m.closeAt) : m.state === 'halted' && m.halt === 'close' ? 'until the deadline · ' + hm(BASE + m.deadlineAt) : ''
  return (
    <div className="mhead">
      <Ident m={m} size={56} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
        <div className="meta">
          <span className="mono" style={{ fontWeight: 600, color: 'var(--tx)', fontSize: 13 }}>${m.tick}</span>
          <span>{m.name}</span>
          <TypeTag m={m} />
          <span>·</span><SrcMark m={m} />
          <span>·</span><span>dev <span className="mono">{m.dev}</span></span>
          <span>·</span><span>mint <span className="mono">{m.mint}</span></span>
        </div>
        <h1>{question(m)}</h1>
      </div>
      <div className="timer" data-x="countdown">
        <span data-x="state"><Badge m={m} /></span>
        {tleft > 0 && (
          <>
            <b style={{ color: tleft < 60 && m.state === 'live' ? 'var(--no)' : 'var(--tx)' }}>{mmss(tleft)}</b>
            <span className="fnt" style={{ fontSize: 11 }}>{tlabel}</span>
          </>
        )}
      </div>
    </div>
  )
}

function Banner({ m }: { m: Market }) {
  const pay = payout(m, S.pos[m.id])
  if (m.state === 'auction')
    return (
      <div className="banner bn-auc" data-x="auction">
        <span className="badge b-auc"><i />AUCTION</span>
        <span className="t"><strong>Opening auction · {mmss(m.auctionEnd - S.t)} left.</strong> Orders are collected, nothing fills yet. When the timer ends everyone who crosses fills at one clearing price, so arriving first gives no edge. Indicative price: <span className="mono">{m.mid.toFixed(2)}</span>.</span>
      </div>
    )
  if (m.state === 'halted' && m.halt === 'grad')
    return (
      <div className="banner bn-cur">
        <span className="badge b-cur"><i />HALTED</span>
        <span className="t"><strong>${m.tick} graduated on {m.launchpad}.</strong> The next instruction that touched this market halted it and refunded every resting order. Settling YES…</span>
      </div>
    )
  if (m.state === 'halted')
    return (
      <div className="banner bn-mut">
        <span className="badge b-mut"><i />HALTED</span>
        <span className="t"><strong>Trading closed at {hm(BASE + m.closeAt)}.</strong> Resting orders were refunded. {m.type === 'grad' ? 'Settles YES if the token graduates before ' + clock(BASE + m.deadlineAt) + ', NO otherwise.' : 'Settles at ' + clock(BASE + m.deadlineAt) + ' from the dev wallet\'s balance.'}</span>
      </div>
    )
  if (m.state === 'resolved')
    return (
      <div className={'banner ' + (m.outcome === 'yes' ? 'bn-yes' : 'bn-no')}>
        <span className={'badge ' + (m.outcome === 'yes' ? 'b-live' : 'b-no')}><i />SETTLED {(m.outcome || '').toUpperCase()}</span>
        <span className="t"><strong>{m.outcome === 'yes' ? (m.type === 'grad' ? 'Graduated. YES wins.' : 'The dev pulled the bag. YES wins.') : (m.type === 'grad' ? 'The deadline passed before the token graduated. NO wins.' : 'No rug before the deadline. NO wins.')}</strong> Each winning share redeems for $1.</span>
        {pay > 0 && <button className="btn solid-cur" onClick={() => claim(m.id)}>Claim {usd(pay)}</button>}
      </div>
    )
  if (m.state === 'void')
    return (
      <div className="banner bn-mut" data-x="void">
        <span className="badge b-mut"><i />VOID</span>
        <span className="t"><strong>The launchpad account couldn't be read</strong> (its layout changed), so Burbit refused to settle it. Every YES and every NO share redeems for 50¢, so each pair gets its full $1 back.</span>
        {pay > 0 && <button className="btn" onClick={() => claim(m.id)}>Redeem {usd(pay)}</button>}
      </div>
    )
  if (isFull(m))
    return (
      <div className="banner bn-cur" data-x="oi">
        <span className="badge b-cur"><i />FULL</span>
        <span className="t"><strong>This market has reached its maximum size.</strong> No new YES+NO pairs can be created until someone merges or the limit moves. You can still buy shares that others sell, sell, and merge.</span>
      </div>
    )
  return null
}

function Siblings({ m, open }: { m: Market; open: ReturnType<typeof useOpenMarket> }) {
  const sib = S.markets.filter((x) => x.tick === m.tick)
  if (sib.length < 2) return null
  return (
    <section className="panel evlist" data-x="event">
      <div className="evlist-h">
        <h2 className="h2">MARKETS ON ${m.tick}</h2>
        <span className="mut" style={{ fontSize: 12 }}>{sib.length} markets · pick one to trade</span>
      </div>
      {sib.map((x) => {
        const settled = isSettled(x), live = x.state === 'live'
        const ya = live ? bestAsk(x) : r2(x.mid), na = live ? r2(1 - bestBid(x)) : r2(1 - x.mid)
        return (
          <div key={x.id} className={'evline' + (x.id === m.id ? ' on' : '')}>
            <button className="evname" onClick={() => open(x.id)}>
              <b>{shortQ(x)}</b>
              <span className="mono mut" style={{ fontSize: 11 }}>{usd(x.volSol)} vol · {isOpen(x) ? 'closes ' + hm(BASE + x.closeAt) : settled ? 'settled' : 'halted'}</span>
            </button>
            <span className="mono evpct">
              {settled
                ? <span className={x.outcome === 'yes' ? 'c-yes' : x.outcome === 'no' ? 'c-no' : 'mut'}>{(x.outcome || '').toUpperCase()}</span>
                : (x.state === 'auction' ? '~' : '') + Math.round(x.mid * 100) + '%'}
            </span>
            {settled || x.state === 'halted' ? (
              <><span /><span /></>
            ) : (
              <>
                <button className="mini y" onClick={() => open(x.id, 'yes')}>Buy Yes {cents(ya)}</button>
                <button className="mini n" onClick={() => open(x.id, 'no')}>Buy No {cents(na)}</button>
              </>
            )}
          </div>
        )
      })}
    </section>
  )
}

function Odds({ m }: { m: Market }) {
  const settled = isSettled(m)
  const yp = settled ? (m.state === 'void' ? 50 : m.outcome === 'yes' ? 100 : 0) : Math.round(m.mid * 100)
  const ch = m.clear != null && !settled ? Math.round((m.mid - m.clear) * 100) : null
  const auc = m.state === 'auction' ? '~' : ''
  return (
    <>
      <div className="oddsbig">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="lbl" style={{ color: 'var(--yes)' }}>YES{m.type === 'bonded' ? ' · RUG' : ''}</span>
          <span className="y">{auc + yp}%</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span className="lbl" style={{ color: 'var(--no)' }}>NO</span>
          <span className="n">{auc + (100 - yp)}%</span>
        </div>
      </div>
      <div className="split"><div style={{ width: yp + '%', background: 'var(--yes)' }} /><div style={{ flex: 1, background: 'var(--no)' }} /></div>
      <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--mut)' }}>
        <span>{m.state === 'live' ? 'bid ' + cents(bestBid(m)) + ' · ask ' + cents(bestAsk(m)) : m.state === 'auction' ? 'indicative, not traded' : settled ? 'final' : 'last ' + m.mid.toFixed(2)}</span>
        {ch != null && <span className={ch >= 0 ? 'c-yes' : 'c-no'}>{(ch >= 0 ? '+' : '−') + Math.abs(ch)} since auction</span>}
      </div>
    </>
  )
}

function Extra({ m }: { m: Market }) {
  if (m.type === 'bonded') {
    const bag = (m.bagTokens ?? 0) * (raised(m.pct) + 30) / ((1073 - m.pct / 100 * 793.1) * 1e6) * SOLUSD
    const cov = (m.bond ?? 0) / bag
    return (
      <section className="panel pad" data-x="bonded" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 className="h2" style={{ color: 'var(--cur)' }}>CREATOR BOND</h2>
          <span className="tag" style={{ color: 'var(--cur)', borderColor: 'rgba(230,0,0,.4)' }}>BONDED</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
          <div className="kv" style={{ textAlign: 'left' }}><b>{usd(m.bond ?? 0)}</b><span>bond posted</span></div>
          <div className="kv" style={{ textAlign: 'left' }}><b>{usd(bag)}</b><span>bag worth now</span></div>
          <div className="kv" style={{ textAlign: 'left' }}><b className={cov >= 1 ? 'c-yes' : 'c-no'}>{cov.toFixed(2)}×</b><span>coverage</span></div>
        </div>
        <p style={{ fontSize: 12, lineHeight: '18px', color: 'var(--mut)' }}>The dev locked their bag in Burbit's escrow and wrote this market. YES is protection: if they take the bag back before 19:00, YES holders are paid $1 per share from the bond. Only the dev holds NO.</p>
      </section>
    )
  }
  if (m.type === 'rug')
    return (
      <div className="banner bn-no" data-x="openrug">
        <span className="badge b-no"><i />SMALL MAX</span>
        <span className="t">Open rug market. It settles from the dev wallet's token balance, which the dev could move from a second wallet, so its maximum size stays at $75.</span>
      </div>
    )
  return null
}

function Book({ m }: { m: Market }) {
  const bk = book(m)
  const mx = Math.max(1, ...bk.asks.map((x) => x.s), ...bk.bids.map((x) => x.s))
  const bookLive = m.state === 'live' || m.state === 'auction'
  const noView = S.bookSide === 'no'
  const flip = (l: { p: number; s: number; you: number }) => ({ p: r2(1 - l.p), s: l.s, you: l.you })
  const asks = noView ? bk.bids.map(flip) : bk.asks
  const bids = noView ? bk.asks.map(flip) : bk.bids
  const bA = asks.length ? asks[0].p : 0, bB = bids.length ? bids[0].p : 0
  const side = noView ? 'NO' : 'YES'
  const Level = ({ l, ask }: { l: { p: number; s: number; you: number }; ask: boolean }) => (
    <div className="lvl">
      <span className="d" style={{ width: Math.round(l.s / mx * 100) + '%', background: ask ? 'rgba(230,0,0,0.07)' : 'rgba(11,143,80,0.10)' }} />
      <span style={{ color: ask ? '#C81E1E' : 'var(--yes)' }}>{cents(l.p)}{l.you ? <span className="you">YOU</span> : null}</span>
      <span style={{ textAlign: 'right' }}>{l.s}</span>
      <span style={{ textAlign: 'right', color: 'var(--mut)' }}>{usd(l.p * l.s * U)}</span>
    </div>
  )
  return (
    <>
      <div className="bk-h">
        <h2 className="h2">ORDER BOOK</h2>
        <div className="bkseg" role="group" aria-label="Show the order book for">
          <button className="y" aria-pressed={!noView} onClick={() => ui.setBookSide('yes')}>Trade Yes</button>
          <button className="n" aria-pressed={noView} onClick={() => ui.setBookSide('no')}>Trade No</button>
        </div>
      </div>
      {bookLive ? (
        <>
          <div className="lvl" style={{ font: '600 10px var(--sans)', letterSpacing: '.06em', color: 'var(--fnt)', paddingTop: 0 }}>
            <span>PRICE ({side})</span><span style={{ textAlign: 'right' }}>SHARES</span><span style={{ textAlign: 'right' }}>TOTAL</span>
          </div>
          <div className="lbl" style={{ padding: '2px 16px', color: '#C81E1E' }}>Asks · people selling {side}</div>
          {asks.slice(0, 5).reverse().map((l) => <Level key={'a' + l.p} l={l} ask />)}
          <div className="spread">
            <span>{m.state === 'auction' ? 'auction: orders wait, nothing matches' : 'spread ' + (bA - bB).toFixed(2)}</span>
            <span>last {(noView ? r2(1 - m.mid) : m.mid).toFixed(2)}</span>
          </div>
          {bids.slice(0, 5).map((l) => <Level key={'b' + l.p} l={l} ask={false} />)}
          <div className="lbl" style={{ padding: '2px 16px', color: 'var(--yes)' }}>Bids · people buying {side}</div>
        </>
      ) : (
        <div className="empty" style={{ margin: '0 16px', padding: 20, fontSize: 13 }}>Book closed. Every resting order was cancelled and returned at halt.</div>
      )}
    </>
  )
}

const KIND_STYLE: Record<string, React.CSSProperties | undefined> = {
  MINT: { color: 'var(--cur)', borderColor: 'rgba(230,0,0,.35)' },
  AUCTION: { color: 'var(--info)', borderColor: 'rgba(71,85,105,.35)' },
}

function Trades({ m }: { m: Market }) {
  return (
    <>
      <div className="bk-h"><h2 className="h2">TRADES</h2><span>mint = new pair · merge = pair burned</span></div>
      <div className="trow hd"><span>TIME</span><span>SIDE</span><span>PRICE</span><span style={{ textAlign: 'right' }}>SHARES</span><span style={{ textAlign: 'right' }}>KIND</span></div>
      {m.trades.length ? (
        m.trades.slice(0, 11).map((t, k) => (
          <div key={k + '-' + t.t} className="trow" style={t.you ? { background: 'rgba(230,0,0,.06)' } : undefined}>
            <span className="mut">{clock(BASE + t.t)}</span>
            <span style={{ color: t.side.includes('YES') ? 'var(--yes)' : t.side.includes('NO') ? 'var(--no)' : 'var(--info)' }}>{t.side}</span>
            <span>{cents(t.p)}</span>
            <span style={{ textAlign: 'right' }}>{t.n}{t.you && <> <span className="px" style={{ fontSize: 9, color: 'var(--cur)' }}>YOU</span></>}</span>
            <span style={{ justifySelf: 'end', ...KIND_STYLE[t.kind] }} className="tag">{t.kind}</span>
          </div>
        ))
      ) : (
        <div className="empty" style={{ margin: '0 16px', padding: 20, fontSize: 13 }}>No trades yet. The auction hasn't cleared.</div>
      )}
    </>
  )
}

function PositionBox({ m, p }: { m: Market; p: { yes: number; no: number; cy: number; cn: number; claimed?: boolean } }) {
  const settled = isSettled(m)
  const val = posValue(m, p), cost = p.cy + p.cn, pl = val - cost
  const has = p.yes + p.no > 0 && !p.claimed
  const pay = payout(m, p)
  const pairs = Math.min(p.yes, p.no)
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 className="h2">YOUR POSITION</h2>
        {has && !settled && (
          <span className={'mono ' + (pl >= 0 ? 'c-yes' : 'c-no')} style={{ fontSize: 12 }}>
            {sgn(pl)}{cost > 0 ? ' · ' + (pl >= 0 ? '+' : '−') + Math.abs(Math.round(pl / cost * 100)) + '%' : ''}
          </span>
        )}
      </div>
      {!S.wallet ? (
        <span className="mut" style={{ fontSize: 13 }}>Connect a wallet to trade.</span>
      ) : !has ? (
        <span className="mut" style={{ fontSize: 13 }}>{p.claimed ? 'Claimed. Nothing left in this market.' : 'No shares in this market yet.'}</span>
      ) : (
        <>
          <div className="mono" style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13 }}>
            <span>
              {p.yes ? <span className="c-yes">{p.yes} YES</span> : null}
              {p.yes && p.no ? ' + ' : null}
              {p.no ? <span className="c-no">{p.no} NO</span> : null}
            </span>
            <span className="mut" style={{ fontSize: 12 }}>
              {p.yes ? 'YES avg ' + (p.cy / p.yes / U).toFixed(2) : ''}{p.yes && p.no ? ' · ' : ''}{p.no ? 'NO avg ' + (p.cn / p.no / U).toFixed(2) : ''}
              {settled ? '' : ' · worth ' + usd(val)}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {m.state === 'live' && p.yes > 0 && (
              <button className="btn" data-x="cashout" onClick={() => sellAll('yes')}>Sell all {p.yes} YES · {usd(p.yes * bestBid(m) * U - feeOf(p.yes, bestBid(m)))}</button>
            )}
            {m.state === 'live' && p.no > 0 && (
              <button className="btn" data-x="cashout" onClick={() => sellAll('no')}>Sell {p.no} NO · {usd(p.no * (1 - bestAsk(m)) * U - feeOf(p.no, bestAsk(m)))}</button>
            )}
            {pairs > 0 && !settled && <button className="btn" data-x="merge" onClick={merge}>Merge {pairs} pairs → {usd(pairs * U)}</button>}
            {settled && pay > 0 && <button className="btn solid-cur" onClick={() => claim(m.id)}>{m.state === 'void' ? 'Redeem ' : 'Claim '}{usd(pay)}</button>}
            {settled && pay === 0 && <span className="mut" style={{ fontSize: 12 }}>These shares lost. Nothing to claim.</span>}
            {m.state === 'halted' && <span className="mut" style={{ fontSize: 12 }}>Trading halted. You can still merge pairs; claim opens at settlement.</span>}
          </div>
        </>
      )}
    </>
  )
}

const ORDER_STATUS: Record<Order['status'], [string, string]> = {
  open: ['OPEN', 'b-live'], partial: ['PARTIAL', 'b-live'], queued: ['IN AUCTION', 'b-auc'], filled: ['FILLED', 'b-mut'],
  voided: ['VOIDED', 'b-cur'], refunded: ['REFUNDED', 'b-mut'], cancelled: ['CANCELLED', 'b-mut'], expired: ['EXPIRED', 'b-mut'],
}

export function OrderRow({ o, showTicker }: { o: Order; showTicker?: boolean }) {
  const m = mk(o.mid)
  const st = ORDER_STATUS[o.status]
  const canCancel = ['open', 'partial', 'queued'].includes(o.status)
  return (
    <div className="orow">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span className="mono">
          <span className="mut">{o.act.toUpperCase()}</span> <span className={o.side === 'yes' ? 'c-yes' : 'c-no'}>{o.side.toUpperCase()}</span> {o.filled}/{o.shares} @ {cents(o.price)}
          {showTicker && m && <> <span className="mut">${m.tick}</span></>}
        </span>
        <span className="mut" style={{ fontSize: 11 }}>{o.note ? o.note : 'limit order'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={'badge ' + st[1]}><i />{st[0]}</span>
        {canCancel && <button className="btn ghost" style={{ height: 28, padding: '0 8px', fontSize: 12 }} onClick={() => cancel(o.id)}>Cancel</button>}
      </div>
    </div>
  )
}

function MyOrders({ m }: { m: Market }) {
  const mine = S.orders.filter((o) => o.mid === m.id)
  if (!mine.length) return <span className="mut" style={{ fontSize: 13 }}>No orders. "Set your odds" places one.</span>
  return <div className="olist">{mine.slice(0, 6).map((o) => <OrderRow key={o.id} o={o} />)}</div>
}

function MarketSize({ m }: { m: Market }) {
  const c = cap(m), n = 24, filled = Math.round(n * Math.min(1, m.oi / Math.max(c, 0.001)))
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 className="h2">MARKET SIZE</h2>
        <span className="mono" style={{ fontSize: 13 }}>{m.oi.toFixed(2)} <span className="fnt">/ {usd(c)} max</span></span>
      </div>
      <div className="blocks" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${n},minmax(0,1fr))` }}>
        {Array.from({ length: n }, (_, i) => (
          <span key={i} style={{ height: 8, background: i < filled ? (isFull(m) ? 'var(--cur)' : 'var(--tx2)') : 'var(--empty)' }} />
        ))}
      </div>
      <p style={{ fontSize: 12, lineHeight: '18px', color: 'var(--mut)' }}>
        {m.type === 'grad'
          ? 'USDC locked in this market. The max is a safety limit that keeps rigging the result more expensive than it could pay.'
          : m.type === 'bonded'
            ? 'The max is the creator\'s bond, so every YES share is fully paid if the dev rugs.'
            : 'The max stays small because the dev could decide this from another wallet.'}
      </p>
    </>
  )
}

function Rules({ m }: { m: Market }) {
  const dl = clock(BASE + m.deadlineAt)
  return (
    <>
      <h2 className="h2" style={{ color: 'var(--tx)' }}>HOW THIS SETTLES</h2>
      {m.type === 'grad' ? (
        <>
          <span><span className="c-yes" style={{ fontWeight: 600 }}>YES</span> the moment ${m.tick} graduates on {m.launchpad} before {dl}.</span>
          <span><span className="c-no" style={{ fontWeight: 600 }}>NO</span> if {dl} passes first. Trading stops 5 minutes earlier, at {clock(BASE + m.closeAt)}.</span>
          <span>Read straight from {m.launchpad}'s on-chain data. No oracle, no vote. The dev wallet can't trade this market.</span>
        </>
      ) : m.type === 'bonded' ? (
        <>
          <span><span className="c-yes" style={{ fontWeight: 600 }}>YES</span> in the same instruction the dev takes their bag out of escrow before {dl}.</span>
          <span><span className="c-no" style={{ fontWeight: 600 }}>NO</span> if the bag is still in escrow at the deadline. The dev gets the bond back and keeps what they earned selling YES.</span>
        </>
      ) : (
        <>
          <span><span className="c-yes" style={{ fontWeight: 600 }}>YES</span> if the dev wallet's balance of ${m.tick} falls below half its launch bag before {dl}.</span>
          <span><span className="c-no" style={{ fontWeight: 600 }}>NO</span> otherwise. Read from the dev's token account.</span>
        </>
      )}
    </>
  )
}

import { useLayoutEffect } from 'react'
import { Badge, Ident, SrcMark } from '../components/burbit/bits'
import {
  ACT_BADGE, ACT_GROUP, BASE, FAILED_KINDS, PRANGE, S, claim, claimAll, heldInOrders, mk, plChart, portfolio, posRows, pvNow, question, setView, toClaim, ui,
  type PosRow,
} from '../sim/engine'
import { cents, clock, sgn, usd } from '../sim/format'
import type { HistoryFilter, PortfolioTab, PositionSort } from '../sim/types'
import { useOpenMarket, useSim } from '../sim/useSim'
import { OrderRow } from './MarketPage'

const pct = (pl: number, base: number) => (pl >= 0 ? '+' : '−') + Math.abs(pl / base * 100).toFixed(1)

const SORTERS: Record<PositionSort, (a: PosRow, b: PosRow) => number> = {
  value: (a, b) => b.value - a.value,
  pl: (a, b) => b.pl - a.pl,
  name: (a, b) => question(a.m).localeCompare(question(b.m)),
  settle: (a, b) => Number(b.claimable > 0) - Number(a.claimable > 0) || b.value - a.value,
}
const SORTS: [PositionSort, string][] = [['value', 'Current value'], ['pl', 'Profit/Loss'], ['settle', 'Ready to claim first'], ['name', 'Market name']]
const HISTORY: [HistoryFilter, string][] = [['all', 'All'], ['trades', 'Trades'], ['orders', 'Orders'], ['failed', 'Failed & cancelled'], ['transfers', 'Deposits, withdrawals & claims']]

export default function PortfolioPage() {
  useSim()
  const open = useOpenMarket()
  useLayoutEffect(() => { setView('port') }, [])

  if (!S.wallet)
    return (
      <>
        <h1 className="px" style={{ fontSize: 26 }}>PORTFOLIO</h1>
        <div className="empty">
          Connect a wallet to see your positions, orders and history.
          <div style={{ marginTop: 14 }}><button className="btn solid-tx" onClick={ui.openWallet}>Connect wallet</button></div>
        </div>
      </>
    )

  const pv = pvNow(), plAll = pv - S.deposited, held = heldInOrders(), claimAmt = toClaim()
  const ch = plChart()
  const openOrders = S.orders.filter((o) => ['open', 'partial', 'queued'].includes(o.status))
  let rows = posRows()
  const q = S.psearch.trim().toLowerCase()
  if (q) rows = rows.filter((r) => (r.m.tick + ' ' + r.m.name + ' ' + question(r.m) + ' ' + r.side).toLowerCase().includes(q))
  rows.sort(SORTERS[S.psort])
  const tabs: [PortfolioTab, string, number][] = [['positions', 'Positions', rows.length], ['orders', 'Open orders', openOrders.length], ['history', 'History', S.act.length]]
  const up = ch.pl >= 0

  return (
    <>
      <h1 className="px" style={{ fontSize: 26 }}>PORTFOLIO</h1>
      <div className="pf-top">
        <section className="panel pf-sum" data-x="portfolio">
          <div className="pf-row">
            <div>
              <span className="lbl">Portfolio</span>
              <b className="pf-big mono">{usd(pv)}</b>
              <span className={'mono ' + (plAll >= 0 ? 'c-yes' : 'c-no')} style={{ fontSize: 12 }}>
                {sgn(plAll)} ({S.deposited ? pct(plAll, S.deposited) : '0.0'}%) all time
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="lbl">Available to trade</span>
              <b className="pf-mid mono">{usd(S.bal)}</b>
              {held > 0 && <span className="mut mono" style={{ fontSize: 12 }}>{usd(held)} held in orders</span>}
            </div>
          </div>
          <div className="pf-btns">
            <button className="btn solid-cur" onClick={() => portfolio.openTransfer('deposit')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 4v12M6 10l6 6 6-6M5 20h14" /></svg>Deposit
            </button>
            <button className="btn" onClick={() => portfolio.openTransfer('withdraw')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M5 20h14" /></svg>Withdraw
            </button>
          </div>
        </section>
        <section className="panel pf-pl" data-x="pl">
          <div className="pf-row" style={{ alignItems: 'flex-start' }}>
            <div>
              <span className="lbl"><i className="dot" style={{ background: up ? 'var(--yes)' : 'var(--no)' }} />Profit/Loss</span>
              <b className={'pf-mid mono ' + (up ? 'c-yes' : 'c-no')}>{sgn(ch.pl)}</b>
              <span className="mut" style={{ fontSize: 12 }}>{clock(BASE + S.t)} · {S.prange === 'all' ? 'since you connected' : 'last ' + S.prange}</span>
            </div>
            <div className="seg pf-range" role="group" aria-label="Chart range">
              {PRANGE.map(([k]) => (
                <button key={k} aria-pressed={S.prange === k} onClick={() => portfolio.setRange(k)}>{k.toUpperCase()}</button>
              ))}
            </div>
          </div>
          {ch.d ? (
            <svg width="100%" height="120" viewBox={`0 0 ${ch.W} ${ch.H}`} preserveAspectRatio="none" role="img" aria-label="Portfolio value over time" style={{ display: 'block' }}>
              <polygon points={ch.area} fill={up ? 'rgba(11,143,80,0.10)' : 'rgba(37,99,235,0.10)'} />
              <polyline points={ch.d} fill="none" stroke={up ? '#0B8F50' : '#2563EB'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
          ) : (
            <div className="empty" style={{ padding: 30, fontSize: 12 }}>Not enough history yet.</div>
          )}
        </section>
      </div>

      <nav className="cats pf-tabs" aria-label="Portfolio sections">
        {tabs.map(([k, l, n]) => (
          <button key={k} aria-pressed={S.ptab === k} onClick={() => portfolio.setTab(k)}>
            {l} <span className="mono fnt" style={{ fontSize: 11 }}>{n}</span>
          </button>
        ))}
      </nav>

      {S.ptab === 'positions' && (
        <>
          {claimAmt > 0 && (
            <div className="banner bn-cur pf-claimbn" data-x="claims">
              <span className="badge b-cur"><i />TO CLAIM</span>
              <span className="t"><strong>{usd(claimAmt)} from settled markets.</strong> Winning shares pay $1 each; voided markets return 50¢ per share. Claim a row below, or all at once.</span>
              <button className="btn solid-cur" onClick={claimAll}>Claim all · {usd(claimAmt)}</button>
            </div>
          )}
          <div className="pf-tools">
            <label className="pfs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
              <span className="sr">Search positions</span>
              <input id="psearch" type="search" placeholder="Search positions" value={S.psearch} onChange={(e) => portfolio.setSearch(e.target.value)} />
            </label>
            <label className="pf-sort">
              <span className="sr">Sort positions</span>
              <select id="psort" value={S.psort} onChange={(e) => portfolio.setSort(e.target.value as PositionSort)}>
                {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>
          {!rows.length ? (
            <div className="empty">{q ? `No positions match "${S.psearch}".` : 'No positions yet. Buy YES or NO on any market and it shows up here.'}</div>
          ) : (
            <div className="ptable">
              <div className="posrow hd">
                <span>Market</span><span className="h-m">Avg → now</span><span className="h-m" style={{ textAlign: 'right' }}>Value</span>
                <span className="h-m" style={{ textAlign: 'right' }}>Profit/Loss</span><span style={{ textAlign: 'right' }}>&nbsp;</span>
              </div>
              {rows.map((r) => <PositionRow key={r.id + r.side} r={r} open={open} />)}
            </div>
          )}
        </>
      )}

      {S.ptab === 'orders' && (openOrders.length ? (
        <>
          <div className="pf-tools">
            <span className="mut" style={{ fontSize: 13 }}>{openOrders.length} open order{openOrders.length > 1 ? 's' : ''} · {usd(held)} held</span>
            <div className="grow" />
            <button className="btn" onClick={portfolio.cancelAll}>Cancel all</button>
          </div>
          <div className="panel" style={{ padding: '4px 16px' }}><div className="olist">{openOrders.map((o) => <OrderRow key={o.id} o={o} showTicker />)}</div></div>
        </>
      ) : (
        <div className="empty">No open orders. Limit orders you place ("Set your odds") wait here until they fill, expire or you cancel them.</div>
      ))}

      {S.ptab === 'history' && <History open={open} />}
    </>
  )
}

function PositionRow({ r, open }: { r: PosRow; open: ReturnType<typeof useOpenMarket> }) {
  const m = r.m, sideC = r.side === 'yes' ? 'c-yes' : 'c-no', plC = r.pl >= 0 ? 'c-yes' : 'c-no'
  let action
  if (r.settled)
    action = r.won && r.claimable > 0
      ? <button className="btn solid-cur" onClick={() => claim(r.id)}>{m.state === 'void' ? 'Redeem ' : 'Claim '}{usd(r.claimable)}</button>
      : <span className="badge b-mut"><i />LOST</span>
  else if (m.state === 'live')
    action = <button className="btn" onClick={() => { open(r.id); portfolio.sellPosition(r.id, r.side) }}>Sell</button>
  else action = <span className="mut" style={{ fontSize: 12 }}>{m.state === 'auction' ? 'In auction' : 'Settling…'}</span>
  return (
    <div className={'posrow' + (r.claimable > 0 && r.won ? ' claim' : '')}>
      <button className="mcell" onClick={() => open(r.id)}>
        <Ident m={m} size={32} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span className="q" style={{ fontSize: 14, whiteSpace: 'normal' }}>{question(m)}</span>
          <span className="meta" style={{ fontSize: 12 }}>
            <span className={sideC + ' mono'} style={{ fontWeight: 600 }}>{r.n.toLocaleString('en-US')} {r.side.toUpperCase()}</span>
            <Badge m={m} />
            <SrcMark m={m} />
          </span>
        </span>
      </button>
      <span className="mono h-m" style={{ fontSize: 13 }}>{cents(r.avg)} → <b>{cents(r.now)}</b></span>
      <span className="mono h-m" style={{ textAlign: 'right', fontSize: 13 }}>{usd(r.value)}</span>
      <span className={'mono h-m ' + plC} style={{ textAlign: 'right', fontSize: 13 }}>
        {sgn(r.pl)}<br /><span style={{ fontSize: 11 }}>{r.cost ? pct(r.pl, r.cost) + '%' : ''}</span>
      </span>
      <span className="right">{action}</span>
      <span className="pm-only mono">
        <span>{cents(r.avg)} → {cents(r.now)}</span><span>{usd(r.value)}</span><span className={plC}>{sgn(r.pl)}</span>
      </span>
    </div>
  )
}

function History({ open }: { open: ReturnType<typeof useOpenMarket> }) {
  const list = S.act.filter((a) => S.htype === 'all' || (S.htype === 'failed' ? FAILED_KINDS.includes(a.kind) : ACT_GROUP[a.kind] === S.htype))
  return (
    <>
      <div className="filters" role="group" aria-label="History type" data-x="history">
        {HISTORY.map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={S.htype === k} onClick={() => portfolio.setHistory(k)}>{l}</button>
        ))}
      </div>
      {list.length ? (
        <div className="ptable">
          {list.map((a, i) => {
            const m = a.mid ? mk(a.mid) : null
            return (
              <div key={S.act.length - S.act.indexOf(a) + '-' + i} className="hrow">
                <span className="mono mut">{clock(BASE + a.t)}</span>
                <span><span className={'badge ' + ACT_BADGE[a.kind]}><i />{a.kind.toUpperCase()}</span></span>
                <span className="htext">{a.text}{m && <> <button className="hlink" onClick={() => open(m.id)}>${m.tick}</button></>}</span>
                <span className="mono" style={{ textAlign: 'right', ...(a.amt == null ? {} : { color: a.amt >= 0 ? 'var(--yes)' : 'var(--tx)' }) }}>
                  {a.amt == null ? '—' : (a.amt >= 0 ? '+' : '−') + usd(Math.abs(a.amt)).replace('−', '')}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty">Nothing here yet.</div>
      )}
    </>
  )
}

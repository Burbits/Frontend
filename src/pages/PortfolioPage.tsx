import { useEffect, type ReactNode } from 'react'
import { Badge, Ident, TypeTag } from '../components/burbit/bits'
import { S, claim, claimAll, isSettled, mk, payout, posValue, question, setView, ui } from '../sim/engine'
import { sgn, usd } from '../sim/format'
import type { Market, Position } from '../sim/types'
import { useOpenMarket, useSim } from '../sim/useSim'
import { OrderRow } from './MarketPage'

type Row = { key: string; m: Market; p: Position; cells: [ReactNode, ReactNode, ReactNode, ReactNode] }

export default function PortfolioPage() {
  useSim()
  const open = useOpenMarket()
  useEffect(() => { setView('port') }, [])

  if (!S.wallet)
    return (
      <>
        <h1 className="px" style={{ fontSize: 26 }}>PORTFOLIO</h1>
        <div className="empty">
          Connect a wallet to see your positions, orders and winnings.
          <div style={{ marginTop: 14 }}><button className="btn solid-tx" onClick={ui.openWallet}>Connect wallet</button></div>
        </div>
      </>
    )

  let claimTot = 0, openVal = 0
  const claimRows: Row[] = [], openRows: Row[] = [], doneRows: Row[] = []
  for (const id in S.pos) {
    const m = mk(id), p = S.pos[id]
    if (!m || p.yes + p.no === 0) continue
    const legs = (
      <>
        {p.yes ? <span className="c-yes">{p.yes} YES</span> : null}
        {p.yes && p.no ? ' + ' : null}
        {p.no ? <span className="c-no">{p.no} NO</span> : null}
      </>
    )
    const cost = p.cy + p.cn
    if (isSettled(m) && !p.claimed) {
      const pay = payout(m, p); claimTot += pay
      ;(pay > 0 ? claimRows : doneRows).push({
        key: id, m, p,
        cells: [legs, usd(cost), <Badge m={m} />, pay > 0
          ? <button className="btn solid-cur" onClick={() => claim(id)}>{m.state === 'void' ? 'Redeem ' : 'Claim '}{usd(pay)}</button>
          : <span className="mono c-no">{sgn(-cost)}</span>],
      })
    } else if (p.claimed) {
      doneRows.push({ key: id, m, p, cells: [legs, usd(cost), <Badge m={m} />, <span className="mono mut">claimed {usd(p.claimedAmt ?? 0)}</span>] })
    } else {
      const v = posValue(m, p); openVal += v
      openRows.push({ key: id, m, p, cells: [legs, usd(cost) + ' → ' + usd(v), <Badge m={m} />, <span className={'mono ' + (v - cost >= 0 ? 'c-yes' : 'c-no')}>{sgn(v - cost)}</span>] })
    }
  }

  const Head = ({ cols }: { cols: [string, string, string, string, string] }) => (
    <div className="prow hd">
      <span>{cols[0]}</span><span className="h-m">{cols[1]}</span><span className="h-m">{cols[2]}</span><span className="h-m">{cols[3]}</span><span style={{ textAlign: 'right' }}>{cols[4]}</span>
    </div>
  )
  const Line = ({ r }: { r: Row }) => (
    <div className="prow">
      <button className="mcell" onClick={() => open(r.m.id)}>
        <Ident m={r.m} size={28} />
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span className="meta"><span className="tk">${r.m.tick}</span><TypeTag m={r.m} /></span>
          <span className="q" style={{ fontSize: 13 }}>{question(r.m)}</span>
        </span>
      </button>
      <span className="mono h-m">{r.cells[0]}</span>
      <span className="mono h-m">{r.cells[1]}</span>
      <span className="h-m">{r.cells[2]}</span>
      <span className="right">{r.cells[3]}</span>
    </div>
  )

  return (
    <>
      <div className="feed-head" data-x="portfolio">
        <div><h1>PORTFOLIO</h1><p>Your shares, orders and winnings across every market.</p></div>
        <div className="kpis">
          <div><b>{usd(S.bal)}</b><span>USDC free</span></div>
          <div><b>{usd(openVal)}</b><span>in open positions</span></div>
          <div><b className="c-cur">{usd(claimTot)}</b><span>to claim</span></div>
        </div>
      </div>
      {claimRows.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="sec-h">
            <h2 className="h2 c-cur">READY TO CLAIM</h2>
            <button className="btn solid-cur" onClick={claimAll}>Claim all · {usd(claimTot)}</button>
          </div>
          <div className="ptable"><Head cols={['Market', 'Shares', 'Cost', 'Result', 'Payout']} />{claimRows.map((r) => <Line key={r.key} r={r} />)}</div>
        </section>
      )}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="h2">OPEN POSITIONS</h2>
        {openRows.length
          ? <div className="ptable"><Head cols={['Market', 'Shares', 'Cost → value', 'State', 'P&L']} />{openRows.map((r) => <Line key={r.key} r={r} />)}</div>
          : <div className="empty">No open positions.</div>}
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-x="orders">
        <h2 className="h2">ORDERS</h2>
        {S.orders.length
          ? <div className="panel" style={{ padding: '4px 16px' }}><div className="olist">{S.orders.map((o) => <OrderRow key={o.id} o={o} showTicker />)}</div></div>
          : <div className="empty">No orders yet.</div>}
      </section>
      {doneRows.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="h2">HISTORY</h2>
          <div className="ptable"><Head cols={['Market', 'Shares', 'Cost', 'Result', 'Outcome']} />{doneRows.map((r) => <Line key={r.key} r={r} />)}</div>
        </section>
      )}
    </>
  )
}

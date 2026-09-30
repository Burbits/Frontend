import { useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Chance, ClosesText, Ident, OddsButtons, Spark, SrcBadge, SrcMark, TypeTag } from '../components/burbit/bits'
import { HeroChart } from '../components/burbit/charts'
import {
  FT, LP, S, STATUS, cap, events, heroTop, isOpen, isSettled, movers, passes, portfolio, posRows, pvNow, question, setView, shortQ, toClaim, ui,
} from '../sim/engine'
import { cents, mmss, sgn, usd } from '../sim/format'
import type { Market } from '../sim/types'
import { useOpenMarket, useSim } from '../sim/useSim'

type Open = ReturnType<typeof useOpenMarket>

export default function MarketsPage() {
  useSim()
  const open = useOpenMarket()
  useLayoutEffect(() => { setView('feed') }, [])

  const evs = events(S.markets.filter((m) => passes(m)))
  const cnt = (f: (m: Market) => boolean) => S.markets.filter(f).length

  return (
    <div className="feed-wrap">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        {S.filter === 'active' && !S.q && <Hero open={open} />}

        <nav className="cats" aria-label="Launchpads" data-x="category">
          <button aria-pressed={S.cat === 'all'} onClick={() => ui.setCat('all')}>
            All <span className="mono fnt" style={{ fontSize: 11 }}>{cnt((m) => passes(m, 'cat'))}</span>
          </button>
          {Object.keys(LP).map((k) => (
            <button key={k} aria-pressed={S.cat === k} onClick={() => ui.setCat(k)}>
              <i className="lpi" style={{ background: LP[k][0] }}>{LP[k][1]}</i>
              {k} <span className="mono fnt" style={{ fontSize: 11 }}>{cnt((m) => m.launchpad === k && passes(m, 'cat'))}</span>
            </button>
          ))}
        </nav>

        <div className="srcrow">
          <div className="grow" />
          <div className="filters" role="group" aria-label="Status">
            {STATUS.map(([id, label]) => (
              <button key={id} className="chip" aria-pressed={S.filter === id} onClick={() => ui.setFilter(id)}>
                {label}<span>{cnt((m) => FT[id](m) && passes(m, 'status'))}</span>
              </button>
            ))}
          </div>
        </div>

        {evs.length ? (
          <div className="cards">
            {evs.map((ms) => <EventCard key={ms[0].tick} ms={ms} open={open} />)}
          </div>
        ) : (
          <div className="empty">No markets match these filters right now.</div>
        )}
      </div>

      <aside className="side">
        <SidePositions open={open} />
        <SideSettled open={open} />
        <p className="fnt" style={{ fontSize: 12, lineHeight: '18px' }}>
          Every market is Burbit's own: backed 1:1 by USDC, validated and settled from the data of the launchpad its token lives on.
        </p>
      </aside>
    </div>
  )
}

function Hero({ open }: { open: Open }) {
  const { top } = heroTop()
  if (!top.length) return null
  const i = S.heroIdx % top.length, m = top[i]
  const yp = Math.round(m.mid * 100)
  const ch = m.clear != null ? Math.round((m.mid - m.clear) * 100) : null
  const auc = m.state === 'auction'
  const sibs = S.markets.filter((x) => x.tick === m.tick && x.id !== m.id && isOpen(x))
  const mv = movers()
  return (
    <section className="hero" aria-label="Top markets right now">
      <article className="hcard" data-x="featured">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Ident m={m} size={40} />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <span className="meta" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <span className="px c-cur" style={{ fontSize: 10 }}>#{i + 1} TOP LAUNCH{S.cat === 'all' ? '' : ' ON ' + S.cat.toUpperCase()}</span>
              <TypeTag m={m} />
            </span>
            <span className="mut" style={{ fontSize: 12 }}>
              <span className="mono" style={{ color: 'var(--tx)', fontWeight: 600 }}>${m.tick}</span> · {m.name}
            </span>
          </div>
          <SrcBadge m={m} />
        </div>
        <button className="hq" onClick={() => open(m.id)}>{question(m)}</button>
        <div className="hmain">
          <div className="hodds" data-x="odds">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="big" style={{ color: yp >= 50 ? 'var(--yes)' : 'var(--tx)' }}>{(auc ? '~' : '') + yp}%</span>
              <span className="mut" style={{ fontSize: 12 }}>
                {auc ? 'indicative · auction ' + mmss(m.auctionEnd - S.t) : 'chance'}
                {ch != null && !auc && (
                  <> · <span className={'mono ' + (ch >= 0 ? 'c-yes' : 'c-no')}>{(ch >= 0 ? '+' : '−') + Math.abs(ch)} since open</span></>
                )}
              </span>
            </div>
            <OddsButtons m={m} onOpen={open} column />
          </div>
          <div data-x="chart" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="legend"><span><span style={{ width: 12, height: 2, background: 'var(--yes)' }} />YES chance</span></div>
            <div style={{ flex: 1 }}><HeroChart m={m} /></div>
          </div>
        </div>
        <div className="hstats">
          <div data-x="source"><b>{m.launchpad}</b><span>event source</span></div>
          <div><b>{usd(m.volSol)}</b><span>volume</span></div>
          <div data-x="oi"><b>{m.oi.toFixed(2)} / {cap(m).toFixed(2)}</b><span>market size / max</span></div>
          <div data-x="countdown"><b style={{ color: m.closeAt - S.t < 60 ? 'var(--no)' : 'var(--tx)' }}>{mmss(m.closeAt - S.t)}</b><span>until trading closes</span></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {sibs.length ? <span className="mut" style={{ fontSize: 12 }}>+{sibs.length} more market{sibs.length > 1 ? 's' : ''} on ${m.tick}</span> : <span />}
          <div className="hnav">
            <button className="arrow" aria-label="Previous top launch" onClick={() => ui.heroStep(-1, top.length)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <div className="dots">
              {top.map((_, k) => <button key={k} aria-label={'Show top launch ' + (k + 1)} aria-current={k === i} onClick={() => ui.heroGo(k)} />)}
            </div>
            <button className="arrow" aria-label="Next top launch" onClick={() => ui.heroStep(1, top.length)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </article>
      <aside className="movers" data-x="movers">
        <h2 className="h2" style={{ marginBottom: 6 }}>BIGGEST MOVERS</h2>
        {mv.length ? mv.map((x) => {
          const d = Math.round((x.mid - (x.clear as number)) * 100)
          return (
            <button key={x.id} className="mv" onClick={() => open(x.id)}>
              <span className="t">{question(x)}</span>
              <span className="p">{Math.round(x.mid * 100)}%</span>
              <span className="s"><SrcMark m={x} /></span>
              <span className={'d ' + (d >= 0 ? 'c-yes' : 'c-no')}>{(d >= 0 ? '▲ ' : '▼ ') + Math.abs(d)}</span>
            </button>
          )
        }) : <span className="mut" style={{ fontSize: 13 }}>Nothing moving yet.</span>}
      </aside>
    </section>
  )
}

function MarketCard({ m, open }: { m: Market; open: Open }) {
  const settled = isSettled(m)
  return (
    <article className={'card' + (m.state === 'auction' ? ' auc' : '') + (settled ? ' done' : '')}>
      <div className="ctop">
        <Ident m={m} size={32} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <span className="meta"><span className="tk">${m.tick}</span><TypeTag m={m} /></span>
          <span className="mut" style={{ fontSize: 11 }}>{m.name}</span>
        </div>
        <SrcBadge m={m} />
      </div>
      <button className="cq" onClick={() => open(m.id)}>{question(m)}</button>
      <div className="chance" data-x="odds">
        <div style={{ display: 'flex', flexDirection: 'column' }}><Chance m={m} /></div>
        {!settled && <Spark m={m} w={96} h={30} />}
      </div>
      <OddsButtons m={m} onOpen={open} />
      <div className="cfoot">
        <span className="mono">{usd(m.volSol)} vol</span>
        <span data-x="countdown"><ClosesText m={m} /></span>
        <span data-x="state"><Badge m={m} /></span>
      </div>
    </article>
  )
}

function EventCard({ ms, open }: { ms: Market[]; open: Open }) {
  if (ms.length === 1) return <MarketCard m={ms[0]} open={open} />
  const m = ms[0]
  const vol = ms.reduce((s, x) => s + x.volSol, 0)
  return (
    <article className="card" data-x="event">
      <div className="ctop">
        <Ident m={m} size={32} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <span className="meta"><span className="tk">${m.tick}</span></span>
          <span className="mut" style={{ fontSize: 11 }}>{m.name}</span>
        </div>
        <SrcBadge m={m} />
      </div>
      <div className="evq">${m.tick} · {ms.length} markets</div>
      <div className="evrows">
        {ms.map((x) => {
          const settled = isSettled(x)
          return (
            <div key={x.id} className="evrow">
              <button className="evname" onClick={() => open(x.id)}>{shortQ(x)}</button>
              <span className="mono evpct">{settled ? '' : (x.state === 'auction' ? '~' : '') + Math.round(x.mid * 100) + '%'}</span>
              {settled ? (
                <span className={'mono ' + (x.outcome === 'yes' ? 'c-yes' : x.outcome === 'no' ? 'c-no' : 'mut')}>{(x.outcome || '').toUpperCase()}</span>
              ) : (
                <>
                  <button className="mini y" disabled={x.state === 'halted'} onClick={() => open(x.id, 'yes')}>Yes</button>
                  <button className="mini n" disabled={x.state === 'halted'} onClick={() => open(x.id, 'no')}>No</button>
                </>
              )}
            </div>
          )
        })}
      </div>
      <div className="cfoot">
        <span className="mono">{usd(vol)} vol</span>
        <span><ClosesText m={m} /></span>
        <span><Badge m={m} /></span>
      </div>
    </article>
  )
}

/** Home side panel: a compact portfolio summary, the money waiting to be claimed and the biggest live positions. */
function SidePositions({ open }: { open: Open }) {
  const navigate = useNavigate()
  if (!S.wallet)
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="h2">YOUR PORTFOLIO</h2>
        <div className="pcard" style={{ gap: 10 }}>
          <span className="mut" style={{ fontSize: 13 }}>Connect a wallet to see positions and trade.</span>
          <button className="btn solid-tx" onClick={ui.openWallet}>Connect wallet</button>
        </div>
      </section>
    )
  const live = posRows().filter((r) => !r.settled), claimAmt = toClaim(), pv = pvNow(), plAll = pv - S.deposited
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-x="pos">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 className="h2">YOUR PORTFOLIO</h2>
        <button className="hlink" onClick={() => { navigate('/portfolio'); window.scrollTo(0, 0) }}>View all →</button>
      </div>
      <div className="pcard" style={{ gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="lbl">Portfolio</span>
            <b className="mono" style={{ fontSize: 20, fontWeight: 500 }}>{usd(pv)}</b>
            <span className={'mono ' + (plAll >= 0 ? 'c-yes' : 'c-no')} style={{ fontSize: 11 }}>{sgn(plAll)} all time</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span className="lbl">Available</span>
            <b className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{usd(S.bal)}</b>
          </div>
        </div>
      </div>
      {claimAmt > 0 && (
        <button className="pcard pf-claimline" onClick={() => { portfolio.goToClaims(); navigate('/portfolio'); window.scrollTo(0, 0) }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}><b className="c-cur">{usd(claimAmt)}</b> to claim from settled markets</span>
            <span className="c-cur" style={{ fontWeight: 600, fontSize: 12 }}>Claim →</span>
          </span>
        </button>
      )}
      {live.length
        ? live.sort((a, b) => b.value - a.value).slice(0, 4).map((r) => (
          <button key={r.id + r.side} className="pcard" onClick={() => open(r.id)}>
            <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12 }}>
              <span className="mono" style={{ fontWeight: 600 }}>${r.m.tick} <span className={r.side === 'yes' ? 'c-yes' : 'c-no'}>{r.n} {r.side.toUpperCase()}</span></span>
              <Badge m={r.m} />
            </span>
            <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{question(r.m)}</span>
            <span className="mono" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12 }}>
              <span>{cents(r.avg)} → {cents(r.now)}</span>
              <span className={r.pl >= 0 ? 'c-yes' : 'c-no'}>{sgn(r.pl)}</span>
            </span>
          </button>
        ))
        : <div className="empty" style={{ padding: 16, fontSize: 13 }}>No open positions yet.</div>}
    </section>
  )
}

function SideSettled({ open }: { open: Open }) {
  const done = S.markets.filter(isSettled).sort((a, b) => (b.resT || 0) - (a.resT || 0)).slice(0, 5)
  return (
    <section style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 className="h2" style={{ marginBottom: 8 }}>JUST SETTLED</h2>
      {done.map((m) => {
        const why = m.state === 'void'
          ? 'launchpad data unreadable'
          : m.outcome === 'yes'
            ? (m.type === 'grad' ? 'graduated in ' + Math.floor((m.gradIn ?? 0) / 60) + 'm ' + ((m.gradIn ?? 0) % 60) + 's' : 'dev pulled the bag')
            : (m.type === 'grad' ? 'didn\'t graduate in time' : 'dev kept the bag')
        const c = m.state === 'void' ? 'var(--mut)' : m.outcome === 'yes' ? 'var(--yes)' : 'var(--no)'
        return (
          <button key={m.id} className="srow" onClick={() => open(m.id)} style={{ background: 'none', borderLeft: 0, borderRight: 0, borderTop: 0, paddingInline: 0, textAlign: 'left' }}>
            <span><span className="mono" style={{ fontWeight: 600 }}>${m.tick}</span><span className="mut"> {why}</span></span>
            <span className="mono" style={{ fontWeight: 600, color: c }}>{m.state === 'void' ? 'VOID' : (m.outcome || '').toUpperCase()}</span>
          </button>
        )
      })}
    </section>
  )
}

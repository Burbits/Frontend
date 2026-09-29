// Small building blocks shared by every screen, ported from the prototype's render helpers.
import { BASE, LP, S, bestAsk, bestBid, cap, isFull } from '../../sim/engine'
import { cents, hash, hm, mmss, r2 } from '../../sim/format'
import type { Market, Side } from '../../sim/types'

/** Darker version of a token colour so its pixel icon reads on white. */
function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.round(v * 0.62).toString(16).padStart(2, '0')
  return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255)
}

/** 5x5 mirrored pixel icon generated from the ticker. */
export function Ident({ m, size }: { m: Market; size: number }) {
  const h = hash(m.tick)
  const cells = []
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++) {
      const sx = x < 3 ? x : 4 - x
      const on = ((h >>> (y * 3 + sx)) & 1) === 1 || (y === 2 && sx === 2)
      cells.push(<span key={y * 5 + x} style={{ background: on ? shade(m.col) : 'transparent' }} />)
    }
  return (
    <div className="ident" aria-hidden="true" style={{ width: size, height: size, padding: Math.round(size / 9) }}>
      {cells}
    </div>
  )
}

export function Badge({ m }: { m: Market }) {
  if (m.state === 'auction') return <span className="badge b-auc"><i />AUCTION {mmss(m.auctionEnd - S.t).slice(1)}</span>
  if (m.state === 'live') return isFull(m) ? <span className="badge b-cur"><i />FULL</span> : <span className="badge b-live"><i />LIVE</span>
  if (m.state === 'halted') return m.halt === 'grad' ? <span className="badge b-cur"><i />GRADUATED</span> : <span className="badge b-mut"><i />HALTED</span>
  if (m.state === 'void') return <span className="badge b-mut"><i />VOID</span>
  if (m.outcome === 'yes') return <span className={'badge ' + (m.type === 'grad' ? 'b-cur' : 'b-live')}><i />{m.type === 'grad' ? 'GRADUATED' : 'SETTLED YES'}</span>
  return <span className="badge b-mut"><i />SETTLED NO</span>
}

export function TypeTag({ m }: { m: Market }) {
  if (m.type === 'rug') return <span className="tag" style={{ color: 'var(--no)', borderColor: 'rgba(37,99,235,.35)' }}>RUG</span>
  if (m.type === 'bonded') return <span className="tag" style={{ color: 'var(--cur)', borderColor: 'rgba(230,0,0,.4)' }}>BONDED</span>
  return null
}

/** Small launchpad label: "P pump.fun". */
export function SrcMark({ m }: { m: Market }) {
  const l = LP[m.launchpad] || ['#6B7079', '?']
  return (
    <span className="src" data-x="source" title={'Launched on ' + m.launchpad}>
      <i style={{ background: l[0] }}>{l[1]}</i>
      {m.launchpad}
    </span>
  )
}

/** Boxed launchpad badge shown in a card's corner: the event's source. */
export function SrcBadge({ m }: { m: Market }) {
  const l = LP[m.launchpad] || ['#6B7079', '?']
  return (
    <span className="venue" data-x="source" title={'Event source: ' + m.launchpad}>
      <i style={{ background: l[0], color: '#FFFFFF' }}>{l[1]}</i>
      {m.launchpad}
    </span>
  )
}

type OpenFn = (id: string, side?: Side) => void

export function OddsButtons({ m, onOpen, column }: { m: Market; onOpen: OpenFn; column?: boolean }) {
  const style = column ? { flexDirection: 'column' as const } : undefined
  if (m.state === 'resolved' || m.state === 'void') {
    if (m.state === 'void')
      return (
        <div className="odds2" style={style}>
          <span className="ob vd"><span>YES</span><span className="mono">0.50</span></span>
          <span className="ob vd"><span>NO</span><span className="mono">0.50</span></span>
        </div>
      )
    const y = m.outcome === 'yes'
    return (
      <div className="odds2" style={style}>
        <span className={'ob y ' + (y ? 'win' : 'lose')}><span>YES</span><span className="mono">{y ? '1.00' : '0'}</span></span>
        <span className={'ob n ' + (!y ? 'win' : 'lose')}><span>NO</span><span className="mono">{!y ? '1.00' : '0'}</span></span>
      </div>
    )
  }
  const ind = m.state === 'auction' ? ' ind' : ''
  const tl = m.state === 'auction' ? '~' : ''
  const live = m.state === 'live'
  const ypx = live ? bestAsk(m) : r2(m.mid)
  const npx = live ? r2(1 - bestBid(m)) : r2(1 - m.mid)
  const halted = m.state === 'halted'
  return (
    <div className="odds2" data-x="odds" style={style}>
      <button className={'ob y' + ind} disabled={halted} onClick={() => onOpen(m.id, 'yes')}>
        <span>Yes</span><span className="mono">{tl + cents(ypx)}</span>
      </button>
      <button
        className={'ob n' + ind}
        disabled={halted || m.type === 'bonded'}
        title={m.type === 'bonded' ? 'Only the creator holds NO' : undefined}
        onClick={() => onOpen(m.id, 'no')}
      >
        <span>No</span><span className="mono">{tl + cents(npx)}</span>
      </button>
    </div>
  )
}

export function ClosesText({ m }: { m: Market }) {
  if (m.state === 'auction' || m.state === 'live') {
    const s = m.closeAt - S.t
    return <span className="mono" style={{ color: s < 60 ? 'var(--no)' : 'var(--tx)' }}>{mmss(s)}</span>
  }
  if (m.state === 'halted' && m.halt === 'close') return <span className="mono mut">settles {mmss(m.deadlineAt - S.t)}</span>
  if (m.state === 'halted') return <span className="mono c-cur">settling</span>
  return <span className="mono fnt">closed</span>
}

export function Spark({ m, w, h }: { m: Market; w: number; h: number }) {
  const pts = m.hist.filter((x) => x.mid != null).slice(-150) as { mid: number }[]
  if (pts.length < 2) return <svg width={w} height={h} aria-hidden="true" />
  const lo = Math.min(...pts.map((p) => p.mid)), hi = Math.max(...pts.map((p) => p.mid)), rg = Math.max(0.04, hi - lo)
  const d = pts.map((p, i) => (i / (pts.length - 1) * w).toFixed(1) + ',' + (h - 2 - (p.mid - lo) / rg * (h - 4)).toFixed(1)).join(' ')
  const up = pts[pts.length - 1].mid >= pts[0].mid
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={d} fill="none" stroke={up ? '#0B8F50' : '#2563EB'} strokeWidth="1.5" />
    </svg>
  )
}

/** Big card % chance line (or the settled result). */
export function Chance({ m }: { m: Market }) {
  const settled = m.state === 'resolved' || m.state === 'void'
  const yp = Math.round(m.mid * 100)
  if (settled)
    return m.state === 'void' ? (
      <><b className="mut">VOID</b><span>50¢ per share back</span></>
    ) : (
      <><b className={m.outcome === 'yes' ? 'c-yes' : 'c-no'}>{(m.outcome || '').toUpperCase()}</b><span>settled at {hm(BASE + (m.resT || S.t))}</span></>
    )
  return (
    <>
      <b style={{ color: yp >= 50 ? 'var(--yes)' : 'var(--tx)' }}>{(m.state === 'auction' ? '~' : '') + yp}%</b>
      <span>{m.state === 'auction' ? 'indicative · auction' : 'chance'}</span>
    </>
  )
}

export const sizeLabel = (m: Market) => m.oi.toFixed(2) + ' / ' + cap(m).toFixed(2)

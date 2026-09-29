// YES-chance charts, drawn as SVG exactly like the prototype.
import { BASE, S } from '../../sim/engine'
import { hm } from '../../sim/format'
import type { Market } from '../../sim/types'

const AXIS = { fill: '#7A7F88', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }

/** Chart in the featured (hero) card: chance since the market opened, with an area fill. */
export function HeroChart({ m }: { m: Market }) {
  const W = 600, H = 150
  const pts = m.hist.filter((h) => h.t >= (m.created ?? Infinity))
  if (pts.length < 2) return null
  const t0 = pts[0].t, t1 = Math.max(S.t, t0 + 60)
  const X = (t: number) => ((t - t0) / (t1 - t0) * W).toFixed(1)
  const mids = pts.filter((h) => h.mid != null) as { t: number; mid: number }[]
  const top = Math.max(0.5, Math.ceil((Math.max(...mids.map((h) => h.mid)) + 0.05) * 10) / 10)
  const oy = (v: number) => (H - v / top * H).toFixed(1)
  const line = mids.map((h) => X(h.t) + ',' + oy(h.mid)).join(' ')
  const area = mids.length ? X(mids[0].t) + ',' + H + ' ' + line + ' ' + X(mids[mids.length - 1].t) + ',' + H : ''
  const last = mids[mids.length - 1]
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H + 18}`} preserveAspectRatio="none" role="img" aria-label="YES chance since the market opened" style={{ display: 'block', minHeight: 150 }}>
      <line x1="0" y1="0.5" x2={W} y2="0.5" stroke="#ECEDEF" />
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#ECEDEF" />
      <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke="#DFE1E5" />
      <polygon points={area} fill="rgba(11,143,80,0.10)" />
      <polyline points={line} fill="none" stroke="#0B8F50" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {last && <rect x={Number(X(last.t)) - 4} y={Number(oy(last.mid)) - 4} width="8" height="8" fill="#0B8F50" />}
      <text x="2" y={H + 14} {...AXIS}>{hm(BASE + t0)} open</text>
      <text x={W - 30} y={H + 14} {...AXIS} fill="#0E0F11">now</text>
      <text x={W - 2} y="12" textAnchor="end" {...AXIS}>{Math.round(top * 100)}%</text>
    </svg>
  )
}

/** Market page chart: chance over the market's whole window, auction band and "trading closed" shading. */
export function MarketChart({ m }: { m: Market }) {
  const W = 900, H = 170
  const t0 = m.created != null ? Math.max(m.created, S.t - 600) : S.t - 180
  const t1 = Math.max(m.deadlineAt || S.t, S.t + 30)
  const X = (t: number) => ((t - t0) / (t1 - t0) * W).toFixed(1)
  const pts = m.hist.filter((h) => h.t >= t0)
  const midPts = pts.filter((h) => h.mid != null) as { t: number; mid: number }[]
  const top = Math.max(0.5, Math.ceil((Math.max(0, ...midPts.map((h) => h.mid)) + 0.05) * 10) / 10)
  const oy = (v: number) => (H - v / top * H).toFixed(1)
  const op = midPts.map((h) => X(h.t) + ',' + oy(h.mid)).join(' ')
  const aucEnd = m.auctionEnd != null ? Math.min(m.auctionEnd, S.t) : null
  const last = midPts[midPts.length - 1]
  const nx = X(Math.min(S.t, t1))
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div className="legend">
          <span><span style={{ width: 12, height: 2, background: 'var(--yes)' }} />YES chance</span>
          <span><span style={{ width: 10, height: 10, background: 'rgba(71,85,105,.2)' }} />Opening auction</span>
        </div>
        <span className="mono mut" style={{ fontSize: 12 }}>{hm(BASE + t0)} → {hm(BASE + t1)} deadline</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg width="100%" height="200" viewBox={`-44 0 ${W + 88} 196`} preserveAspectRatio="none" role="img" aria-label="YES chance over time" style={{ minWidth: 520, display: 'block' }}>
          {aucEnd != null && aucEnd > t0 && (
            <rect x={X(Math.max(t0, m.auctionEnd - 60))} y="0" width={(Number(X(aucEnd)) - Number(X(Math.max(t0, m.auctionEnd - 60)))).toFixed(1)} height={H} fill="rgba(71,85,105,0.10)" />
          )}
          {m.closeAt && m.closeAt < t1 && (
            <>
              <rect x={X(m.closeAt)} y="0" width={(Number(X(t1)) - Number(X(m.closeAt))).toFixed(1)} height={H} fill="rgba(139,143,152,0.06)" />
              <text x={Number(X(m.closeAt)) + 6} y="14" {...AXIS}>trading closed</text>
            </>
          )}
          <line x1="0" y1="0.5" x2={W} y2="0.5" stroke="#ECEDEF" />
          <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#ECEDEF" />
          <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke="#DFE1E5" />
          {op && <polyline points={op} fill="none" stroke="#0B8F50" strokeWidth="2" />}
          <line x1={nx} y1="0" x2={nx} y2={H} stroke="#0E0F11" strokeDasharray="2 3" />
          {last && <rect x={Number(nx) - 4} y={Number(oy(last.mid)) - 4} width="8" height="8" fill="#0B8F50" />}
          <text x="-40" y="12" {...AXIS}>{Math.round(top * 100)}%</text>
          <text x="-40" y={H / 2 + 4} {...AXIS}>{Math.round(top * 50)}%</text>
          <text x="-40" y={H} {...AXIS}>0%</text>
          <text x="0" y="190" {...AXIS}>{hm(BASE + t0)}</text>
          <text x={Number(nx) + 6} y="190" {...AXIS} fill="#0E0F11">now</text>
          <text x={W - 40} y="190" {...AXIS}>{hm(BASE + t1)}</text>
        </svg>
      </div>
    </>
  )
}

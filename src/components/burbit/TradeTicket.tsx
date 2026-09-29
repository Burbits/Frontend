// Kalshi-style trade panel: Buy/Sell, order type, YES/NO, inputs, fees and totals, review and confirm.
import { EXP, OTYPES, S, T, bestAsk, bestBid, feeLines, held, isFull, normalizeTicket, priceFor, quote, sellPx, submit, ticket, ui } from '../../sim/engine'
import { cents, r2, sgn, usd } from '../../sim/format'
import type { FeeRow } from '../../sim/engine'
import type { Market, Side, Ticket } from '../../sim/types'
import { Ident } from './bits'

export default function TradeTicket({ m }: { m: Market }) {
  normalizeTicket(m)
  return (
    <>
      <div id="r-tform"><TicketForm m={m} /></div>
      {(m.state === 'live' || m.state === 'auction') && (
        <div id="r-tsum" style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TicketSummary m={m} />
        </div>
      )}
    </>
  )
}

function TicketForm({ m }: { m: Market }) {
  if (m.state !== 'live' && m.state !== 'auction')
    return (
      <div className="tk-body">
        <span className="h2">TRADING {m.state === 'halted' ? 'HALTED' : 'OVER'}</span>
        <p className="mut" style={{ fontSize: 13, lineHeight: '20px' }}>
          {m.state === 'halted'
            ? 'No new orders. Resting orders were cancelled and returned when the market halted. Merging YES+NO pairs still works.'
            : m.state === 'void'
              ? 'This market was voided. Every share redeems for 50¢.'
              : 'This market has settled. Each winning share redeems for $1.'}
        </p>
      </div>
    )

  const buy = T.act === 'buy', auc = m.state === 'auction'
  const px = (side: Side) => (auc ? (side === 'yes' ? r2(m.mid) : r2(1 - m.mid)) : buy ? priceFor(m, side) : sellPx(m, side))
  const types: Ticket['tab'][] = auc ? ['limit'] : buy ? ['dollars', 'shares', 'limit'] : ['shares', 'limit']
  const hv = held(m, T.side)
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit() }

  const pill = (side: Side) => (
    <button
      className={'yn ' + (side === 'yes' ? 'y' : 'n')}
      aria-pressed={T.side === side}
      disabled={(side === 'no' && m.type === 'bonded') || (!buy && !held(m, side))}
      onClick={() => ticket.setSide(side)}
    >
      {side === 'yes' ? (m.type === 'bonded' ? 'PROTECTION' : 'YES') : 'NO'} {cents(px(side))}
    </button>
  )

  return (
    <>
      <div className="tk-top">
        <div className="tk-bs" role="tablist" aria-label="Buy or sell" data-x="buysell">
          <button role="tab" aria-selected={buy} onClick={() => ticket.setAct('buy')}>BUY</button>
          <button role="tab" aria-selected={!buy} disabled={auc} title={auc ? 'Nothing to sell until the auction clears' : undefined} onClick={() => ticket.setAct('sell')}>SELL</button>
        </div>
        <label className="otype" data-x={T.tab === 'limit' ? 'limit' : 'quick'}>
          <span className="sr">Order type</span>
          <select id="otype" value={T.tab} onChange={(e) => ticket.setTab(e.target.value as Ticket['tab'])}>
            {types.map((k) => <option key={k} value={k}>{OTYPES[k]}</option>)}
          </select>
        </label>
      </div>
      <div className="tk-body">
        <div className="tk-q"><Ident m={m} size={28} /><span>{m.type === 'grad' ? 'Will $' + m.tick + ' graduate within ' + m.win + ' minutes?' : m.q}</span></div>
        {auc && (
          <div className="warn" style={{ background: 'var(--info-t)', color: '#334155' }}>
            Opening auction: your order waits and fills at one clearing price when the timer ends. You never pay more than your limit.
          </div>
        )}
        <div className="ynpill">{pill('yes')}{pill('no')}</div>
        {!buy ? (
          <span className="hold">You hold <span className="mono c-yes">{held(m, 'yes')} YES</span> · <span className="mono c-no">{held(m, 'no')} NO</span></span>
        ) : m.type === 'bonded' ? (
          <span className="hold">Only the creator holds NO in a bonded market.</span>
        ) : null}

        {T.tab === 'dollars' ? (
          <>
            <div className="kfield">
              <label htmlFor="amt">Amount</label>
              <div className="kin">
                <span className="mono mut">$</span>
                <input id="amt" inputMode="decimal" autoComplete="off" value={T.amount} onKeyDown={onEnter} onChange={(e) => ticket.setField('amount', e.target.value)} />
              </div>
            </div>
            <div className="presets">
              {['5', '10', '25', '50'].map((v) => <button key={v} onClick={() => ticket.setField('amount', v)}>${v}</button>)}
            </div>
          </>
        ) : (
          <>
            <div className="kfield">
              <label htmlFor="ls">Shares</label>
              <div className="kin">
                <input id="ls" inputMode="numeric" autoComplete="off" value={T.shares} style={{ textAlign: 'right' }} onKeyDown={onEnter} onChange={(e) => ticket.setField('shares', e.target.value)} />
              </div>
            </div>
            {!buy && (
              <div className="presets" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
                {([[0.25, '25%'], [0.5, '50%'], [1, 'Max']] as [number, string][]).map(([f, l]) => (
                  <button key={l} onClick={() => ticket.setField('shares', String(Math.floor(hv * f)))}>{l}</button>
                ))}
              </div>
            )}
            <span className="kline">{buy ? 'Predictions account · ' + usd(S.bal) + ' available' : 'You can sell up to ' + hv + ' ' + T.side.toUpperCase()}</span>
          </>
        )}

        {T.tab === 'limit' && (
          <>
            <div className="kfield">
              <label htmlFor="lpc">Limit price</label>
              <div className="kin">
                <input id="lpc" inputMode="numeric" autoComplete="off" value={T.priceC} style={{ textAlign: 'right' }} onKeyDown={onEnter} onChange={(e) => ticket.setField('priceC', e.target.value)} />
                <span className="mono">¢</span>
              </div>
            </div>
            <span className="kline">
              Ask: {auc ? '—' : cents(T.side === 'yes' ? bestAsk(m) : r2(1 - bestBid(m)))} · Bid: {auc ? '—' : cents(T.side === 'yes' ? bestBid(m) : r2(1 - bestAsk(m)))}
            </span>
            <div className="kfield">
              <label htmlFor="exp">Expiration</label>
              <div className="kin">
                <select id="exp" value={T.exp} onChange={(e) => ticket.setExp(e.target.value as Ticket['exp'])}>
                  {(Object.keys(EXP) as Ticket['exp'][]).map((k) => <option key={k} value={k}>{EXP[k]}</option>)}
                </select>
              </div>
            </div>
            <label className="kcheck">
              <span>Submit as resting order only</span>
              <input type="checkbox" id="po" checked={T.postOnly} onChange={(e) => ticket.setPostOnly(e.target.checked)} />
            </label>
          </>
        )}

        {isFull(m) && m.state === 'live' && buy && (
          <div className="warn">Market full: no new YES+NO pairs can be created. Buys only fill against shares people are selling.</div>
        )}
      </div>
    </>
  )
}

function FeeList({ rows, color }: { rows: FeeRow[]; color: string }) {
  return (
    <dl className="sum ksum">
      {rows.map(([label, amount, style, sub]) => (
        <div key={label} className={style}>
          <dt>{label}{sub && <small>{sub}</small>}</dt>
          <dd style={style === 'pay' ? { color } : undefined}>{amount}</dd>
        </div>
      ))}
    </dl>
  )
}

function TicketSummary({ m }: { m: Market }) {
  const q = quote(m), side = T.side.toUpperCase(), buy = T.act === 'buy'
  const c = T.side === 'yes' ? 'var(--yes)' : 'var(--no)'
  const rows = feeLines(m, q)

  if (T.review && S.wallet)
    return (
      <div className="review" role="dialog" aria-label="Review order">
        <span className="h2">REVIEW {buy ? 'BUY' : 'SELL'}</span>
        <p style={{ fontSize: 15, lineHeight: '22px' }}>
          {buy ? 'Buy' : 'Sell'} <b className="mono" style={{ color: c }}>{q.n.toLocaleString('en-US')} {side}</b> at <b className="mono">{cents(q.p)}</b>{T.tab === 'limit' ? ' or better' : ''}
        </p>
        <FeeList rows={rows} color={c} />
        {buy && <span className="kline">Profit if {side} wins: <b className="mono" style={{ color: c }}>{sgn(q.n - q.n * q.p - q.fee)}</b></span>}
        {T.tab === 'limit' && <span className="kline">Expiration: {EXP[T.exp]}</span>}
        <div className="two">
          <button className="btn ghost" onClick={ticket.edit}>Edit</button>
          <button className="cta" style={{ background: c, height: 44 }} onClick={submit}>Confirm {buy ? 'buy' : 'sell'}</button>
        </div>
      </div>
    )

  return (
    <>
      <FeeList rows={rows} color={c} />
      {q.clip && <span className="err" style={{ color: 'var(--cur)' }}>{q.clip}</span>}
      {T.err && <span className="err" role="alert">{T.err}</span>}
      <button
        className="cta"
        style={{ background: S.wallet ? c : 'var(--cur)' }}
        disabled={!!S.wallet && q.n <= 0}
        onClick={S.wallet ? ticket.review : ui.openWallet}
      >
        {!S.wallet ? 'Connect wallet to trade' : 'Review ' + (buy ? 'buy' : 'sell')}
      </button>
      <span className="note" data-x="fees">Your tier: 0 · taker 2% · maker 0% (waived at launch). Fees drop as your 30-day volume grows.</span>
    </>
  )
}

// Toasts, wallet popup, explain box and demo panel: the app-level overlays from the prototype.
import { S, claim, demoAction, dismissToast, mk, setSpeed, ui } from '../../sim/engine'
import { usd } from '../../sim/format'
import { useOpenMarket } from '../../sim/useSim'
import { EXPLAIN } from './explain'

const TOAST_COLOR = { yes: 'var(--yes)', no: 'var(--no)', cur: 'var(--cur)', info: 'var(--info)', mut: 'var(--mut)' }

export function Toasts() {
  const open = useOpenMarket()
  return (
    <div id="toasts" aria-live="polite">
      {S.toasts.map((t) => (
        <div key={t.id} className="toast" style={{ borderLeftColor: TOAST_COLOR[t.kind] }}>
          <div>
            {/* Messages are built by the simulation from its own data (no user input). */}
            <span dangerouslySetInnerHTML={{ __html: t.msg }} />
            {t.action && ' '}
            {t.action && (
              <button
                className="btn ghost"
                style={{ height: 28, marginTop: 8, display: 'flex' }}
                onClick={() => {
                  const a = t.action!
                  if (a.act === 'open') open(a.id)
                  else claim(a.id)
                  dismissToast(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
          <button className="x" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}

const WALLETS: [string, string, string][] = [
  ['Phantom', '#AB9FF2', '#8A7BE0'],
  ['Solflare', '#FFC857', '#F28B30'],
  ['Backpack', '#E33E3F', '#B52A2B'],
]

export function WalletModal() {
  if (!S.walletOpen) return null
  return (
    <div id="modal" onClick={(e) => { if (e.target === e.currentTarget) ui.closeWallet() }}>
      <div className="box" role="dialog" aria-modal="true" aria-label="Connect a wallet">
        {S.wallet ? (
          <>
            <h2 className="h2">WALLET</h2>
            <p className="mono">{S.wallet}</p>
            <p className="mut" style={{ fontSize: 13 }}>{usd(S.bal)} free</p>
            <button className="btn" onClick={ui.disconnect}>Disconnect</button>
            <button className="btn ghost" onClick={ui.closeWallet}>Close</button>
          </>
        ) : (
          <>
            <h2 className="h2">CONNECT A WALLET</h2>
            <p className="mut" style={{ fontSize: 13 }}>Prototype only: pick one to get a demo wallet with $500 USDC. No real wallet is opened.</p>
            {WALLETS.map(([name, c1, c2]) => (
              <button key={name} className="wopt" onClick={() => ui.connect(name)}>
                <i style={{ background: `linear-gradient(135deg,${c1} 50%,${c2} 50%)` }} />
                {name}
                <span className="fnt" style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 12 }}>demo</span>
              </button>
            ))}
            <button className="btn ghost" onClick={ui.closeWallet}>Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}

export function ExplainDrawer() {
  if (!S.explain || !S.explainKey) return null
  const e = EXPLAIN[S.explainKey]
  if (!e) return null
  return (
    <div id="xd" role="dialog" aria-live="polite">
      <button className="close" aria-label="Close" onClick={() => ui.showExplain(null)}>✕</button>
      <h3>{e[0].toUpperCase()}</h3>
      <p>{e[1]}</p>
      <span className="hint">Explain mode is on. Click another outlined part, or turn it off in the top bar to use the app normally.</span>
    </div>
  )
}

export function DemoButton() {
  return (
    <button id="demoBtn" aria-expanded={S.demo} aria-controls="demo" onClick={ui.toggleDemo}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 4l14 8-14 8z" /></svg>
      DEMO
    </button>
  )
}

const SPEEDS: [number, string][] = [[0, 'Pause'], [1, '1×'], [4, '4×'], [12, '12×']]

export function DemoPanel() {
  const open = useOpenMarket()
  if (!S.demo) return null
  const m = S.view === 'market' ? mk(S.mid) : undefined
  const live = m?.state === 'live', a = m?.state === 'auction'
  const J = ({ id, children }: { id: string; children: string }) => <button onClick={() => open(id)}>{children}</button>
  return (
    <aside id="demo" aria-label="Demo controls">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="h2 c-cur">DEMO CONTROLS</h2>
        <span className="fnt" style={{ fontSize: 11 }}>not part of the product</span>
      </div>
      <div className="grp">
        <span className="lbl">Clock</span>
        <div className="seg" role="group" aria-label="Simulation speed">
          {SPEEDS.map(([v, l]) => <button key={v} aria-pressed={S.speed === v} onClick={() => setSpeed(v)}>{l}</button>)}
        </div>
      </div>
      {m ? (
        <div className="grp">
          <span className="lbl">This market · ${m.tick}</span>
          <div className="grid2">
            <button className="btn" disabled={!a} onClick={() => demoAction('uncross')}>End auction now</button>
            <button className="btn" disabled={!(live || a)} onClick={() => demoAction('pump')}>Token surges on launchpad</button>
            <button className="btn" disabled={!(live || a)} onClick={() => demoAction('dump')}>Token sells off on launchpad</button>
            <button className="btn" disabled={!(m.type === 'grad' && (live || a || m.state === 'halted') && m.outcome == null)} onClick={() => demoAction('grad')}>Graduate now</button>
            <button className="btn" disabled={!live} onClick={() => demoAction('fill')}>Fill to max size</button>
            <button className="btn" disabled={!live} onClick={() => demoAction('close')}>Jump to close</button>
            <button className="btn" disabled={!(m.state === 'halted' || live)} onClick={() => demoAction('deadline')}>Pass deadline</button>
            <button className="btn" disabled={m.outcome != null} onClick={() => demoAction('void')}>Launchpad layout changes</button>
            {m.type !== 'grad' && (
              <button className="btn" disabled={m.outcome != null} onClick={() => demoAction('rug')}>{m.type === 'bonded' ? 'Dev pulls bag' : 'Dev dumps bag'}</button>
            )}
          </div>
        </div>
      ) : (
        <p className="fnt" style={{ fontSize: 12 }}>Open a market to get controls for it (end auction, move the curve, graduate, void…).</p>
      )}
      <div className="grp">
        <span className="lbl">Suggested walkthrough</span>
        <ol>
          <li>Turn on <b>Explain</b> (top bar) and click any outlined part.</li>
          <li><J id="krill">$KRILL</J> is in its opening auction. Place a YES order, then <i>End auction now</i>.</li>
          <li><J id="gorp">$GORP</J>: Quick bet, then Sell (Buy/Sell tabs), then Set your odds for a limit order. Switch the order book between Trade Yes and Trade No.</li>
          <li>On $GORP press <i>Graduate now</i>: it halts, refunds orders, settles YES. Claim in Portfolio.</li>
          <li><J id="brrr">$BRRR</J> is full (max size). <J id="plank">$PLANK</J> lets you merge a YES+NO pair.</li>
          <li><J id="lumen">$LUMEN</J> is a bonded rug market. Buy protection, then <i>Dev pulls bag</i>.</li>
          <li><J id="vanta">$VANTA</J> was voided: redeem at 50¢ per share.</li>
        </ol>
      </div>
      <div className="grp">
        <div className="grid2">
          <button className="btn" onClick={ui.spawnNow}>New launch hits 70%</button>
          <button className="btn" onClick={ui.reset}>Reset demo</button>
        </div>
      </div>
    </aside>
  )
}

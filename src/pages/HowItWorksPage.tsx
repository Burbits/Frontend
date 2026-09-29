import { useEffect } from 'react'
import { SOLUSD, setView } from '../sim/engine'
import { usd } from '../sim/format'

const CAP_ROWS: [number, number][] = [[0, 19.52], [50, 13.12], [70, 8.62], [80, 5.70], [90, 2.46], [95, 0.95]]
const MINT_TAG = { color: 'var(--cur)', borderColor: 'rgba(230,0,0,.35)' }

export default function HowItWorksPage() {
  useEffect(() => { setView('how') }, [])
  return (
    <>
      <div className="feed-head">
        <div>
          <h1>HOW BURBIT WORKS</h1>
          <p>Burbit is a prediction market where every event is captured from a bonding-curve launchpad: pump.fun, Raydium LaunchLab, Pons and more. It isn't a launchpad or a curve. It reads existing launchpads and runs short YES/NO markets on what their tokens do next.</p>
        </div>
      </div>
      <div className="how">
        <section className="panel">
          <h2 className="h2">1 · THE LIFE OF A MARKET</h2>
          <div className="flow">
            <span className="badge b-mut"><i />NEAR GRADUATION</span><span className="arr">→</span>
            <span className="badge b-auc"><i />AUCTION 60S</span><span className="arr">→</span>
            <span className="badge b-live"><i />LIVE</span><span className="arr">→</span>
            <span className="badge b-mut"><i />HALTED</span><span className="arr">→</span>
            <span className="badge b-cur"><i />SETTLED</span>
          </div>
          <p>A token on a launchpad gets close to graduating. Burbit opens a market on it. For 60 seconds orders are collected, then everyone who crosses fills at one price. Trading runs until the token graduates (instant halt) or until 5 minutes before the deadline. Then anyone can call settle, and winners redeem.</p>
        </section>
        <section className="panel">
          <h2 className="h2">2 · SHARES AND PAIRS</h2>
          <p>A winning share pays <span className="mono">$1</span>; a losing share pays nothing. One YES plus one NO always pays exactly $1, so shares only exist in pairs, each backed by $1 locked in the market's vault. A price is a probability: YES at <span className="mono">0.31</span> costs 31¢ and means a 31% chance.</p>
        </section>
        <section className="panel">
          <h2 className="h2">3 · FOUR WAYS A TRADE SETTLES</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Buyer</th><th>Seller</th><th>What happens</th><th>Pairs</th></tr></thead>
              <tbody>
                <tr><td>Buy YES</td><td>Buy NO</td><td><span className="tag" style={MINT_TAG}>MINT</span> both lock USDC, a new pair is created</td><td className="mono">+1</td></tr>
                <tr><td>Buy YES</td><td>Sell YES</td><td><span className="tag">TRANSFER</span> YES changes hands</td><td className="mono">0</td></tr>
                <tr><td>Sell NO</td><td>Sell YES</td><td><span className="tag">MERGE</span> pair burned, $1 split</td><td className="mono">−1</td></tr>
                <tr><td>Buy NO</td><td>Sell NO</td><td><span className="tag">TRANSFER</span> NO changes hands</td><td className="mono">0</td></tr>
              </tbody>
            </table>
          </div>
          <p>Mint is why a market needs no market maker to start. Merge is why you can always cash out.</p>
        </section>
        <section className="panel">
          <h2 className="h2">4 · WHY IT CAN'T BE PROFITABLY RIGGED</h2>
          <p>Anyone could force a graduation YES by buying out the rest of the token's bonding curve on its launchpad. So each market's size is limited to half of that cost, which Burbit reads from the launchpad. The most an attacker can win is less than what forcing costs.</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Curve sold</th><th>Forcing cost (on the launchpad)</th><th>Max size (USDC)</th><th>Max (pairs)</th></tr></thead>
              <tbody>
                {CAP_ROWS.map(([p, f]) => (
                  <tr key={p}>
                    <td className="mono">{p}%</td>
                    <td className="mono">{f.toFixed(2)} SOL</td>
                    <td className="mono">{usd(f / 2 * SOLUSD)}</td>
                    <td className="mono">{Math.round(f / 2 * SOLUSD).toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2 className="h2">5 · LIMIT ORDERS</h2>
          <p>"Set your odds" places a limit order: buy or sell YES or NO at a price you choose, or better. If nobody matches it right away it waits on the order book until someone takes it, you cancel it, or the market halts (then it's returned in full). "Quick bet" and "Sell now" take the best price already on the book instead. Burbit never trades against you; every trade is between two users.</p>
        </section>
        <section className="panel">
          <h2 className="h2">6 · WHAT BURBIT NEVER DOES</h2>
          <p>It never creates, lists or trades tokens on a launchpad. It never takes a side or puts in its own capital; it earns trading fees: takers pay 2% of their fill value and makers 1% (waived at launch), falling with 30-day volume, and busy makers eventually earn part of the taker fee. It needs no permission from any launchpad: it reads public accounts. If an account can't be parsed, the market voids and everyone gets their collateral back.</p>
        </section>
      </div>
      <p className="fnt" style={{ fontSize: 12 }}>This is a clickable prototype with simulated data. Token names, prices and wallets are made up. Numbers for caps and forcing cost follow the Burbit v3 spec.</p>
    </>
  )
}

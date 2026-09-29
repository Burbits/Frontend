import { Link, useNavigate } from 'react-router-dom'
import { S, nowClock, ui } from '../../sim/engine'
import { usd } from '../../sim/format'
import { SearchIcon } from '../ui/icons'

export default function TopBar() {
  const navigate = useNavigate()
  return (
    <header
      className="sticky z-30 flex h-14 items-center gap-2.5 border-b border-line bg-white/94 px-4 backdrop-blur-[6px] md:gap-4 md:px-6"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <Link to="/" className="font-pixel text-lg leading-[1.45] tracking-[0.05em]" aria-label="Burbit home">
        BURBIT
      </Link>

      <label className="hidden h-9 w-[220px] items-center gap-2 rounded-sm border border-line-strong bg-surface px-3 text-muted md:flex xl:w-[340px]">
        <SearchIcon size={16} />
        <span className="sr-only">Search markets</span>
        <input
          id="q"
          type="search"
          placeholder="Search ticker or name"
          value={S.q}
          onChange={(e) => {
            ui.setQuery(e.target.value)
            if (S.view !== 'feed') navigate('/')
          }}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
        />
      </label>

      <div className="flex-1" />

      {/* Simulated clock: only exists because markets are simulated. */}
      <div className="clock" title="Simulated time">
        <b>{nowClock()}</b>
        <span>{S.paused ? 'paused' : 'simulated · ' + S.speed + '×'}</span>
      </div>

      <span className="net">DEVNET</span>

      <button className="xbtn" aria-pressed={S.explain} title="Click any outlined part to see what it is" onClick={ui.toggleExplain}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01" />
        </svg>
        <span className="lab">EXPLAIN</span>
      </button>

      {S.wallet ? (
        <>
          <span className="mono" style={{ fontSize: 13 }} data-x="wallet">
            {usd(S.bal)} <span className="mut">USDC</span>
          </span>
          <button className="wal" onClick={ui.openWallet}>
            <i />
            {S.wallet}
          </button>
        </>
      ) : (
        <button className="wal off" data-x="wallet" onClick={ui.openWallet}>
          Connect wallet
        </button>
      )}
    </header>
  )
}

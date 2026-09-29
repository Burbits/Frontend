import { Link } from 'react-router-dom'
import Logo from '../ui/Logo'
import { SearchIcon } from '../ui/icons'

export default function TopBar() {
  return (
    <header
      className="sticky z-30 flex h-14 items-center gap-4 border-b border-line bg-bg/95 px-4 backdrop-blur md:px-6"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <Link to="/" className="flex items-center gap-2.5" aria-label="Burbit home">
        <Logo size={28} className="md:hidden" />
        <span className="font-pixel text-lg tracking-[0.05em]">BURBIT</span>
      </Link>

      <label className="hidden h-9 w-[340px] items-center gap-2 rounded-sm border border-line-strong bg-surface px-3 text-muted lg:flex">
        <SearchIcon size={16} />
        <span className="sr-only">Search markets</span>
        <input
          type="search"
          placeholder="Search ticker or name"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
        />
      </label>

      <div className="flex-1" />

      {/* Wallet connection lands with the Solana wallet adapter in a later PR. */}
      <button
        type="button"
        className="h-9 rounded-sm bg-brand px-3.5 text-[13px] font-semibold text-white hover:brightness-95"
      >
        Connect wallet
      </button>
    </header>
  )
}

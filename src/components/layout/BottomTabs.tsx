import { Link, useLocation } from 'react-router-dom'
import { NAV_ITEMS, isNavActive } from './nav'

/** Phone navigation: a labelled tab bar pinned to the bottom, clear of the home indicator. */
export default function BottomTabs() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-bg/95 px-2 pt-1 backdrop-blur md:hidden"
      style={{ paddingBottom: 'calc(4px + env(safe-area-inset-bottom, 0px))' }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(item, pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={`relative flex h-[54px] flex-1 flex-col items-center justify-center gap-[3px] text-[11px] font-semibold ${
              active ? 'text-brand' : 'text-muted'
            }`}
          >
            {active && <span className="absolute -top-1 left-[28%] right-[28%] h-0.5 bg-brand" aria-hidden="true" />}
            <Icon size={20} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

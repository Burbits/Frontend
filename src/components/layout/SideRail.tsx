import { Link, useLocation } from 'react-router-dom'
import Logo from '../ui/Logo'
import { NAV_ITEMS, isNavActive } from './nav'

/** Desktop and tablet navigation. Hidden on phones, where BottomTabs takes over. */
export default function SideRail() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center gap-2 border-r border-line py-3.5 md:flex"
    >
      <Link to="/" aria-label="Burbit home" className="mb-3.5 block">
        <Logo size={36} />
      </Link>
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(item, pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-label={item.label}
            title={item.label}
            aria-current={active ? 'page' : undefined}
            className={`flex size-11 items-center justify-center rounded-[6px] transition-colors ${
              active ? 'bg-muted-bg text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <Icon size={20} />
          </Link>
        )
      })}
    </nav>
  )
}

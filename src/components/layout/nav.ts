import type { ComponentType } from 'react'
import { HowIcon, MarketsIcon, PortfolioIcon } from '../ui/icons'

export type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ size?: number }>
  /** Also highlight this tab on these path prefixes (e.g. a market page belongs to Markets). */
  alsoActiveOn?: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Markets', icon: MarketsIcon, alsoActiveOn: ['/market/'] },
  { to: '/portfolio', label: 'Portfolio', icon: PortfolioIcon },
  { to: '/how-it-works', label: 'How it works', icon: HowIcon },
]

export function isNavActive(item: NavItem, pathname: string) {
  if (item.to === '/') return pathname === '/' || (item.alsoActiveOn ?? []).some((p) => pathname.startsWith(p))
  return pathname.startsWith(item.to)
}

import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { S, ui } from '../../sim/engine'
import { useSim } from '../../sim/useSim'
import { DemoButton, DemoPanel, ExplainDrawer, Toasts, WalletModal } from '../burbit/overlays'
import BottomTabs from './BottomTabs'
import SideRail from './SideRail'
import TopBar from './TopBar'

export default function AppShell() {
  useSim()
  const explain = S.explain

  // Explain mode: outline every explainable part; a click shows what it is instead of acting.
  useEffect(() => {
    document.body.classList.toggle('explain', explain)
    if (!explain) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const x = target.closest<HTMLElement>('[data-x]')
      if (!x || target.closest('.xbtn, #xd, #demo, #demoBtn')) return
      e.preventDefault()
      e.stopPropagation()
      ui.showExplain(x.dataset.x ?? null)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [explain])

  // Escape closes the wallet popup, the explain box and the demo panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      ui.closeWallet()
      ui.showExplain(null)
      if (S.demo) ui.closeDemo()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex min-h-screen">
      <SideRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {/* Bottom padding keeps content clear of the phone tab bar. */}
        <main className="flex min-w-0 flex-col gap-[18px] px-4 pt-4 pb-[180px] md:px-6 md:pt-6 md:pb-[120px]">
          <Outlet />
        </main>
      </div>
      <BottomTabs />
      <Toasts />
      <DemoButton />
      <DemoPanel />
      <ExplainDrawer />
      <WalletModal />
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import BottomTabs from './BottomTabs'
import SideRail from './SideRail'
import TopBar from './TopBar'

export default function AppShell() {
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
    </div>
  )
}

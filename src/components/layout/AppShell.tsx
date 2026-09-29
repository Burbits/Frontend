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
        <main className="flex min-w-0 flex-col gap-5 px-4 pt-5 pb-32 md:px-6 md:pt-6 md:pb-16">
          <Outlet />
        </main>
      </div>
      <BottomTabs />
    </div>
  )
}

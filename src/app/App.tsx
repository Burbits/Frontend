import { Route, Routes } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import MarketsPage from '../pages/MarketsPage'
import MarketPage from '../pages/MarketPage'
import PortfolioPage from '../pages/PortfolioPage'
import HowItWorksPage from '../pages/HowItWorksPage'
import NotFoundPage from '../pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<MarketsPage />} />
        <Route path="market/:marketId" element={<MarketPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

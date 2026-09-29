import { useParams } from 'react-router-dom'
import PageStub from '../components/ui/PageStub'

export default function MarketPage() {
  const { marketId } = useParams()
  return (
    <PageStub
      title="MARKET"
      intro={`Market ${marketId ?? ''}: the question, its odds and everything needed to trade it.`}
      next={[
        'Header with state badge and countdown, chance and chart, stats row',
        'Order book with the Trade Yes / Trade No switch, and recent trades',
        'Trade panel: Buy/Sell, Dollars/Shares/Limit, fees and totals, review step',
        'Position, orders, market size, and how the market settles',
      ]}
    />
  )
}

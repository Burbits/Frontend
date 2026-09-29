import PageStub from '../components/ui/PageStub'

export default function MarketsPage() {
  return (
    <PageStub
      title="MARKETS"
      intro="Prediction markets on events captured from bonding-curve launchpads. Each market settles from the launchpad's own on-chain data."
      next={[
        'Featured top-launch carousel and biggest movers',
        'Launchpad categories (All · pump.fun · Raydium LaunchLab · Pons) and status filters',
        'Market cards and grouped cards for tokens with several markets',
        'Your positions and recently settled markets',
      ]}
    />
  )
}

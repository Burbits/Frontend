import PageStub from '../components/ui/PageStub'

export default function HowItWorksPage() {
  return (
    <PageStub
      title="HOW BURBIT WORKS"
      intro="Burbit is a prediction market where every event is captured from a bonding-curve launchpad. YES plus NO always equals $1, and each winning share pays $1 in USDC."
      next={['Life of a market, shares and pairs, the four ways a trade settles', 'Why markets cannot be profitably rigged, limit orders, and fees']}
    />
  )
}

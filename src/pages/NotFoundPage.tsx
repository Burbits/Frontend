import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="flex flex-col items-start gap-3">
      <h1 className="font-pixel text-[26px] leading-[30px]">PAGE NOT FOUND</h1>
      <p className="text-[13px] text-muted">This page doesn't exist, or the market has been closed.</p>
      <Link to="/" className="text-[13px] font-semibold text-brand underline underline-offset-4">
        Back to markets
      </Link>
    </section>
  )
}

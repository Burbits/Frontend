import type { ReactNode } from 'react'

type PageStubProps = {
  title: string
  intro: string
  /** The pieces of this screen still to be ported from the prototype. */
  next: string[]
  children?: ReactNode
}

/**
 * Temporary page body used while screens are ported from the prototype.
 * Each page replaces it as its real components land.
 */
export default function PageStub({ title, intro, next, children }: PageStubProps) {
  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <h1 className="font-pixel text-[26px] leading-[30px] tracking-[0.02em]">{title}</h1>
      <p className="max-w-[62ch] text-[13px] text-muted">{intro}</p>
      {children}
      <div className="rounded-md border border-dashed border-line-strong p-4">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Coming next</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] text-ink-2">
          {next.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

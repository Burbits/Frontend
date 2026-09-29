type LogoProps = { size?: number; className?: string }

/** The pixel "B" on Burbit red. Drawn as SVG so it stays crisp at any size. */
export default function Logo({ size = 36, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 1080 1080" aria-hidden="true" className={className}>
      <rect width="1080" height="1080" fill="var(--color-logo)" />
      <path
        fill="#FFFFFF"
        fillRule="evenodd"
        d="M324 162H742V176H756V189H769V203H783V216H796V458H783V472H769V486H756V499H742V513H729V526H715V540H648V621H796V635H810V877H796V891H783V904H769V918H310V904H270V216H324ZM472 243H540V324H594V525H472ZM500 688H608V836H540V769H500V756H486V702H500Z"
      />
    </svg>
  )
}

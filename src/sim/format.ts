// Number and time formatting shared by the whole app (ported from the prototype).

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const r2 = (v: number) => Math.round(v * 100) / 100

/** Seconds as mm:ss (never negative). */
export const mmss = (s: number) => {
  s = Math.max(0, Math.ceil(s))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

/** Seconds since midnight as hh:mm:ss. */
export const clock = (s: number) => {
  s = Math.floor(s)
  return [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':')
}

/** Seconds since midnight as hh:mm. */
export const hm = (s: number) => clock(s).slice(0, 5)

/** Dollars: $12.34, or $1,234 above a thousand. */
export const usd = (v: number) => {
  const a = Math.abs(v)
  return (v < -0.004 ? '−' : '') + '$' + (a >= 1000 ? Math.round(a).toLocaleString('en-US') : a.toFixed(2))
}

/** A share price (0 to 1) in cents: 0.31 -> "31¢". */
export const cents = (p: number | string) => Math.round(Number(p) * 100) + '¢'

/** Signed dollars for profit and loss: +$1.20 / −$0.40. */
export const sgn = (v: number) => (v >= 0 ? '+' : '−') + '$' + Math.abs(v).toFixed(2)

export function hash(str: string) {
  let h = 7
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export const rnd = (a: number, b: number) => a + Math.random() * (b - a)

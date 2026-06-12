export interface Tokens {
  color: { primary: string; secondary: string; bg: string; text: string; accent: string }
  font: { heading: string; body: string }
  radius: { sm: string; md: string; lg: string }
  ornament: { motif: string; divider: string }
}

export const baseTokens: Tokens = {
  color: { primary: '#8b5e3c', secondary: '#c8a97e', bg: '#faf6f0', text: '#2e2a26', accent: '#a47148' },
  font: { heading: 'Cormorant Garamond', body: 'Poppins' },
  radius: { sm: '4px', md: '8px', lg: '16px' },
  ornament: { motif: 'none', divider: 'none' },
}

// Dotted paths a customer may override on top of a theme. Everything else locks to the theme.
export const OVERRIDE_WHITELIST = ['color.primary', 'color.secondary', 'color.accent', 'font.heading', 'font.body'] as const

type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> }

function deepMerge(a: any, b: any) {
  const out: any = Array.isArray(a) ? [...a] : { ...a }
  for (const k of Object.keys(b ?? {})) {
    out[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? deepMerge(a?.[k] ?? {}, b[k]) : b[k]
  }
  return out
}

function pickWhitelisted(overrides: any) {
  const out: any = {}
  for (const path of OVERRIDE_WHITELIST) {
    const [group, key] = path.split('.') as [string, string]
    const val = overrides?.[group]?.[key]
    if (val !== undefined) (out[group] ??= {})[key] = val
  }
  return out
}

export function resolveTokens(themeTokens: DeepPartial<Tokens>, invitationOverrides: DeepPartial<Tokens>): Tokens {
  const withTheme = deepMerge(baseTokens, themeTokens ?? {})
  return deepMerge(withTheme, pickWhitelisted(invitationOverrides ?? {}))
}

export function tokensToCssVars(tokens: Tokens): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const group of Object.keys(tokens) as (keyof Tokens)[]) {
    for (const key of Object.keys(tokens[group])) {
      vars[`--${group}-${key}`] = (tokens[group] as any)[key]
    }
  }
  return vars
}

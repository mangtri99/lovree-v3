import type { Tokens } from './tokens'

export interface CuratedTheme { name: string; key?: string; tokens: Pick<Tokens, 'color' | 'font'> }

// Palette (5 colours) + font pairing per theme. Fonts are from the curated
// allow-list (server/theme/fonts.ts) so they load globally. radius/ornament fall
// back to baseTokens via resolveTokens. The first entry is the default/demo theme.
export const CURATED_THEMES: CuratedTheme[] = [
  {
    name: 'Radiant Love',
    tokens: { color: { primary: '#8b5e3c', secondary: '#c8a97e', bg: '#faf6f0', text: '#2e2a26', accent: '#a47148' }, font: { heading: 'Cormorant Garamond', body: 'Poppins' } },
  },
  {
    name: 'Rose Blush',
    tokens: { color: { primary: '#b76e79', secondary: '#e8b4bc', bg: '#fdf6f7', text: '#3a2c2e', accent: '#d98b96' }, font: { heading: 'Playfair Display', body: 'Lora' } },
  },
  {
    name: 'Emerald Garden',
    tokens: { color: { primary: '#2f6b4f', secondary: '#8cb79b', bg: '#f4f8f4', text: '#20302a', accent: '#58927a' }, font: { heading: 'Marcellus', body: 'Nunito Sans' } },
  },
  {
    name: 'Midnight Gold',
    tokens: { color: { primary: '#c9a14a', secondary: '#b8923c', bg: '#1c2230', text: '#eae3d2', accent: '#d9b863' }, font: { heading: 'Cinzel', body: 'EB Garamond' } },
  },
  {
    name: 'Dusty Blue',
    tokens: { color: { primary: '#5a7a99', secondary: '#a9c0d4', bg: '#f5f8fb', text: '#28323d', accent: '#7a99b5' }, font: { heading: 'Cormorant Garamond', body: 'Nunito Sans' } },
  },
  {
    name: 'Elegant Noir',
    key: 'elegant',
    tokens: { color: { primary: '#1f2933', secondary: '#9aa5b1', bg: '#f7f5f2', text: '#2b2b2b', accent: '#b08d57' }, font: { heading: 'Playfair Display', body: 'EB Garamond' } },
  },
]

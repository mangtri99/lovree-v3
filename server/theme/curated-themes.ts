import type { Tokens } from './tokens'

export interface CuratedTheme {
  name: string
  key?: string
  tokens: Pick<Tokens, 'color' | 'font'> & Partial<Pick<Tokens, 'radius' | 'ornament'>>
}

// Palette (5 colours) + font pairing per theme. Fonts are from the curated
// allow-list (server/theme/fonts.ts) so they load globally. radius/ornament fall
// back to baseTokens via resolveTokens. The first entry is the default/demo theme.
export const CURATED_THEMES: CuratedTheme[] = [
  {
    name: 'Radiant Love',
    tokens: {
      color: { primary: '#8b5e3c', secondary: '#c8a97e', bg: '#faf6f0', text: '#2e2a26', accent: '#a47148' },
      font: { heading: 'Cormorant Garamond', body: 'Poppins' },
      radius: { sm: '6px', md: '10px', lg: '16px' },
      ornament: { divider: 'flourish', motif: 'corners' },
    },
  },
  {
    name: 'Rose Blush',
    tokens: {
      color: { primary: '#b76e79', secondary: '#e8b4bc', bg: '#fdf6f7', text: '#3a2c2e', accent: '#d98b96' },
      font: { heading: 'Playfair Display', body: 'Lora' },
      radius: { sm: '6px', md: '12px', lg: '20px' },
      ornament: { divider: 'flourish', motif: 'corners' },
    },
  },
  {
    name: 'Emerald Garden',
    tokens: {
      color: { primary: '#2f6b4f', secondary: '#8cb79b', bg: '#f4f8f4', text: '#20302a', accent: '#58927a' },
      font: { heading: 'Marcellus', body: 'Nunito Sans' },
      radius: { sm: '4px', md: '8px', lg: '12px' },
      ornament: { divider: 'line', motif: 'none' },
    },
  },
  {
    name: 'Midnight Gold',
    tokens: {
      color: { primary: '#c9a14a', secondary: '#b8923c', bg: '#1c2230', text: '#eae3d2', accent: '#d9b863' },
      font: { heading: 'Cinzel', body: 'EB Garamond' },
      radius: { sm: '2px', md: '2px', lg: '2px' },
      ornament: { divider: 'line', motif: 'corners' },
    },
  },
  {
    name: 'Dusty Blue',
    tokens: {
      color: { primary: '#5a7a99', secondary: '#a9c0d4', bg: '#f5f8fb', text: '#28323d', accent: '#7a99b5' },
      font: { heading: 'Cormorant Garamond', body: 'Nunito Sans' },
      radius: { sm: '4px', md: '8px', lg: '12px' },
      ornament: { divider: 'line', motif: 'none' },
    },
  },
  {
    name: 'Elegant Noir',
    key: 'elegant',
    tokens: {
      color: { primary: '#1f2933', secondary: '#9aa5b1', bg: '#f7f5f2', text: '#2b2b2b', accent: '#b08d57' },
      font: { heading: 'Playfair Display', body: 'EB Garamond' },
      radius: { sm: '2px', md: '2px', lg: '2px' },
      ornament: { divider: 'none', motif: 'none' },
    },
  },
  {
    name: 'Dark Prada',
    key: 'dark_prada',
    tokens: {
      color: { primary: '#fcc889', secondary: '#3a3a3a', bg: '#1b1a17', text: '#fbfbfb', accent: '#b2d0df' },
      font: { heading: 'Courgette', body: 'DM Sans' },
      radius: { sm: '4px', md: '8px', lg: '12px' },
      ornament: { divider: 'none', motif: 'none' },
    },
  },
  {
    name: 'Marun Klasik',
    key: 'maroon',
    tokens: {
      color: { primary: '#7a1f2b', secondary: '#9c6b6b', bg: '#fbf6ee', text: '#3a2326', accent: '#c0962f' },
      font: { heading: 'Fraunces', body: 'Lora' },
      radius: { sm: '4px', md: '6px', lg: '8px' },
      ornament: { divider: 'none', motif: 'none' },
    },
  },
]

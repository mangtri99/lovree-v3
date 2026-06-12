// Curated font allow-list. Same list drives: server-side validation of font
// overrides, the editor dropdowns, and the global Google Fonts <link>. Names MUST
// match Google Fonts family names exactly (they are also the CSS font-family value).
export const HEADING_FONTS = ['Cormorant Garamond', 'Playfair Display', 'Marcellus', 'Great Vibes', 'Cinzel'] as const
export const BODY_FONTS = ['Poppins', 'Lora', 'Nunito Sans', 'EB Garamond'] as const
export const ALL_FONTS: string[] = [...new Set<string>([...HEADING_FONTS, ...BODY_FONTS])]

export type HeadingFont = (typeof HEADING_FONTS)[number]
export type BodyFont = (typeof BODY_FONTS)[number]

// Single CSS2 request loading every curated family. Spaces -> '+', families joined
// by '&family='. display=swap avoids invisible text while the font loads.
export function googleFontsHref(): string {
  const families = ALL_FONTS.map((f) => `family=${f.replace(/ /g, '+')}`).join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

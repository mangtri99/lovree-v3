import sanitizeHtml from 'sanitize-html'

// Footer rich text: emphasis + paragraphs/breaks + bullet lists + headings + underline.
// text-align (left/center/right) style only. No links, no scripts, no other attributes.
// Server-only — never import this from client/registry code (keeps validateContent pure).
const RICHTEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'li', 'h1', 'h2', 'h3'],
  allowedAttributes: { '*': ['style'] },
  allowedStyles: { '*': { 'text-align': [/^(left|center|right)$/] } },
  allowedSchemes: [],
}

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html ?? '', RICHTEXT_OPTIONS)
}

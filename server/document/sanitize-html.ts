import sanitizeHtml from 'sanitize-html'

// Footer rich text: emphasis + paragraphs/breaks + bullet lists. No links, no attributes.
// Server-only — never import this from client/registry code (keeps validateContent pure).
const RICHTEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'li'],
  allowedAttributes: {},
  allowedSchemes: [],
}

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html ?? '', RICHTEXT_OPTIONS)
}

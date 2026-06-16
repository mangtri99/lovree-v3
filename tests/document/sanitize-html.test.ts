import { describe, it, expect } from 'vitest'
import { sanitizeRichText } from '../../server/document/sanitize-html'

describe('sanitizeRichText', () => {
  it('keeps allowed formatting tags', () => {
    const html = '<p>Hi <b>bold</b> <strong>s</strong> <i>it</i> <em>e</em></p><ul><li>one</li></ul><br />'
    const out = sanitizeRichText(html)
    for (const tag of ['<p>', '<b>', '<strong>', '<i>', '<em>', '<ul>', '<li>', '<br']) {
      expect(out).toContain(tag)
    }
  })
  it('strips script tags and their content', () => {
    expect(sanitizeRichText('<b>Hi</b><script>alert(1)</script>')).toBe('<b>Hi</b>')
  })
  it('strips disallowed tags but keeps inner text', () => {
    expect(sanitizeRichText('<h1>Big</h1><div>x</div><span>y</span>')).toBe('Bigxy')
  })
  it('strips all attributes (onclick, style, class)', () => {
    expect(sanitizeRichText('<b onclick="x" style="color:red" class="z">t</b>')).toBe('<b>t</b>')
  })
  it('strips links entirely (no anchors allowed), keeping the text', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">click</a>')).toBe('click')
  })
  it('returns empty string for empty/undefined input', () => {
    expect(sanitizeRichText('')).toBe('')
    expect(sanitizeRichText(undefined as any)).toBe('')
  })
})

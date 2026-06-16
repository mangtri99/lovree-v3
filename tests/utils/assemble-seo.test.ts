import { describe, it, expect } from 'vitest'
import { assembleInvitation } from '../../server/utils/invitation'

const theme = { tokens: {}, key: 'base' }

describe('assembleInvitation surfaces seo', () => {
  it('passes the stored seo override through', () => {
    const seo = { title: 'X', description: 'Y', ogImage: { mediaId: 'm', url: 'https://cdn/o.jpg' } }
    const out = assembleInvitation({ id: 'i', slug: 's', type: 'wedding', status: 'published', tokenOverrides: {}, seo }, theme, [])
    expect(out.seo).toEqual(seo)
  })
  it('defaults seo when the row has none', () => {
    const out = assembleInvitation({ id: 'i', slug: 's', type: 'wedding', status: 'published', tokenOverrides: {} }, theme, [])
    expect(out.seo).toEqual({ title: '', description: '', ogImage: { mediaId: '', url: '' } })
  })
})

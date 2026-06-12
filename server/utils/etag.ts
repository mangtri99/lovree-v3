export function publishedEtag(id: string, publishedAt: Date | null): string {
  const v = publishedAt ? publishedAt.getTime() : 0
  return `"${id}-${v}"`
}

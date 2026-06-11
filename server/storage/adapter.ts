export interface PutResult { key: string; url: string }

export interface StorageAdapter {
  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<PutResult>
  url(key: string): string
  delete(key: string): Promise<void>
}

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import type { StorageAdapter } from './adapter'

export interface R2Config {
  accountId: string; accessKeyId: string; secretAccessKey: string
  bucket: string; publicUrl: string
}

export function createR2Adapter(cfg: R2Config): StorageAdapter {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  })
  const url = (key: string) => `${cfg.publicUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
  return {
    url,
    async put(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body, ContentType: contentType }))
      return { key, url: url(key) }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }))
    },
  }
}

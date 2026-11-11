/** Central private object storage. Never publish raw R2 keys or credentials to clients. */
import { createReadStream } from 'node:fs';
import { readFile, rm, stat } from 'node:fs/promises';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

export const storageMode = env.STORAGE_PROVIDER;
export const bucket = env.R2_BUCKET_NAME || ''; // LEGACY READ/MIGRATION ONLY
let client;
export function getR2() {
  if (![env.R2_ACCOUNT_ID, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY, env.R2_BUCKET_NAME].every(Boolean)) throw new Error('Legacy R2 credentials are required to read older R2 files.');
  if (!client) client = new S3Client({
    region: 'auto', endpoint: env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    forcePathStyle: true, maxAttempts: 3,
  });
  return client;
}
export async function putPrivateObject({ objectKey, filename, mime, cacheControl = 'private, max-age=300' }) {
  const client = getR2();
  const { size } = await stat(filename);
  const result = await new Upload({ client, params: {
    Bucket: bucket, Key: objectKey, Body: createReadStream(filename), ContentType: mime,
    ContentLength: size, CacheControl: cacheControl,
  }, queueSize: 2, partSize: 8 * 1024 * 1024, leavePartsOnError: false }).done();
  return { objectKey, size, etag: result?.ETag };
}
export async function deletePrivateObject(objectKey) {
  if (!objectKey) return;
  await getR2().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
}
export async function headPrivateObject(objectKey) {
  return getR2().send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
}
export async function streamPrivateObject(objectKey, range) {
  return getR2().send(new GetObjectCommand({ Bucket: bucket, Key: objectKey, ...(range ? { Range: range } : {}) }));
}
export async function signedPrivateDownload(objectKey, seconds = 60) {
  return getSignedUrl(getR2(), new GetObjectCommand({ Bucket: bucket, Key: objectKey }), { expiresIn: Math.max(10, Math.min(300, seconds)) });
}
/** For owned, permission-checked files only. Never accept a raw key from callers. */
export function r2ObjectPrefix({ kind, purpose, ownerId, entityId }) {
  const owner = encodeURIComponent(String(ownerId).replace(/[^a-zA-Z0-9_-]/g, '_'));
  const entity = String(entityId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (purpose === 'avatar') return `users/${owner}/avatars/${entity}`;
  if (purpose === 'cover') return `users/${owner}/covers/${entity}`;
  if (purpose === 'post' || purpose === 'story') return `posts/${owner}/${entity}`;
  if (purpose === 'community') return `communities/${owner}/channels/${entity}`;
  if (purpose === 'video') return `videos/${owner}/${entity}`;
  if (purpose === 'message') return `messages/${owner}/attachments/${entity}`;
  return kind === 'file' ? `documents/${owner}/${entity}` : `media/${owner}/${entity}`;
}

export async function listStoredObjects({ prefix, continuationToken, limit = 500 }) {
  return getR2().send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken, MaxKeys: Math.min(1000, limit) }));
}

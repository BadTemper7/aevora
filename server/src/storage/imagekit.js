/**
 * Server-only ImageKit Media Library adapter.
 * New uploads are ALWAYS private and optimized by the existing Sharp/FFmpeg worker
 * before this module is called. The ImageKit private key never reaches a browser.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { env } from '../config/env.js';

export const storageMode = env.STORAGE_PROVIDER;
let imagekitPromise;
export async function getImageKit() {
  if (storageMode !== 'imagekit') throw new Error('ImageKit storage is not enabled.');
  imagekitPromise ||= import('@imagekit/nodejs').then(({ default: ImageKit }) => new ImageKit({ privateKey: env.IMAGEKIT_PRIVATE_KEY }));
  return imagekitPromise;
}
import { buildObjectPrefix, normalizeObjectKey } from './imagekitPaths.js';
export { normalizeObjectKey } from './imagekitPaths.js';
export function objectPrefix(args) {
  return buildObjectPrefix({ ...args, prefix: env.IMAGEKIT_FOLDER_PREFIX || '/aevora' });
}
export async function putPrivateObject({ objectKey, filename, mime }) {
  const client = await getImageKit();
  const { size } = await stat(filename);
  const key = normalizeObjectKey(objectKey);
  const fileName = path.posix.basename(key);
  const folder = '/' + path.posix.dirname(key).replace(/^\/+/, '');
  const response = await client.files.upload({
    file: createReadStream(filename), fileName, folder,
    isPrivateFile: true, useUniqueFileName: false, overwriteFile: false,
    tags: ['aevora', 'optimized'],
  });
  if (!response?.fileId) throw new Error('ImageKit did not return a file ID; upload cannot be verified.');
  const providerKey = normalizeObjectKey(response.filePath || key);
  const uploadedSize = Number(response.size);
  if (Number.isFinite(uploadedSize) && uploadedSize !== size) {
    // Provider metadata is authoritative; do not allow the DB to mark a truncated asset ready.
    try { await client.files.delete(response.fileId); } catch (error) { console.warn('ImageKit size mismatch cleanup:', error.message); }
    throw new Error('ImageKit upload size does not match optimized file size.');
  }
  return { objectKey: providerKey, fileId: response.fileId, size, etag: response.fileId };
}
export async function headPrivateObject(fileId) {
  if (!fileId) throw new Error('Missing ImageKit file ID.');
  const record = await (await getImageKit()).files.get(fileId);
  if (!record?.fileId) throw new Error('ImageKit file verification failed.');
  if (!Number.isFinite(Number(record.size))) throw new Error('ImageKit metadata did not include a valid size.');
  return { ContentLength: Number(record.size), fileId: record.fileId, objectKey: normalizeObjectKey(record.filePath) };
}
export async function deletePrivateObject(fileId) {
  if (!fileId) return;
  try { await (await getImageKit()).files.delete(fileId); }
  catch (error) {
    // An idempotent delete must be safe to retry after a network interruption.
    if (error?.status === 404 || error?.name === 'NotFoundError') return;
    throw error;
  }
}
export async function signedPrivateDownload(objectKey, seconds = 60, transformThumbnail = false) {
  const client = await getImageKit();
  return client.helper.buildSrc({
    urlEndpoint: env.IMAGEKIT_URL_ENDPOINT.replace(/\/$/, ''),
    src: '/' + normalizeObjectKey(objectKey),
    ...(transformThumbnail ? { transformation: [{ width: 320, height: 320, crop: 'maintain_ratio', quality: 70, format: 'webp' }] } : {}),
    signed: true,
    expiresIn: Math.max(10, Math.min(300, Number(seconds) || 60)),
  });
}
/** Fetch via a signed ImageKit URL after the AEVORA media-route authorization check. */
export async function streamPrivateObject(objectKey, range, transformThumbnail = false) {
  const url = await signedPrivateDownload(objectKey, 90, transformThumbnail);
  const headers = { 'Accept-Encoding': 'identity' };
  if (range) headers.Range = range;
  // Time out only the initial response headers. Large streaming video responses
  // must not be terminated after a fixed 30-second total transfer time.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response;
  try { response = await fetch(url, { headers, signal: controller.signal, redirect: 'error' }); }
  finally { clearTimeout(timeout); }
  if (![200, 206].includes(response.status) || !response.body) throw new Error(`ImageKit media request failed (${response.status}).`);
  return {
    Body: Readable.fromWeb(response.body),
    ContentLength: Number(response.headers.get('content-length')) || undefined,
    ContentRange: response.headers.get('content-range') || undefined,
    StatusCode: response.status,
  };
}

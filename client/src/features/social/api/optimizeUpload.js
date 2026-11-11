const purposeMaxWidth = { avatar: 512, cover: 1920, post: 1920, story: 1920, message: 1600, community: 1920 };
export function prettyBytes(bytes = 0) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
/** Best effort only: the backend always validates, optimizes, and stores the final file. */
export async function optimizeUpload(file, purpose, signal, onStage, variant) {
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size < 800_000 || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return file;
  if (signal?.aborted) throw new Error('Upload canceled.');
  onStage?.('optimizing');
  let worker;
  try {
    worker = new Worker(new URL('../../../workers/imageOptimizer.worker.js', import.meta.url), { type: 'module' });
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Client optimization timed out.')), 20000);
      const abort = () => { clearTimeout(timer); reject(new Error('Upload canceled.')); };
      signal?.addEventListener('abort', abort, { once: true });
      worker.onmessage = ({ data }) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); data.error ? reject(new Error(data.error)) : resolve(data); };
      worker.onerror = (error) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(error); };
      worker.postMessage({ file, maxWidth: variant === "icon" ? 512 : purposeMaxWidth[purpose] || 1600 });
    });
    if (result.blob?.type === 'image/webp' && result.blob.size < file.size * .95) {
      return new File([result.blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp', lastModified: file.lastModified });
    }
    return file;
  } catch (error) {
    if (signal?.aborted) throw error;
    // Client optimization is optional, never fail otherwise valid media.
    return file;
  } finally { worker?.terminate(); }
}

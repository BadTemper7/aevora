import { optimizeUpload } from "./optimizeUpload";
import { api } from "../../../services/api/axios";

export const read = async (url, params) => (await api.get(`/social${url}`, { params })).data.data;
export const create = async (url, values) => (await api.post(`/social${url}`, values)).data.data;
export const update = async (url, values) => (await api.patch(`/social${url}`, values)).data.data;
export const replace = async (url, values) => (await api.put(`/social${url}`, values)).data.data;
export const remove = async (url) => (await api.delete(`/social${url}`)).data.data;
export const mediaFile = (id, thumbnail = false) => `/api/social/media/${id}/file${thumbnail ? "?thumb=1" : ""}`;
export const errorText = (error) => error?.response?.data?.error?.message || error?.message || "Something went wrong. Please try again.";

export async function uploadMedia(file, purpose, onProgress, signal, onStage, options = {}) {
  onStage?.('preparing');
  const selected = await optimizeUpload(file, purpose, signal, onStage, options.variant);
  if (signal?.aborted) throw new Error('Upload canceled.');
  options.onPrepared?.({ originalSize: file.size, uploadSize: selected.size });
  onStage?.('uploading');
  const form = new FormData(); form.append('file', selected); form.append('purpose', purpose);
  form.append('sourceOriginalSize', String(file.size)); form.append('originalName', file.name);
  if (options.variant) form.append('variant', options.variant);
  if (Number.isFinite(options.trimStart) && options.trimStart > 0) form.append('clipStart', String(options.trimStart));
  if (Number.isFinite(options.trimEnd) && options.trimEnd > 0) form.append('clipEnd', String(options.trimEnd));
  const response = await api.post('/social/media', form, {
    signal, timeout: 180_000, headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => { if (event.total) onProgress?.(Math.round(event.loaded / event.total * 100)); },
  });
  return response.data.data;
}
export async function waitForMedia(id, onStatus, signal) {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (signal?.aborted) throw new Error("Upload canceled.");
    const item = await read(`/media/${id}/status`);
    onStatus?.(item);
    if (item.status === "ready") return item;
    if (item.status === "failed") throw new Error(item.error || "Media processing failed. You can retry.");
    await new Promise((resolve, reject) => {
      const onAbort = () => { clearTimeout(timer); reject(new Error("Upload canceled.")); };
      const timer = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, 1200);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
  throw new Error("Processing is taking longer than expected. Check your upload status again.");
}

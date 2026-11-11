// Draft-only validation. The API validates file signatures, ownership and quotas again.
export const MAX_MESSAGE_ATTACHMENTS = 4;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const DOCUMENT_TYPES = new Set(['application/pdf', 'text/plain']);
export const ATTACHMENT_ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOCUMENT_TYPES].join(',');

export const attachmentKind = (file) => {
  if (!file) return null;
  if (file.type === 'image/gif') return 'gif';
  if (IMAGE_TYPES.has(file.type)) return 'image';
  if (VIDEO_TYPES.has(file.type)) return 'video';
  if (DOCUMENT_TYPES.has(file.type)) return 'file';
  return null;
};

export const attachmentFingerprint = (file) => [file.name, file.size, file.lastModified, file.type].join(':');
export const messageKindFor = (attachments) => {
  const kinds = [...new Set(attachments.map((a) => a.kind).filter(Boolean))];
  return kinds.length > 1 ? 'mixed' : kinds[0] || 'text';
};
export const formatFileSize = (bytes) => bytes >= 1048576
  ? `${(bytes / 1048576).toFixed(1)} MB`
  : `${Math.max(1, Math.ceil((bytes || 0) / 1024))} KB`;

export function validateAttachment(file, draft = []) {
  const kind = attachmentKind(file);
  if (!kind) return 'Unsupported file. Choose a JPEG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV, PDF or TXT.';
  const defaults = { image: 12, gif: 12, video: 150, file: 12 };
  const overrides = {
    image: Number(import.meta.env?.VITE_MAX_IMAGE_MB) || defaults.image,
    gif: Number(import.meta.env?.VITE_MAX_IMAGE_MB) || defaults.gif,
    video: Number(import.meta.env?.VITE_MAX_VIDEO_MB) || defaults.video,
    file: Number(import.meta.env?.VITE_MAX_DOCUMENT_MB) || defaults.file,
  };
  if (file.size <= 0 || file.size > overrides[kind] * 1048576) return `File must be under ${overrides[kind]} MB.`;
  if (draft.length >= MAX_MESSAGE_ATTACHMENTS) return `You can attach up to ${MAX_MESSAGE_ATTACHMENTS} files per message.`;
  if (draft.some((entry) => attachmentFingerprint(entry.file) === attachmentFingerprint(file))) return 'This file is already attached.';
  return '';
}

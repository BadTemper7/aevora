// Image optimization in a Worker keeps large canvas operations off the React UI thread.
self.onmessage = async ({ data }) => {
  try {
    const { file, maxWidth } = data;
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
      const ratio = Math.min(1, maxWidth / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * ratio));
      const height = Math.max(1, Math.round(bitmap.height * ratio));
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is unavailable.');
      ctx.drawImage(bitmap, 0, 0, width, height);
      const result = await canvas.convertToBlob({ type: 'image/webp', quality: .82 });
      self.postMessage({ blob: result, originalSize: file.size, optimizedSize: result.size });
    } finally { bitmap.close(); }
  } catch (error) { self.postMessage({ error: error.message || 'Unsupported image' }); }
};

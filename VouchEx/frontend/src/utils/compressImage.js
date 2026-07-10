/** Resize logo for optional base64 fallback; prefer file upload API when available. */
export function compressImageFile(file, { maxEdge = 512, maxChars = 280000 } = {}) {
  return new Promise((resolve, reject) => {
    const name = file?.name || '';
    const isImage =
      file?.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(name);
    if (!isImage) {
      reject(new Error('Please choose a PNG or JPG image file.'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const w0 = img.naturalWidth || img.width || maxEdge;
        const h0 = img.naturalHeight || img.height || maxEdge;
        const scale = Math.min(1, maxEdge / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * scale));
        const h = Math.max(1, Math.round(h0 * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        const preferPng = /\.png$/i.test(name) || file.type === 'image/png';
        if (!preferPng) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);

        if (preferPng) {
          let dataUrl = canvas.toDataURL('image/png');
          if (dataUrl.length <= maxChars) {
            resolve(dataUrl);
            return;
          }
        }

        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > maxChars && quality > 0.35) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > maxChars) {
          reject(new Error('Image is too large after resize. Try a smaller file or use PNG under 1 MB.'));
          return;
        }
        resolve(dataUrl);
      } catch {
        reject(new Error('Could not process image in browser.'));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image file.'));
    };
    img.src = url;
  });
}

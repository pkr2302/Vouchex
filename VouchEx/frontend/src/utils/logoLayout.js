/** Wide letterhead logos (e.g. Digi-MAA with tagline) use banner layout on PDFs. */
export const BANNER_LOGO_RATIO = 1.6;

export function isBannerLogoRatio(width, height) {
  if (!width || !height) return false;
  return width / height >= BANNER_LOGO_RATIO;
}

export function resolveLogoLayout(preference, measuredBanner) {
  if (preference === 'banner') return true;
  if (preference === 'compact') return false;
  if (measuredBanner === true) return true;
  if (measuredBanner === false) return false;
  return false;
}

export function detectLogoLayoutFromFile(file) {
  return new Promise((resolve) => {
    if (!file?.type?.startsWith('image/')) {
      resolve('compact');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(isBannerLogoRatio(img.naturalWidth, img.naturalHeight) ? 'banner' : 'compact');
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('auto');
    };
    img.src = url;
  });
}

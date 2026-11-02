/**
 * Utility for compressing and handling image files and mobile camera photos.
 * Keeps image quality crisp while compressing payload size (~40KB - 90KB)
 * so localStorage never exceeds browser storage limits.
 */

export const compressImage = (
  file: File,
  maxWidth = 960,
  maxHeight = 960,
  quality = 0.75
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If not an image file, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih bukan merupakan format gambar valid.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memuat elemen gambar.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserving dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original data URL if 2D context unavailable
          resolve(e.target?.result as string);
          return;
        }

        // Draw image smoothly onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG data URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Format bytes into human readable string (e.g. 84.5 KB)
 */
export const formatFileSize = (base64String: string): string => {
  if (!base64String) return '0 B';
  const stringLength = base64String.length - (base64String.indexOf(',') + 1);
  const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383;
  if (sizeInBytes < 1024) return `${Math.round(sizeInBytes)} B`;
  return `${(sizeInBytes / 1024).toFixed(1)} KB`;
};

import { MAX_PROOF_FILE_SIZE } from '@/lib/constants/attendance';

/**
 * Checks if a file is an allowed image format (JPEG or PNG).
 * WebP and other formats are strictly excluded per business rules.
 */
export function isCompressibleImage(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const isJpeg = type === 'image/jpeg' || type === 'image/jpg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
  const isPng = type === 'image/png' || name.endsWith('.png');
  return isJpeg || isPng;
}

/**
 * Helper to convert canvas to Blob via Promise.
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Helper to load an image using HTMLImageElement fallback.
 */
function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal membaca file gambar.'));
    };
    img.src = url;
  });
}

/**
 * Client-side compression and resizing for attendance proof images.
 *
 * Rules:
 * 1. PDF files are NEVER modified or compressed.
 * 2. If the selected image is already <= 1 MB, the original file is preserved without recompression.
 * 3. If the selected image is > 1 MB, it is resized and compressed to <= 1 MB.
 * 4. Document readability is preserved by maintaining adequate resolution (up to 2048px).
 * 5. EXIF orientation is respected (via createImageBitmap with imageOrientation: 'from-image').
 * 6. If converting a PNG to JPEG to achieve <= 1 MB, the extension is changed to .jpg and MIME type to image/jpeg.
 * 7. If the image cannot reasonably be compressed under 1 MB, an error is thrown.
 */
export async function compressImageProof(file: File): Promise<File> {
  // 1. PDF files: never modify
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return file;
  }

  // 2. Only process allowed image types
  if (!isCompressibleImage(file)) {
    return file;
  }

  // 3. If file is already <= 1 MB, preserve original without recompression
  if (file.size <= MAX_PROOF_FILE_SIZE) {
    return file;
  }

  // 4. Load image bitmap or fallback to HTMLImageElement
  let source: ImageBitmap | HTMLImageElement;
  let sourceWidth = 0;
  let sourceHeight = 0;

  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      source = await createImageBitmap(file, { imageOrientation: 'from-image' });
      sourceWidth = source.width;
      sourceHeight = source.height;
    } catch {
      source = await loadImageElement(file);
      sourceWidth = source.naturalWidth;
      sourceHeight = source.naturalHeight;
    }
  } else {
    source = await loadImageElement(file);
    sourceWidth = source.naturalWidth;
    sourceHeight = source.naturalHeight;
  }

  try {
    // Initial maximum dimension: 2048px (high clarity for documents/text)
    const maxDimension = 2048;
    const isPngOriginal = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

    // Multi-pass compression loop
    const attempts = [
      { maxDim: 2048, quality: 0.85 },
      { maxDim: 2048, quality: 0.78 },
      { maxDim: 1800, quality: 0.75 },
      { maxDim: 1600, quality: 0.70 },
      { maxDim: 1400, quality: 0.65 },
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      throw new Error('Gagal menginisialisasi canvas untuk kompresi gambar.');
    }

    // If original is PNG, first test if resizing as PNG brings it under 1 MB
    if (isPngOriginal) {
      let pngW = sourceWidth;
      let pngH = sourceHeight;
      if (pngW > maxDimension || pngH > maxDimension) {
        if (pngW > pngH) {
          pngH = Math.round((pngH * maxDimension) / pngW);
          pngW = maxDimension;
        } else {
          pngW = Math.round((pngW * maxDimension) / pngH);
          pngH = maxDimension;
        }
      }

      canvas.width = pngW;
      canvas.height = pngH;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, pngW, pngH);

      const pngBlob = await canvasToBlob(canvas, 'image/png');
      if (pngBlob && pngBlob.size <= MAX_PROOF_FILE_SIZE) {
        return new File([pngBlob], file.name, {
          type: 'image/png',
          lastModified: Date.now(),
        });
      }
    }

    // JPEG compression passes
    for (const attempt of attempts) {
      let targetW = sourceWidth;
      let targetH = sourceHeight;

      if (targetW > attempt.maxDim || targetH > attempt.maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * attempt.maxDim) / targetW);
          targetW = attempt.maxDim;
        } else {
          targetW = Math.round((targetW * attempt.maxDim) / targetH);
          targetH = attempt.maxDim;
        }
      }

      canvas.width = targetW;
      canvas.height = targetH;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // Fill background white for JPEG in case of transparency
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(source, 0, 0, targetW, targetH);

      const blob = await canvasToBlob(canvas, 'image/jpeg', attempt.quality);
      if (blob && blob.size <= MAX_PROOF_FILE_SIZE) {
        // Adjust filename extension if converting PNG -> JPEG
        let newFileName = file.name;
        if (isPngOriginal) {
          newFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
        } else if (!newFileName.toLowerCase().endsWith('.jpg') && !newFileName.toLowerCase().endsWith('.jpeg')) {
          newFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
        }

        return new File([blob], newFileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      }
    }

    // If all compression attempts cannot bring file <= 1 MB
    throw new Error(
      'Ukuran gambar terlalu besar dan tidak dapat dikompresi di bawah 1 MB. Silakan pilih foto dengan resolusi lebih kecil.'
    );
  } finally {
    if ('close' in source && typeof source.close === 'function') {
      source.close();
    }
  }
}

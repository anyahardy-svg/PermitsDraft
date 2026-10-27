import { validateFileType } from './fileValidation';

function fitDimensions(width, height, maxEdge) {
  if (!width || !height) {
    return { width: maxEdge, height: maxEdge };
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Compress a browser File/Blob image via canvas (training uploads on web).
 */
export async function compressImageFileWeb(file, { maxEdge = 2000, quality = 0.72 } = {}) {
  if (typeof document === 'undefined' || !file?.type?.startsWith('image/')) {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const { width, height } = fitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
    });
    if (!blob) {
      return null;
    }
    const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
    return {
      blob,
      name: `${baseName}.jpg`,
      type: 'image/jpeg',
      size: blob.size,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Best-effort compression before training-record upload validation.
 * PDFs are uploaded as-is (pdfjs does not bundle reliably on Expo web).
 */
export async function compressFileForTrainingUpload(file) {
  const typeValidation = validateFileType(file);
  if (!typeValidation.valid) {
    return { uploadBody: file, originalName: file?.name, changed: false };
  }

  if (typeValidation.isImage) {
    if (file.uri) {
      return { uploadBody: file, originalName: file.name, changed: false, deferToNativeUri: true };
    }
    const compressed = await compressImageFileWeb(file);
    if (compressed && compressed.size < (file.size || compressed.size + 1)) {
      return {
        uploadBody: compressed.blob,
        fileName: compressed.name,
        fileSize: compressed.size,
        contentType: compressed.type,
        originalName: file.name,
        changed: true,
      };
    }
  }

  return {
    uploadBody: file,
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type || 'application/octet-stream',
    originalName: file.name,
    changed: false,
  };
}

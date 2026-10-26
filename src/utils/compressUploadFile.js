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
 * Re-encode image-heavy PDFs as compressed JPEG pages (web only). Skips text-only PDFs when little is saved.
 */
export async function compressPdfFileWeb(
  file,
  { maxEdge = 1800, quality = 0.72, maxPages = 25, minBytesToAttempt = 512 * 1024 } = {},
) {
  if (typeof document === 'undefined' || !file?.size || file.size < minBytesToAttempt) {
    return null;
  }

  const typeValidation = validateFileType(file);
  if (!typeValidation.isPDF) {
    return null;
  }

  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { jsPDF } = await import('jspdf');
    const data = new Uint8Array(await file.arrayBuffer());
    const pdfDoc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
    const pageCount = Math.min(pdfDoc.numPages, maxPages);
    if (pageCount === 0) {
      return null;
    }

    let pdf = null;
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdfDoc.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1, maxEdge / Math.max(baseViewport.width, baseViewport.height));
      const viewport = page.getViewport({ scale: Math.max(scale, 0.35) });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return null;
      }

      await page.render({ canvasContext: ctx, viewport }).promise;
      const jpegBlob = await new Promise((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
      });
      if (!jpegBlob) {
        return null;
      }

      const imgW = viewport.width;
      const imgH = viewport.height;
      const orientation = imgW > imgH ? 'landscape' : 'portrait';
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

      if (pageNumber === 1) {
        pdf = new jsPDF({
          orientation,
          unit: 'pt',
          format: [imgW, imgH],
          compress: true,
        });
      } else {
        pdf.addPage([imgW, imgH], orientation);
      }
      pdf.addImage(jpegBytes, 'JPEG', 0, 0, imgW, imgH, undefined, 'FAST');
    }

    if (!pdf) {
      return null;
    }

    const blob = pdf.output('blob');
    if (!blob || blob.size >= file.size * 0.98) {
      return null;
    }
    return blob;
  } catch (error) {
    console.warn('PDF compression skipped:', error?.message || error);
    return null;
  }
}

/**
 * Best-effort compression before training-record upload validation.
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

  if (typeValidation.isPDF) {
    const compressedBlob = await compressPdfFileWeb(file);
    if (compressedBlob) {
      return {
        uploadBody: compressedBlob,
        fileName: file.name,
        fileSize: compressedBlob.size,
        contentType: 'application/pdf',
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

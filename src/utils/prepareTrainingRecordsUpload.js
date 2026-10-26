import { validateFile } from './fileValidation';
import { compressImage } from './imageCompression';

/** Same limit as contractor/company attachments in the training-records bucket. */
export const TRAINING_RECORDS_MAX_UPLOAD_MB = 50;

/**
 * Validate and optionally compress a training record / matrix file before storage upload.
 * @returns {{ uploadBody: Blob|File, fileName: string, fileSize: number, contentType: string, originalName: string }}
 */
export async function prepareTrainingRecordsUpload(file) {
  if (!file?.name) {
    throw new Error('No file provided');
  }

  const validation = validateFile(file, TRAINING_RECORDS_MAX_UPLOAD_MB);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  let uploadBody = file;
  let fileName = file.name;
  let fileSize = file.size;
  let contentType = file.type || 'application/octet-stream';

  if (validation.isImage && file.uri) {
    try {
      const compressed = await compressImage(file, { width: 2000, height: 2000, compress: 0.7 });
      const response = await fetch(compressed.uri);
      uploadBody = await response.blob();
      fileName = compressed.name || file.name;
      fileSize = uploadBody.size;
      contentType = compressed.type || file.type || 'image/jpeg';
    } catch (compressionError) {
      console.warn(
        'Training record image compression failed, using original:',
        compressionError?.message,
      );
    }
  }

  return {
    uploadBody,
    fileName,
    fileSize,
    contentType,
    originalName: file.name,
  };
}

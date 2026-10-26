import { validateFile, validateFileType } from './fileValidation';
import { compressImage } from './imageCompression';
import { compressFileForTrainingUpload } from './compressUploadFile';

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

  const typeOnly = validateFileType(file);
  if (!typeOnly.valid) {
    throw new Error(typeOnly.error || 'Invalid file type');
  }

  let uploadBody = file;
  let fileName = file.name;
  let fileSize = file.size;
  let contentType = file.type || 'application/octet-stream';
  const originalName = file.name;

  const compressed = await compressFileForTrainingUpload(file);
  if (compressed.deferToNativeUri && typeOnly.isImage && file.uri) {
    try {
      const nativeCompressed = await compressImage(file, { width: 2000, height: 2000, compress: 0.7 });
      const response = await fetch(nativeCompressed.uri);
      uploadBody = await response.blob();
      fileName = nativeCompressed.name || file.name;
      fileSize = uploadBody.size;
      contentType = nativeCompressed.type || 'image/jpeg';
    } catch (compressionError) {
      console.warn(
        'Training record image compression failed, using original:',
        compressionError?.message,
      );
    }
  } else if (compressed.changed) {
    uploadBody = compressed.uploadBody;
    fileSize = compressed.fileSize ?? uploadBody.size;
    contentType = compressed.contentType || contentType;
  }

  const fileForValidation = {
    name: originalName,
    type: contentType,
    size: fileSize ?? uploadBody.size,
  };
  const validation = validateFile(fileForValidation, TRAINING_RECORDS_MAX_UPLOAD_MB);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  return {
    uploadBody,
    fileName,
    fileSize: fileSize ?? uploadBody.size,
    contentType,
    originalName,
  };
}

/**
 * File validation utilities
 * Validates file types for uploads to ensure only PDFs and images are allowed
 */

// Allowed file types
const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tiff', '.tif'],
  'image/bmp': ['.bmp'],
  // Documents
  'application/pdf': ['.pdf'],
};

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif', '.bmp', '.pdf'];

/**
 * Validate file type
 * @param {File|Object} file - File object with name and type properties
 * @returns {Object} - { valid: boolean, error: string|null, isImage: boolean, isPDF: boolean }
 */
export const validateFileType = (file) => {
  if (!file || !file.name) {
    return { valid: false, error: 'No file provided', isImage: false, isPDF: false };
  }

  const fileName = file.name.toLowerCase();
  const fileType = file.type || '';
  
  // Get file extension
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  
  // Check if extension is allowed
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `File type not allowed. Only PDF and image files (JPG, PNG, GIF, WebP, TIFF, BMP) are accepted.`,
      isImage: false,
      isPDF: false
    };
  }
  
  // Check MIME type if available
  if (fileType && !Object.keys(ALLOWED_MIME_TYPES).includes(fileType)) {
    // Some systems might not report MIME type correctly, so we allow it if extension is valid
    console.warn(`⚠️ Unusual MIME type detected: ${fileType} - proceeding with extension validation`);
  }
  
  const isImage = fileType.startsWith('image/') || extension.startsWith('.') && ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif', '.bmp'].includes(extension);
  const isPDF = fileType === 'application/pdf' || extension === '.pdf';
  
  return {
    valid: true,
    error: null,
    isImage,
    isPDF,
  };
};

/**
 * Validate file size
 * @param {number} fileSizeBytes - File size in bytes
 * @param {number} maxSizeMB - Maximum allowed size in MB (default: 50MB)
 * @returns {Object} - { valid: boolean, error: string|null }
 */
export const validateFileSize = (fileSizeBytes, maxSizeMB = 50) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (fileSizeBytes > maxSizeBytes) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${maxSizeMB}MB, but file is ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB.`
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate file before upload
 * @param {File|Object} file - File object with name, type, and size properties
 * @param {number} maxSizeMB - Maximum allowed size in MB (default: 50MB)
 * @returns {Object} - { valid: boolean, error: string|null, isImage: boolean, isPDF: boolean }
 */
export const validateFile = (file, maxSizeMB = 50) => {
  // Validate type
  const typeValidation = validateFileType(file);
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  // Validate size
  const sizeValidation = validateFileSize(file.size, maxSizeMB);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }
  
  return {
    valid: true,
    error: null,
    isImage: typeValidation.isImage,
    isPDF: typeValidation.isPDF,
  };
};

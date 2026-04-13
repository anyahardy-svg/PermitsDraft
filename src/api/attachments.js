import { supabase } from '../supabaseClient';
import { compressImage, compressMultipleImages } from '../utils/imageCompression';

const BUCKET_NAME = 'permit-attachments';

/**
 * Upload an attachment file to Supabase Storage
 * @param {string} permitId - The permit ID (for organizing files)
 * @param {Blob|object} fileData - Blob object or file object with { uri, name, type }
 * @param {string} fileName - Optional filename (used when passing a blob)
 * @param {object} compressionOptions - Optional compression settings { width, height, compress }
 * @returns {Promise<object>} - Object with { url, name, uploadedAt, path, compressionInfo }
 */
export const uploadAttachment = async (permitId, fileData, fileName, compressionOptions = {}) => {
  try {
    let blob = fileData;
    let name = fileName;
    let contentType = 'application/octet-stream';
    let fileToUpload = fileData;
    let compressionInfo = null;
    
    // If it's a file object with uri, convert to blob and optionally compress
    if (fileData.uri) {
      console.log('📁 Uploading file:', {
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
        uri: fileData.uri
      });
      
      // Compress image if it's an image file
      if (fileData.type && fileData.type.startsWith('image/')) {
        console.log('🖼️  Image detected - starting compression...');
        fileToUpload = await compressImage(fileData, compressionOptions);
        compressionInfo = {
          originalSize: fileData.size,
          compressedSize: fileToUpload.size,
          compressionRatio: fileToUpload.compressionRatio,
          compressed: true
        };
        console.log('✅ Compression complete:', compressionInfo);
      } else {
        console.log('⏭️  Skipping compression - not an image, type:', fileData.type);
      }

      const response = await fetch(fileToUpload.uri);
      blob = await response.blob();
      name = fileToUpload.name;
      contentType = fileToUpload.type || 'application/octet-stream';
    } else if (fileData instanceof Blob) {
      // It's already a blob, use the provided fileName
      name = fileName || `attachment_${Date.now()}`;
    }
    
    // Create a unique filename: permit_id/timestamp_originalname
    const timestamp = Date.now();
    const filePath = `${permitId}/${timestamp}_${name}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: contentType,
        cacheControl: '3600'
      });
    
    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return {
      url: publicUrl.publicUrl,
      name: name,
      uploadedAt: new Date().toISOString(),
      path: filePath,
      compressionInfo: compressionInfo
    };
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
  }
};

/**
 * Upload multiple attachments for a permit
 * @param {string} permitId - The permit ID
 * @param {array} files - Array of file objects
 * @param {object} compressionOptions - Optional compression settings
 * @returns {Promise<array>} - Array of uploaded attachment metadata
 */
export const uploadMultipleAttachments = async (permitId, files, compressionOptions = {}) => {
  if (!files || files.length === 0) return [];
  
  try {
    const uploaded = [];
    for (const file of files) {
      const result = await uploadAttachment(permitId, file, null, compressionOptions);
      uploaded.push(result);
    }
    return uploaded;
  } catch (error) {
    console.error('Error uploading multiple attachments:', error);
    throw error;
  }
};

/**
 * Delete an attachment from Supabase Storage
 * @param {string} filePath - The file path returned from upload
 */
export const deleteAttachment = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting attachment:', error);
    throw error;
  }
};

/**
 * Delete all attachments for a permit
 * @param {string} permitId - The permit ID
 */
export const deletePermitAttachments = async (permitId) => {
  try {
    // List all files in the permit folder
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(permitId);
    
    if (listError) {
      throw new Error(`List failed: ${listError.message}`);
    }
    
    if (!files || files.length === 0) return;
    
    // Delete all files
    const filePaths = files.map(f => `${permitId}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);
    
    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`);
    }
  } catch (error) {
    console.error('Error deleting permit attachments:', error);
    throw error;
  }
};

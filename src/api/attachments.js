import { supabase } from '../supabaseClient';

const BUCKET_NAME = 'permit-attachments';

/**
 * Upload an attachment file to Supabase Storage
 * @param {string} permitId - The permit ID (for organizing files)
 * @param {object} file - File object with { uri, name, type }
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
export const uploadAttachment = async (permitId, file) => {
  try {
    // Convert URI to blob for web/mobile compatibility
    const response = await fetch(file.uri);
    const blob = await response.blob();
    
    // Create a unique filename: permit_id/timestamp_originalname
    const timestamp = Date.now();
    const filePath = `${permitId}/${timestamp}_${file.name}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: file.type,
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
      name: file.name,
      uploadedAt: new Date().toISOString(),
      path: filePath
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
 * @returns {Promise<array>} - Array of uploaded attachment metadata
 */
export const uploadMultipleAttachments = async (permitId, files) => {
  if (!files || files.length === 0) return [];
  
  try {
    const uploaded = [];
    for (const file of files) {
      const result = await uploadAttachment(permitId, file);
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

/**
 * Inductions PDF Upload API
 * Handles PDF file uploads for contractor and visitor inductions
 */

import { supabase } from '../supabaseClient';

const PDF_BUCKET = 'inductions-pdf';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// PDF FILE UPLOAD
// ============================================================================

/**
 * Upload PDF file for contractor induction
 * @param {UUID} inductionId - Induction ID
 * @param {File} file - PDF file to upload
 * @returns {Object} { success, data: { pdf_file_url, pdf_file_name }, message, error }
 */
export async function uploadInductionPDF(inductionId, file) {
  try {
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type (file.type may be undefined on some platforms)
    const isPdf = (file.type && file.type.includes('pdf')) || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return { success: false, error: 'Only PDF files are allowed' };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { 
        success: false, 
        error: `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)` 
      };
    }

    // Convert file URI to File object - handle expo-document-picker files with uri property
    let fileToUpload = file;
    console.log(`📋 Original file object:`, { 
      name: file.name, 
      size: file.size, 
      type: file.type, 
      mimeType: file.mimeType, 
      uri: file.uri ? '(exists)' : '(missing)' 
    });

    // Always convert if we have a URI (expo-document-picker format)
    if (file.uri) {
      // Fetch the actual file content from the URI and convert to File object
      const response = await fetch(file.uri);
      const blob = await response.blob();
      console.log(`📦 Blob created:`, { type: blob.type, size: blob.size });
      // Use mimeType if available (expo), otherwise use type or default to application/pdf
      const fileType = file.mimeType || file.type || 'application/pdf';
      fileToUpload = new File([blob], file.name, { type: fileType });
      console.log(`📄 File object created:`, { type: fileToUpload.type, size: fileToUpload.size });
    } else {
      console.log(`⏭️ Using file as-is (no uri, likely web File object)`);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `induction-${inductionId}-${timestamp}.pdf`;

    console.log(`📁 Uploading induction PDF: ${file.name} -> ${fileName} (bucket: ${PDF_BUCKET})`);
    console.log(`📤 Upload payload:`, { fileType: fileToUpload.type, fileSize: fileToUpload.size });

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase
      .storage
      .from(PDF_BUCKET)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from(PDF_BUCKET)
      .getPublicUrl(fileName);

    const pdf_file_url = urlData?.publicUrl;

    // Update induction with PDF info
    const { error: updateError } = await supabase
      .from('inductions')
      .update({
        pdf_file_url,
        pdf_file_name: file.name,
        pdf_storage_filename: fileName,
        pdf_uploaded_at: new Date().toISOString()
      })
      .eq('id', inductionId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ PDF uploaded successfully: ${pdf_file_url}`);
    return { 
      success: true, 
      data: { pdf_file_url, pdf_file_name: file.name },
      message: `PDF "${file.name}" uploaded successfully`
    };
  } catch (error) {
    console.error('Upload induction PDF error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload PDF file for visitor induction
 * @param {UUID} siteId - Site ID
 * @param {File} file - PDF file to upload
 * @returns {Object} { success, data: { pdf_file_url, pdf_file_name }, message, error }
 */
export async function uploadVisitorInductionPDF(siteId, file) {
  try {
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type (file.type may be undefined on some platforms)
    const isPdf = (file.type && file.type.includes('pdf')) || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return { success: false, error: 'Only PDF files are allowed' };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { 
        success: false, 
        error: `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)` 
      };
    }

    // Convert file URI to File object - handle expo-document-picker files with uri property
    let fileToUpload = file;
    console.log(`📋 Original file object:`, { 
      name: file.name, 
      size: file.size, 
      type: file.type, 
      mimeType: file.mimeType, 
      uri: file.uri ? '(exists)' : '(missing)' 
    });

    // Always convert if we have a URI (expo-document-picker format)
    if (file.uri) {
      // Fetch the actual file content from the URI and convert to File object
      const response = await fetch(file.uri);
      const blob = await response.blob();
      console.log(`📦 Blob created:`, { type: blob.type, size: blob.size });
      // Use mimeType if available (expo), otherwise use type or default to application/pdf
      const fileType = file.mimeType || file.type || 'application/pdf';
      fileToUpload = new File([blob], file.name, { type: fileType });
      console.log(`📄 File object created:`, { type: fileToUpload.type, size: fileToUpload.size });
    } else {
      console.log(`⏭️ Using file as-is (no uri, likely web File object)`);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `visitor-induction-${siteId}-${timestamp}.pdf`;

    console.log(`📁 Uploading visitor induction PDF: ${file.name} -> ${fileName} (bucket: ${PDF_BUCKET})`);
    console.log(`📤 Upload payload:`, { fileType: fileToUpload.type, fileSize: fileToUpload.size });

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase
      .storage
      .from(PDF_BUCKET)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from(PDF_BUCKET)
      .getPublicUrl(fileName);

    const pdf_file_url = urlData?.publicUrl;

    // Update visitor induction with PDF info
    const { error: updateError } = await supabase
      .from('visitor_inductions')
      .update({
        pdf_file_url,
        pdf_file_name: file.name,
        pdf_storage_filename: fileName,
        pdf_uploaded_at: new Date().toISOString()
      })
      .eq('site_id', siteId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ Visitor induction PDF uploaded successfully: ${pdf_file_url}`);
    return { 
      success: true, 
      data: { pdf_file_url, pdf_file_name: file.name },
      message: `PDF "${file.name}" uploaded successfully`
    };
  } catch (error) {
    console.error('Upload visitor induction PDF error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// PDF FILE DELETE
// ============================================================================

/**
 * Delete PDF file from contractor induction
 * @param {UUID} inductionId - Induction ID
 * @returns {Object} { success, message, error }
 */
export async function deleteInductionPDF(inductionId) {
  try {
    // Get current PDF info
    const { data: induction, error: fetchError } = await supabase
      .from('inductions')
      .select('pdf_file_url, pdf_storage_filename')
      .eq('id', inductionId)
      .single();

    if (fetchError) {
      console.error('Fetch induction error:', fetchError);
      return { success: false, error: 'Failed to fetch induction' };
    }

    if (!induction?.pdf_file_url) {
      return { success: false, error: 'No PDF found for this induction' };
    }

    // Use stored storage filename, or extract from URL if not available
    let fileName = induction.pdf_storage_filename;
    
    if (!fileName && induction.pdf_file_url) {
      // Extract filename from URL - handle multiple URL formats
      const urlParts = induction.pdf_file_url.split('/');
      fileName = urlParts[urlParts.length - 1];
      // Remove query parameters if present
      fileName = fileName.split('?')[0];
    }

    console.log(`🗑️ Deleting PDF from bucket "${PDF_BUCKET}":`);
    console.log(`   URL: ${induction.pdf_file_url}`);
    console.log(`   Storage filename: ${induction.pdf_storage_filename || '(not stored)'}`);
    console.log(`   Extracted filename: ${fileName}`);

    if (!fileName) {
      return { success: false, error: 'Could not determine PDF filename' };
    }

    // Delete from storage
    console.log(`📤 Sending delete request for: ${fileName}`);
    const { data: deleteData, error: deleteError } = await supabase
      .storage
      .from(PDF_BUCKET)
      .remove([fileName]);

    console.log(`📥 Delete response:`, { data: deleteData, error: deleteError });

    if (deleteError) {
      console.error('Delete storage error:', deleteError);
      // Don't return here - try to clear DB anyway in case file is already gone
    }

    // Clear PDF info from database regardless of storage delete result
    const { error: updateError } = await supabase
      .from('inductions')
      .update({
        pdf_file_url: null,
        pdf_file_name: null,
        pdf_storage_filename: null,
        pdf_uploaded_at: null
      })
      .eq('id', inductionId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { success: false, error: `Database update failed: ${updateError.message}` };
    }

    console.log(`✅ PDF deleted successfully from database`);
    return { success: true, message: 'PDF deleted successfully' };
  } catch (error) {
    console.error('Delete induction PDF error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete PDF file from visitor induction
 * @param {UUID} siteId - Site ID
 * @returns {Object} { success, message, error }
 */
export async function deleteVisitorInductionPDF(siteId) {
  try {
    // Get current PDF info
    const { data: induction, error: fetchError } = await supabase
      .from('visitor_inductions')
      .select('pdf_file_url, pdf_storage_filename')
      .eq('site_id', siteId)
      .single();

    if (fetchError) {
      console.error('Fetch visitor induction error:', fetchError);
      return { success: false, error: 'Failed to fetch visitor induction' };
    }

    if (!induction?.pdf_file_url) {
      return { success: false, error: 'No PDF found for this visitor induction' };
    }

    // Use stored storage filename, or extract from URL if not available
    let fileName = induction.pdf_storage_filename;
    
    if (!fileName && induction.pdf_file_url) {
      // Extract filename from URL - handle multiple URL formats
      const urlParts = induction.pdf_file_url.split('/');
      fileName = urlParts[urlParts.length - 1];
      // Remove query parameters if present
      fileName = fileName.split('?')[0];
    }

    console.log(`🗑️ Deleting visitor induction PDF from bucket "${PDF_BUCKET}":`);
    console.log(`   URL: ${induction.pdf_file_url}`);
    console.log(`   Storage filename: ${induction.pdf_storage_filename || '(not stored)'}`);
    console.log(`   Extracted filename: ${fileName}`);

    if (!fileName) {
      return { success: false, error: 'Could not determine PDF filename' };
    }

    // Delete from storage
    console.log(`📤 Sending delete request for: ${fileName}`);
    const { data: deleteData, error: deleteError } = await supabase
      .storage
      .from(PDF_BUCKET)
      .remove([fileName]);

    console.log(`📥 Delete response:`, { data: deleteData, error: deleteError });

    if (deleteError) {
      console.error('Delete storage error:', deleteError);
      // Don't return here - try to clear DB anyway in case file is already gone
    }

    // Clear PDF info from database regardless of storage delete result
    const { error: updateError } = await supabase
      .from('visitor_inductions')
      .update({
        pdf_file_url: null,
        pdf_file_name: null,
        pdf_storage_filename: null,
        pdf_uploaded_at: null
      })
      .eq('site_id', siteId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { success: false, error: `Database update failed: ${updateError.message}` };
    }

    console.log(`✅ Visitor induction PDF deleted successfully from database`);
    return { success: true, message: 'PDF deleted successfully' };
  } catch (error) {
    console.error('Delete visitor induction PDF error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// PDF VIEWING HELPER
// ============================================================================

/**
 * Get PDF viewer URL (using Google Docs Viewer for embedded display)
 * @param {string} pdfUrl - Direct URL to PDF file
 * @returns {string} Google Docs Viewer URL
 */
export function getPDFViewerUrl(pdfUrl) {
  if (!pdfUrl) return null;
  return `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
}

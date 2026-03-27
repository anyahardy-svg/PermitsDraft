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

    // Convert file to blob with proper type
    let fileBlob;
    if (file instanceof Blob) {
      // Create a new Blob with explicit PDF type to ensure correct Content-Type
      fileBlob = new Blob([file], { type: 'application/pdf' });
    } else if (file.uri) {
      // Handle expo-document-picker file objects
      const response = await fetch(file.uri);
      const blob = await response.blob();
      fileBlob = new Blob([blob], { type: 'application/pdf' });
    } else {
      return { success: false, error: 'Invalid file format' };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `induction-${inductionId}-${timestamp}.pdf`;

    console.log(`📁 Uploading induction PDF: ${file.name} -> ${fileName}`);

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase
      .storage
      .from(PDF_BUCKET)
      .upload(fileName, fileBlob, {
        cacheControl: '3600',
        contentType: 'application/pdf',
        upsert: false
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

    // Convert file to blob with proper type
    let fileBlob;
    if (file instanceof Blob) {
      // Create a new Blob with explicit PDF type to ensure correct Content-Type
      fileBlob = new Blob([file], { type: 'application/pdf' });
    } else if (file.uri) {
      // Handle expo-document-picker file objects
      const response = await fetch(file.uri);
      const blob = await response.blob();
      fileBlob = new Blob([blob], { type: 'application/pdf' });
    } else {
      return { success: false, error: 'Invalid file format' };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `visitor-induction-${siteId}-${timestamp}.pdf`;

    console.log(`📁 Uploading visitor induction PDF: ${file.name} -> ${fileName}`);

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase
      .storage
      .from(PDF_BUCKET)
      .upload(fileName, fileBlob, {
        cacheControl: '3600',
        contentType: 'application/pdf',
        upsert: false
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
      .select('pdf_file_url')
      .eq('id', inductionId)
      .single();

    if (fetchError || !induction?.pdf_file_url) {
      return { success: false, error: 'No PDF found for this induction' };
    }

    // Extract filename from URL
    const fileName = induction.pdf_file_url.split('/').pop();

    console.log(`🗑️ Deleting induction PDF: ${fileName}`);

    // Delete from storage
    const { error: deleteError } = await supabase
      .storage
      .from(PDF_BUCKET)
      .remove([fileName]);

    if (deleteError) {
      console.error('Delete storage error:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Clear PDF info from database
    const { error: updateError } = await supabase
      .from('inductions')
      .update({
        pdf_file_url: null,
        pdf_file_name: null,
        pdf_uploaded_at: null
      })
      .eq('id', inductionId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ PDF deleted successfully`);
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
      .select('pdf_file_url')
      .eq('site_id', siteId)
      .single();

    if (fetchError || !induction?.pdf_file_url) {
      return { success: false, error: 'No PDF found for this induction' };
    }

    // Extract filename from URL
    const fileName = induction.pdf_file_url.split('/').pop();

    console.log(`🗑️ Deleting visitor induction PDF: ${fileName}`);

    // Delete from storage
    const { error: deleteError } = await supabase
      .storage
      .from(PDF_BUCKET)
      .remove([fileName]);

    if (deleteError) {
      console.error('Delete storage error:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Clear PDF info from database
    const { error: updateError } = await supabase
      .from('visitor_inductions')
      .update({
        pdf_file_url: null,
        pdf_file_name: null,
        pdf_uploaded_at: null
      })
      .eq('site_id', siteId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ Visitor induction PDF deleted successfully`);
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

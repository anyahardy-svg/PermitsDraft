// Evidence Library API
// Handles reusable evidence items that can be used across multiple accreditation questions

import { supabase } from '../supabaseClient';

// Add file to company's evidence library
export const addToEvidenceLibrary = async (companyId, itemName, storagePath, fileName, fileSize) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('evidence_library_items')
      .insert({
        company_id: companyId,
        item_name: itemName,
        storage_path: storagePath,
        file_name: fileName,
        file_size: fileSize,
        uploaded_by: user?.id,
        is_active: true
      })
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (err) {
    console.error('Error adding to evidence library:', err);
    return { data: null, error: err.message };
  }
};

// Get all active evidence items for a company
export const getEvidenceLibrary = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('evidence_library_items')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching evidence library:', err);
    return { data: [], error: err.message };
  }
};

// Delete (soft delete) evidence item by marking as inactive
export const deleteEvidenceItem = async (itemId) => {
  try {
    const { data, error } = await supabase
      .from('evidence_library_items')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (err) {
    console.error('Error deleting evidence item:', err);
    return { data: null, error: err.message };
  }
};

// Update evidence item name
export const updateEvidenceItemName = async (itemId, newName) => {
  try {
    const { data, error } = await supabase
      .from('evidence_library_items')
      .update({ item_name: newName, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (err) {
    console.error('Error updating evidence item:', err);
    return { data: null, error: err.message };
  }
};

// Get a single evidence item's signed URL for download/preview
export const getEvidenceUrl = async (storagePath) => {
  try {
    const { data, error } = await supabase
      .storage
      .from('accreditations')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) throw error;
    return { url: data?.signedUrl, error: null };
  } catch (err) {
    console.error('Error getting evidence URL:', err);
    return { url: null, error: err.message };
  }
};

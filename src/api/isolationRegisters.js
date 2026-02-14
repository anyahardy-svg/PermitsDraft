import { supabase } from '../supabaseClient';

// Fetch all isolation registers
export const listIsolationRegisters = async () => {
  try {
    const { data, error } = await supabase
      .from('isolation_register')
      .select('*');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching isolation registers:', error);
    throw error;
  }
};

// Fetch isolation registers for a specific site
export const listIsolationRegistersBySite = async (siteId) => {
  try {
    const { data, error } = await supabase
      .from('isolation_register')
      .select('*')
      .eq('site_id', siteId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching isolation registers for site:', error);
    throw error;
  }
};

// Create a new isolation register entry
export const createIsolationRegister = async (data) => {
  try {
    const { data: result, error } = await supabase
      .from('isolation_register')
      .insert([data])
      .select()
      .single();
    
    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Error creating isolation register:', error);
    throw error;
  }
};

// Update an isolation register entry
export const updateIsolationRegister = async (id, data) => {
  try {
    const { data: result, error } = await supabase
      .from('isolation_register')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Error updating isolation register:', error);
    throw error;
  }
};

// Delete an isolation register entry
export const deleteIsolationRegister = async (id) => {
  try {
    const { error } = await supabase
      .from('isolation_register')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting isolation register:', error);
    throw error;
  }
};

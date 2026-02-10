import { supabase } from '../supabaseClient';

// Helper function to transform Supabase data to app format
const transformUser = (dbUser) => {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    siteIds: dbUser.site_ids || [],
    site_ids: dbUser.site_ids || [],
    sites: dbUser.site_names || [],
    site_names: dbUser.site_names || [],
    role: dbUser.role || 'user',
    isAdmin: dbUser.is_admin || false,
    is_admin: dbUser.is_admin || false,
    company: dbUser.company || '',
    createdAt: dbUser.created_at,
    created_at: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    updated_at: dbUser.updated_at,
  };
};

// Create a new permit issuer
export const createUser = async (userData) => {
  try {
    const { data, error } = await supabase
      .from('permit_issuers')
      .insert([{
        name: userData.name,
        email: userData.email,
        role: userData.role || 'user',
        is_admin: userData.isAdmin || false,
        company: userData.company || ''
      }])
      .select();

    if (error) throw error;
    
    // Now add the site associations
    const issuerId = data[0].id;
    if (userData.sites && userData.sites.length > 0) {
      // Get site IDs from site names
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id')
        .in('name', userData.sites);
      
      if (sitesData && sitesData.length > 0) {
        const issuerSites = sitesData.map(site => ({
          permit_issuer_id: issuerId,
          site_id: site.id
        }));
        
        await supabase
          .from('permit_issuer_sites')
          .insert(issuerSites);
      }
    }
    
    return data[0] ? transformUser(data[0]) : null;
  } catch (error) {
    console.error('Error creating permit issuer:', error.message);
    throw error;
  }
};

// Get all permit issuers
export const listUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('permit_issuers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    
    // For each issuer, get their associated sites
    const issuersWithSites = await Promise.all((data || []).map(async (issuer) => {
      const { data: siteData } = await supabase
        .from('permit_issuer_sites')
        .select('sites(name)')
        .eq('permit_issuer_id', issuer.id);
      
      const sites = siteData ? siteData.map(s => s.sites.name) : [];
      return transformUser({ ...issuer, site_names: sites });
    }));
    
    return issuersWithSites;
  } catch (error) {
    console.error('Error fetching permit issuers:', error.message);
    throw error;
  }
};

// Get a single permit issuer
export const getUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('permit_issuers')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    
    // Get their associated sites
    const { data: siteData } = await supabase
      .from('permit_issuer_sites')
      .select('sites(name)')
      .eq('permit_issuer_id', userId);
    
    const sites = siteData ? siteData.map(s => s.sites.name) : [];
    return data ? transformUser({ ...data, site_names: sites }) : null;
  } catch (error) {
    console.error('Error fetching permit issuer:', error.message);
    throw error;
  }
};

// Update a user
export const updateUser = async (userId, updates) => {
  try {
    const updateData = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin;
    if (updates.company !== undefined) updateData.company = updates.company;

    const { data, error } = await supabase
      .from('permit_issuers')
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) throw error;
    
    // Update site associations if provided
    if (updates.sites !== undefined) {
      // Delete old associations
      await supabase
        .from('permit_issuer_sites')
        .delete()
        .eq('permit_issuer_id', userId);
      
      // Add new associations
      if (updates.sites && updates.sites.length > 0) {
        const { data: sitesData } = await supabase
          .from('sites')
          .select('id')
          .in('name', updates.sites);
        
        if (sitesData && sitesData.length > 0) {
          const issuerSites = sitesData.map(site => ({
            permit_issuer_id: userId,
            site_id: site.id
          }));
          
          await supabase
            .from('permit_issuer_sites')
            .insert(issuerSites);
        }
      }
    }
    
    return data[0] ? transformUser(data[0]) : null;
  } catch (error) {
    console.error('Error updating user:', error.message);
    throw error;
  }
};

// Delete a user
export const deleteUser = async (userId) => {
  try {
    const { error } = await supabase
      .from('permit_issuers')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting user:', error.message);
    throw error;
  }
};



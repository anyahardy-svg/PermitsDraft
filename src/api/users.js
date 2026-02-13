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
        company: userData.company || '',
        site_ids: userData.siteIds || [],
        role: userData.role || 'user',
        is_admin: userData.isAdmin || false
      }])
      .select();

    if (error) throw error;
    
    return data[0] ? transformUser(data[0]) : null;
  } catch (error) {
    console.error('Error creating permit issuer:', error.message);
    throw error;
  }
};

// Get all permit issuers
export const listUsers = async () => {
  try {
    console.log('🔵 listUsers: Querying permit_issuers table...');
    const { data, error } = await supabase
      .from('permit_issuers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ listUsers DB error:', error);
      throw error;
    }
    
    console.log('📦 listUsers: Raw data from DB:', data);
    console.log(`📊 listUsers: Found ${(data || []).length} permit issuers`);
    
    if (!data || data.length === 0) {
      console.warn('⚠️ listUsers: No permit issuers found in database');
      return [];
    }
    
    // For each issuer, get their site names based on site_ids
    const usersWithSites = await Promise.all((data || []).map(async (user) => {
      try {
        console.log(`  Processing permit issuer: ${user.name} (${user.id})`, { site_ids: user.site_ids });
        let siteNames = [];
        if (user.site_ids && Array.isArray(user.site_ids) && user.site_ids.length > 0) {
          console.log(`    Looking up ${user.site_ids.length} site names for ${user.name}...`);
          const { data: sitesData, error: sitesError } = await supabase
            .from('sites')
            .select('id, name')
            .in('id', user.site_ids);
          if (sitesError) {
            console.error(`    ❌ Error looking up sites for ${user.name}:`, sitesError);
          } else {
            siteNames = sitesData ? sitesData.map(s => s.name) : [];
            console.log(`    ✅ Found ${siteNames.length} sites: ${siteNames.join(', ')}`);
          }
        }
        const transformed = transformUser({ ...user, site_names: siteNames });
        console.log(`  ✅ Transformed permit issuer ${user.name}:`, transformed);
        return transformed;
      } catch (mapError) {
        console.error(`  ❌ Error processing user ${user.name}:`, mapError);
        throw mapError;
      }
    }));
    
    console.log('✅ listUsers complete. Returning:', usersWithSites);
    return usersWithSites;
  } catch (error) {
    console.error('❌ Critical error in listUsers:', error.message, error);
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
    
    // Get site names if user has site_ids
    let siteNames = [];
    if (data.site_ids && data.site_ids.length > 0) {
      const { data: sitesData } = await supabase
        .from('sites')
        .select('name')
        .in('id', data.site_ids);
      siteNames = sitesData ? sitesData.map(s => s.name) : [];
    }
    
    return data ? transformUser({ ...data, site_names: siteNames }) : null;
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
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin;
    if (updates.siteIds !== undefined) updateData.site_ids = updates.siteIds;

    const { data, error } = await supabase
      .from('permit_issuers')
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) throw error;
    
    return data[0] ? transformUser(data[0]) : null;
  } catch (error) {
    console.error('Error updating user:', error.message);
    throw error;
  }
};
  }
;

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



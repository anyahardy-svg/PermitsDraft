import { supabase } from '../supabaseClient';

// Helper function to transform Supabase data to app format
const transformPermitIssuer = (dbUser) => {
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
export const createPermitIssuer = async (userData) => {
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
    
    return data[0] ? transformPermitIssuer(data[0]) : null;
  } catch (error) {
    console.error('Error creating permit issuer:', error.message);
    throw error;
  }
};

// Get all permit issuers
export const listPermitIssuers = async () => {
  try {
    console.log('🔵 listPermitIssuers: Querying permit_issuers table...');
    const { data, error, count, status } = await supabase
      .from('permit_issuers')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true });

    console.log('📋 Raw response object:', { data, error, count, status });
    
    if (error) {
      console.error('❌ listPermitIssuers DB error:', error);
      throw error;
    }
    
    console.log('📦 listPermitIssuers: Raw data from DB:', data);
    console.log(`📊 listPermitIssuers: Found ${(data || []).length} permit issuers (count: ${count})`);
    console.log('📋 Data structure sample:', data?.[0]);
    
    if (!data || data.length === 0) {
      console.warn('⚠️ listPermitIssuers: No permit issuers found in database');
      return [];
    }
    
    // For each issuer, try to get their site names based on site_ids
    // Use Promise.allSettled so one failure doesn't break the whole thing
    const sitePromises = (data || []).map(async (user) => {
      try {
        console.log(`  Processing permit issuer: ${user.name} (${user.id})`, { site_ids: user.site_ids });
        let siteNames = [];
        
        if (user.site_ids && Array.isArray(user.site_ids) && user.site_ids.length > 0) {
          console.log(`    Looking up ${user.site_ids.length} site names for ${user.name}...`);
          try {
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
          } catch (siteError) {
            console.error(`    ❌ Exception looking up sites for ${user.name}:`, siteError);
            // Continue anyway - just won't have site names for this issuer
          }
        }
        
        const transformed = transformPermitIssuer({ ...user, site_names: siteNames });
        console.log(`  ✅ Transformed permit issuer ${user.name}:`, transformed);
        return transformed;
      } catch (mapError) {
        console.error(`  ❌ Error processing permit issuer ${user.name}:`, mapError);
        // Still return the basic transform without site names
        return transformPermitIssuer(user);
      }
    });
    
    // Wait for all site lookups to complete (or fail gracefully)
    const permitIssuersWithSites = await Promise.all(sitePromises);
    
    console.log('✅ listPermitIssuers complete. Returning:', permitIssuersWithSites);
    return permitIssuersWithSites;
  } catch (error) {
    console.error('❌ Critical error in listPermitIssuers:', error.message, error);
    throw error;
  }
};

// Get a single permit issuer
export const getPermitIssuer = async (permitIssuerId) => {
  try {
    const { data, error } = await supabase
      .from('permit_issuers')
      .select('*')
      .eq('id', permitIssuerId)
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
    
    return data ? transformPermitIssuer({ ...data, site_names: siteNames }) : null;
  } catch (error) {
    console.error('Error fetching permit issuer:', error.message);
    throw error;
  }
};

// Update a permit issuer
export const updatePermitIssuer = async (permitIssuerId, updates) => {
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
      .eq('id', permitIssuerId)
      .select();

    if (error) throw error;
    
    return data[0] ? transformPermitIssuer(data[0]) : null;
  } catch (error) {
    console.error('Error updating permit issuer:', error.message);
    throw error;
  }
};

// Delete a permit issuer
export const deletePermitIssuer = async (permitIssuerId) => {
  try {
    const { error } = await supabase
      .from('permit_issuers')
      .delete()
      .eq('id', permitIssuerId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting permit issuer:', error.message);
    throw error;
  }
};

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
    businessUnitId: dbUser.business_unit_id || null,
    business_unit_id: dbUser.business_unit_id || null,
    permittedServiceIds: dbUser.permitted_service_ids || [],
    permitted_service_ids: dbUser.permitted_service_ids || [],
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
        business_unit_id: userData.businessUnitId || null,
        permitted_service_ids: userData.permittedServiceIds || [],
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
    if (data && data.length > 0) {
      console.log('📋 First issuer structure:', {
        id: data[0].id,
        name: data[0].name,
        site_ids: data[0].site_ids,
        site_names: data[0].site_names
      });
    }
    
    if (!data || data.length === 0) {
      console.warn('⚠️ listPermitIssuers: No permit issuers found in database');
      return [];
    }
    
    // For each issuer, try to get their site names based on site_ids
    const sitePromises = (data || []).map(async (user) => {
      try {
        console.log(`\n🔍 Processing: ${user.name} (ID: ${user.id})`);
        console.log(`   site_ids from DB:`, user.site_ids);
        
        let siteNames = [];
        let siteIds = user.site_ids || [];
        
        if (siteIds && Array.isArray(siteIds) && siteIds.length > 0) {
          console.log(`   Looking up names for ${siteIds.length} site IDs:`, siteIds);
          try {
            // Try the query
            const { data: sitesData, error: sitesError, status } = await supabase
              .from('sites')
              .select('id, name');
            
            if (sitesError) {
              console.error(`   ❌ Query error:`, sitesError, 'status:', status);
            } else {
              console.log(`   Query returned ${sitesData ? sitesData.length : 0} total sites`);
              if (sitesData && sitesData.length > 0) {
                console.log(`   Sample sites:`, sitesData.slice(0, 3).map(s => ({ id: s.id, name: s.name })));
                // Filter manually to only the site_ids we want
                siteNames = sitesData.filter(s => siteIds.includes(s.id)).map(s => s.name);
                console.log(`   ✅ Got ${siteNames.length} site names:`, siteNames);
              } else {
                console.warn(`   ⚠️ No sites found in database at all`);
              }
            }
          } catch (siteError) {
            console.error(`   ❌ Exception:`, siteError);
          }
        } else {
          console.log(`   No site_ids for this issuer`);
        }
        
        console.log(`   Final sites to return:`, {
          siteIds: siteIds,
          siteNames: siteNames
        });
        
        const transformed = transformPermitIssuer({ 
          ...user, 
          site_names: siteNames,
          site_ids: siteIds
        });
        console.log(`   ✅ Transformed:`, {
          id: transformed.id,
          name: transformed.name,
          siteIds: transformed.siteIds,
          sites: transformed.sites
        });
        return transformed;
      } catch (mapError) {
        console.error(`  ❌ Error processing ${user.name}:`, mapError);
        return transformPermitIssuer(user);
      }
    });
    
    // Wait for all site lookups
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
    if (updates.businessUnitId !== undefined) updateData.business_unit_id = updates.businessUnitId;
    if (updates.permittedServiceIds !== undefined) updateData.permitted_service_ids = updates.permittedServiceIds;

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

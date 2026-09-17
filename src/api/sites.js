import { supabase } from '../supabaseClient';
import { handleError } from '../utils/errorHandler';

// Helper function to transform Supabase data to app format
const transformSite = (dbSite) => {
  return {
    id: dbSite.id,
    name: dbSite.name,
    location: dbSite.location,
    businessUnitId: dbSite.business_unit_id,
    business_unit_id: dbSite.business_unit_id,
    kioskSubdomain: dbSite.kiosk_subdomain,
    kiosk_subdomain: dbSite.kiosk_subdomain,
    flag: dbSite.flag || false,
    rt: dbSite.rt || false,
    createdAt: dbSite.created_at,
    created_at: dbSite.created_at,
    updatedAt: dbSite.updated_at,
    updated_at: dbSite.updated_at,
  };
};

const fetchSiteWithRetry = async (buildQuery, label) => {
  let lastError;
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await buildQuery();
      if (error) throw error;

      if (process.env.NODE_ENV === 'development' && attempt > 1) {
        console.log(`🔄 ${label} loaded on attempt ${attempt}/${maxRetries}`);
      }

      return data;
    } catch (error) {
      lastError = error;

      if (process.env.NODE_ENV === 'development') {
        console.warn(`⏳ ${label} load attempt ${attempt}/${maxRetries} failed:`, error.message);
      }

      if (attempt < maxRetries) {
        const delayMs = baseDelay * attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  handleError(lastError, label, false);
  console.error(`❌ Failed to ${label} after retries`);
  return null;
};

// Get a single site by kiosk subdomain (kiosk boot path)
export const getSiteByKioskSubdomain = async (kioskSubdomain) => {
  if (!kioskSubdomain) {
    return null;
  }

  const data = await fetchSiteWithRetry(
    () => supabase
      .from('sites')
      .select('*')
      .eq('kiosk_subdomain', kioskSubdomain)
      .maybeSingle(),
    'site by kiosk subdomain'
  );

  return data ? transformSite(data) : null;
};

// Get the first site (development / preview fallback)
export const getFirstSite = async () => {
  const data = await fetchSiteWithRetry(
    () => supabase
      .from('sites')
      .select('*')
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle(),
    'first site'
  );

  return data ? transformSite(data) : null;
};

// Get all sites
export const listSites = async () => {
  const data = await fetchSiteWithRetry(
    () => supabase
      .from('sites')
      .select('*')
      .order('name', { ascending: true }),
    'sites'
  );

  return (data || []).map(transformSite);
};
// Get sites for specific business unit(s)
export const getSitesByBusinessUnits = async (businessUnitIds) => {
  try {
    if (!businessUnitIds || businessUnitIds.length === 0) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .in('business_unit_id', businessUnitIds)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformSite);
  } catch (error) {
    console.error('Error fetching sites by business unit:', error.message);
    return [];
  }
};
// Get a single site by ID
export const getSite = async (siteId) => {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single();

    if (error) throw error;
    return data ? transformSite(data) : null;
  } catch (error) {
    console.error('Error fetching site:', error.message);
    throw error;
  }
};

// Get a site by name (case-insensitive)
export const getSiteByName = async (siteName) => {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .ilike('name', siteName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No results found
        return null;
      }
      throw error;
    }
    return data ? transformSite(data) : null;
  } catch (error) {
    console.error('Error fetching site by name:', error.message);
    throw error;
  }
};

// Create a new site
export const createSite = async (siteData) => {
  try {
    const { data, error } = await supabase
      .from('sites')
      .insert([siteData])
      .select();

    if (error) throw error;
    return data[0] ? transformSite(data[0]) : null;
  } catch (error) {
    console.error('Error creating site:', error.message);
    throw error;
  }
};

// Update a site
export const updateSite = async (siteId, updates) => {
  try {
    const { data, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', siteId)
      .select();

    if (error) throw error;
    return data[0] ? transformSite(data[0]) : null;
  } catch (error) {
    console.error('Error updating site:', error.message);
    throw error;
  }
};

// Delete a site
export const deleteSite = async (siteId) => {
  try {
    const { data, error } = await supabase
      .from('sites')
      .delete()
      .eq('id', siteId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting site:', error.message);
    throw error;
  }
};

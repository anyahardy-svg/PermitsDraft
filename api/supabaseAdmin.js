const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function fetchAuthUserByEmail(email) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !email) {
    return null;
  }

  const getUserUrl = `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
  const getUserResponse = await fetch(getUserUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!getUserResponse.ok) {
    return null;
  }

  const usersData = await getUserResponse.json();
  if (!usersData.users || usersData.users.length === 0) {
    return null;
  }

  return usersData.users[0];
}

async function findAuthUserStrictCaseInsensitive(adminClient, email) {
  const trimmed = String(email || '').trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  const direct = await fetchAuthUserByEmail(trimmed);
  if (direct?.email && direct.email.toLowerCase() === lower) {
    return direct;
  }

  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) {
      break;
    }

    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === lower);
    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

async function findAuthUserCaseInsensitive(adminClient, email) {
  return findAuthUserStrictCaseInsensitive(adminClient, email);
}

async function resolveAuthEmailCaseInsensitive(adminClient, email) {
  const trimmed = String(email || '').trim();
  if (!trimmed) {
    return null;
  }

  const user = await findAuthUserStrictCaseInsensitive(adminClient, trimmed);
  return user?.email || trimmed;
}

function emailsMatch(left, right) {
  if (!left || !right) {
    return false;
  }

  return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
}

function contractorBelongsToAuthUser(contractor, user, options = {}) {
  if (!contractor || !user?.email) {
    return false;
  }

  const contractorEmail = String(contractor.email || '').trim();
  if (!contractorEmail) {
    return options.trustedMetadataLink === true;
  }

  return emailsMatch(contractor.email, user.email);
}

function pickBestContractorRow(rows) {
  if (!rows?.length) {
    return null;
  }

  return rows.find((row) => row.company_id) || rows[0];
}

async function lookupContractorByEmail(adminClient, email) {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) {
    return null;
  }

  const { data: exactMatches, error: exactError } = await adminClient
    .from('contractors')
    .select('id, name, company_id, email, created_at')
    .eq('email', normalizedEmail)
    .order('created_at', { ascending: false })
    .limit(5);

  if (exactError) {
    console.error('❌ Contractor exact lookup error:', exactError.message);
  }

  const exactMatch = pickBestContractorRow(exactMatches);
  if (exactMatch) {
    return exactMatch;
  }

  const { data: caseInsensitiveMatches, error: ilikeError } = await adminClient
    .from('contractors')
    .select('id, name, company_id, email, created_at')
    .ilike('email', normalizedEmail)
    .order('created_at', { ascending: false })
    .limit(5);

  if (ilikeError) {
    console.error('❌ Contractor ilike lookup error:', ilikeError.message);
  }

  return pickBestContractorRow(caseInsensitiveMatches);
}

async function lookupContractorForAuthUser(adminClient, user) {
  const metadata = user.user_metadata || {};
  const normalizedEmail = String(user.email || '').trim();
  if (!normalizedEmail) {
    return null;
  }

  // Email on the contractor row is the source of truth — check it before JWT metadata.
  const contractorByEmail = await lookupContractorByEmail(adminClient, normalizedEmail);
  if (contractorByEmail && contractorBelongsToAuthUser(contractorByEmail, user)) {
    return contractorByEmail;
  }

  if (metadata.company_id) {
    const { data: byEmailAndCompanyRows } = await adminClient
      .from('contractors')
      .select('id, name, company_id, email, created_at')
      .ilike('email', normalizedEmail)
      .eq('company_id', metadata.company_id)
      .order('created_at', { ascending: false })
      .limit(5);

    const byEmailAndCompany = pickBestContractorRow(byEmailAndCompanyRows);
    if (byEmailAndCompany && contractorBelongsToAuthUser(byEmailAndCompany, user)) {
      return byEmailAndCompany;
    }
  }

  if (metadata.contractor_id) {
    const { data: contractorById } = await adminClient
      .from('contractors')
      .select('id, name, company_id, email')
      .eq('id', metadata.contractor_id)
      .maybeSingle();

    const trustedMetadataLink = contractorById?.id === metadata.contractor_id;
    if (
      contractorById &&
      contractorBelongsToAuthUser(contractorById, user, { trustedMetadataLink })
    ) {
      return contractorById;
    }

    if (contractorById && !contractorBelongsToAuthUser(contractorById, user, { trustedMetadataLink })) {
      console.warn(
        `⚠️ Ignoring mismatched contractor_id for ${user.email}: linked to ${contractorById.email}`
      );
    }
  }

  return null;
}

async function getCompanyIdForAuthEmail(adminClient, email) {
  const trimmed = String(email || '').trim();
  if (!trimmed) {
    return null;
  }

  const { data: byContact } = await adminClient
    .from('companies')
    .select('id')
    .ilike('contact_email', trimmed)
    .order('name', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (byContact?.id) {
    return byContact.id;
  }

  const { data: byEmail } = await adminClient
    .from('companies')
    .select('id')
    .ilike('email', trimmed)
    .order('name', { ascending: true })
    .limit(1)
    .maybeSingle();

  return byEmail?.id || null;
}

async function getCompanyAdminAccessForEmail(adminClient, email) {
  const trimmed = String(email || '').trim();
  if (!trimmed) {
    return null;
  }

  const { data, error } = await adminClient
    .from('company_admin_access')
    .select('company_id, name, granted_at')
    .ilike('email', trimmed)
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ company_admin_access lookup error:', error.message);
    return null;
  }

  return data;
}

async function grantCompanyAdminAccess(adminClient, { email, companyId, name }) {
  const trimmed = String(email || '').trim();
  if (!trimmed || !companyId) {
    return;
  }

  const { error } = await adminClient.from('company_admin_access').upsert(
    {
      email: trimmed,
      company_id: companyId,
      name: name || null,
      granted_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,email' }
  );

  if (error) {
    console.error('❌ Failed to grant company admin access:', error.message);
  }
}

async function syncInvitedAdminAuthUser(adminClient, { email, companyId, companyName, name }) {
  const trimmed = String(email || '').trim();
  if (!trimmed || !companyId) {
    return null;
  }

  const user = await findAuthUserStrictCaseInsensitive(adminClient, trimmed);
  const metadataPatch = {
    company_id: companyId,
    company_name: companyName || null,
    user_type: 'admin_staff',
    name: name || user?.user_metadata?.name || trimmed,
  };

  if (!user) {
    return null;
  }

  const { error } = await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata || {}),
      ...metadataPatch,
    },
  });

  if (error) {
    console.error('❌ Failed to sync invited admin auth user:', error.message);
    return null;
  }

  return user;
}

/**
 * Resolve company for an auth user.
 * Priority: explicit invite companyId → invitation grant table → admin_staff metadata → company contact fields.
 */
async function resolveValidatedCompanyIdForAuthUser(adminClient, user, preferredCompanyId = null) {
  const metadata = user.user_metadata || {};
  const trimmed = String(user.email || '').trim();

  if (preferredCompanyId) {
    const { data: preferredCompany } = await adminClient
      .from('companies')
      .select('id')
      .eq('id', preferredCompanyId)
      .maybeSingle();

    if (preferredCompany?.id) {
      return preferredCompany.id;
    }
  }

  const adminAccess = await getCompanyAdminAccessForEmail(adminClient, trimmed);
  if (adminAccess?.company_id) {
    return adminAccess.company_id;
  }

  const metadataCompanyId = metadata.company_id;
  if (metadataCompanyId && metadata.user_type === 'admin_staff') {
    const { data: metadataCompany } = await adminClient
      .from('companies')
      .select('id, contact_email, email')
      .eq('id', metadataCompanyId)
      .maybeSingle();

    if (
      metadataCompany?.id &&
      (emailsMatch(metadataCompany.contact_email, trimmed) ||
        emailsMatch(metadataCompany.email, trimmed))
    ) {
      return metadataCompany.id;
    }

    if (metadataCompany?.id) {
      console.warn(
        `⚠️ Ignoring stale metadata.company_id for ${trimmed}: does not match company contact email`
      );
    }
  }

  const emailCompanyId = await getCompanyIdForAuthEmail(adminClient, trimmed);
  if (emailCompanyId) {
    return emailCompanyId;
  }

  if (!metadataCompanyId) {
    return null;
  }

  const { data: company } = await adminClient
    .from('companies')
    .select('id, contact_email, email')
    .eq('id', metadataCompanyId)
    .maybeSingle();

  if (!company) {
    return null;
  }

  if (metadata.user_type === 'admin_staff') {
    return company.id;
  }

  if (emailsMatch(company.contact_email, trimmed) || emailsMatch(company.email, trimmed)) {
    return company.id;
  }

  return null;
}

async function getLatestApprovedJoinRequest(adminClient, email) {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) {
    return null;
  }

  const { data: joinRequest } = await adminClient
    .from('contractor_join_requests')
    .select('company_id, user_type, will_work_on_site')
    .ilike('email', normalizedEmail)
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return joinRequest || null;
}

async function getLatestApprovedJoinRequestCompanyId(adminClient, email) {
  const joinRequest = await getLatestApprovedJoinRequest(adminClient, email);
  return joinRequest?.company_id || null;
}

async function syncAuthUserContractorMetadata(adminClient, user, contractor) {
  const metadata = user.user_metadata || {};
  if (!contractor) {
    return;
  }

  const trustedMetadataLink = metadata.contractor_id === contractor.id;
  if (!contractorBelongsToAuthUser(contractor, user, { trustedMetadataLink })) {
    console.warn(
      `⚠️ Refusing to sync metadata for ${user.email} with contractor ${contractor.id} (${contractor.email})`
    );
    return;
  }

  const contractorIdMatches = metadata.contractor_id === contractor.id;
  const companyIdMatches = metadata.company_id === contractor.company_id;
  if (contractorIdMatches && companyIdMatches) {
    return;
  }

  const contractorEmail = String(contractor.email || '').trim();
  if (!contractorEmail && user.email) {
    const { error: contractorEmailError } = await adminClient
      .from('contractors')
      .update({ email: user.email })
      .eq('id', contractor.id);

    if (contractorEmailError) {
      console.warn('⚠️ Failed to backfill contractor email:', contractorEmailError.message);
    } else {
      contractor.email = user.email;
      console.log(`✅ Backfilled contractor email for ${contractor.id}`);
    }
  }

  const { error } = await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...metadata,
      contractor_id: contractor.id,
      contractor_name: contractor.name,
      company_id: contractor.company_id,
      name: contractor.name,
      user_type: metadata.user_type || 'contractor',
    },
  });

  if (error) {
    console.warn('⚠️ Failed to sync contractor metadata:', error.message);
    return;
  }

  console.log(`✅ Synced contractor metadata for ${user.email}`);
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  getSupabaseAdmin,
  fetchAuthUserByEmail,
  findAuthUserCaseInsensitive,
  findAuthUserStrictCaseInsensitive,
  resolveAuthEmailCaseInsensitive,
  emailsMatch,
  contractorBelongsToAuthUser,
  lookupContractorByEmail,
  lookupContractorForAuthUser,
  getLatestApprovedJoinRequestCompanyId,
  getLatestApprovedJoinRequest,
  getCompanyIdForAuthEmail,
  getCompanyAdminAccessForEmail,
  grantCompanyAdminAccess,
  syncInvitedAdminAuthUser,
  resolveValidatedCompanyIdForAuthUser,
  syncAuthUserContractorMetadata,
};

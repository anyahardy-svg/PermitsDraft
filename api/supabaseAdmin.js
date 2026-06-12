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

function contractorBelongsToAuthUser(contractor, user) {
  return !!contractor && emailsMatch(contractor.email, user?.email);
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

    if (contractorById && contractorBelongsToAuthUser(contractorById, user)) {
      return contractorById;
    }

    if (contractorById && !contractorBelongsToAuthUser(contractorById, user)) {
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
    .limit(1)
    .maybeSingle();

  if (byContact?.id) {
    return byContact.id;
  }

  const { data: byEmail } = await adminClient
    .from('companies')
    .select('id')
    .ilike('email', trimmed)
    .limit(1)
    .maybeSingle();

  return byEmail?.id || null;
}

/**
 * Resolve company for an auth user without trusting JWT alone.
 * Returns company_id only when the user's email matches companies.contact_email/email
 * or when metadata.company_id matches such a company row.
 */
async function resolveValidatedCompanyIdForAuthUser(adminClient, user) {
  const metadata = user.user_metadata || {};
  const emailCompanyId = await getCompanyIdForAuthEmail(adminClient, user.email);
  if (emailCompanyId) {
    return emailCompanyId;
  }

  const metadataCompanyId = metadata.company_id;
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

  if (emailsMatch(company.contact_email, user.email) || emailsMatch(company.email, user.email)) {
    return company.id;
  }

  return null;
}

async function getLatestApprovedJoinRequestCompanyId(adminClient, email) {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) {
    return null;
  }

  const { data: joinRequest } = await adminClient
    .from('contractor_join_requests')
    .select('company_id')
    .ilike('email', normalizedEmail)
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return joinRequest?.company_id || null;
}

async function syncAuthUserContractorMetadata(adminClient, user, contractor) {
  const metadata = user.user_metadata || {};
  if (!contractor) {
    return;
  }

  if (!contractorBelongsToAuthUser(contractor, user)) {
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
  getCompanyIdForAuthEmail,
  resolveValidatedCompanyIdForAuthUser,
  syncAuthUserContractorMetadata,
};

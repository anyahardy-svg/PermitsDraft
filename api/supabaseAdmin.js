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

async function findAuthUserCaseInsensitive(adminClient, email) {
  const resolvedEmail = await resolveAuthEmailCaseInsensitive(adminClient, email);
  if (!resolvedEmail) {
    return null;
  }

  let user = await fetchAuthUserByEmail(resolvedEmail);
  if (user) {
    return user;
  }

  const lower = resolvedEmail.toLowerCase();
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

async function resolveAuthEmailCaseInsensitive(adminClient, email) {
  const trimmed = String(email || '').trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  const candidates = new Set([trimmed, lower]);

  const contractor = await lookupContractorByEmail(adminClient, trimmed);
  if (contractor?.email) {
    candidates.add(contractor.email);
  }

  const { data: joinRequest } = await adminClient
    .from('contractor_join_requests')
    .select('email')
    .ilike('email', trimmed)
    .eq('status', 'approved')
    .maybeSingle();

  if (joinRequest?.email) {
    candidates.add(joinRequest.email);
  }

  for (const candidate of candidates) {
    const user = await fetchAuthUserByEmail(candidate);
    if (user?.email) {
      return user.email;
    }
  }

  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) {
      break;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === lower);
    if (match?.email) {
      return match.email;
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return contractor?.email || joinRequest?.email || trimmed;
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

async function lookupContractorByEmail(adminClient, email) {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) {
    return null;
  }

  const { data: exactMatch, error: exactError } = await adminClient
    .from('contractors')
    .select('id, name, company_id, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (exactError) {
    console.error('❌ Contractor exact lookup error:', exactError.message);
  }

  if (exactMatch) {
    return exactMatch;
  }

  const { data: caseInsensitiveMatch, error: ilikeError } = await adminClient
    .from('contractors')
    .select('id, name, company_id, email')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (ilikeError) {
    console.error('❌ Contractor ilike lookup error:', ilikeError.message);
  }

  return caseInsensitiveMatch || null;
}

async function lookupContractorForAuthUser(adminClient, user) {
  const metadata = user.user_metadata || {};
  const normalizedEmail = String(user.email || '').trim();
  if (!normalizedEmail) {
    return null;
  }

  // Prefer the contractor row at the company stored in auth metadata (e.g. after join approval).
  if (metadata.company_id) {
    const { data: byEmailAndCompany } = await adminClient
      .from('contractors')
      .select('id, name, company_id, email')
      .ilike('email', normalizedEmail)
      .eq('company_id', metadata.company_id)
      .maybeSingle();

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

  const contractorByEmail = await lookupContractorByEmail(adminClient, normalizedEmail);
  if (contractorByEmail && contractorBelongsToAuthUser(contractorByEmail, user)) {
    return contractorByEmail;
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
  resolveAuthEmailCaseInsensitive,
  emailsMatch,
  contractorBelongsToAuthUser,
  lookupContractorByEmail,
  lookupContractorForAuthUser,
  getLatestApprovedJoinRequestCompanyId,
  syncAuthUserContractorMetadata,
};

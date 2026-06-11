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

async function syncAuthUserContractorMetadata(adminClient, user, contractor) {
  const metadata = user.user_metadata || {};
  if (!contractor || metadata.contractor_id === contractor.id) {
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
  resolveAuthEmailCaseInsensitive,
  lookupContractorByEmail,
  syncAuthUserContractorMetadata,
};

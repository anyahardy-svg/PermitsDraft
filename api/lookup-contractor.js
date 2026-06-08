/**
 * Look up a contractor record for the authenticated user.
 * Uses the service role so RLS cannot block login after password setup.
 *
 * Usage: POST /api/lookup-contractor
 * Headers: Authorization: Bearer <supabase_access_token>
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function fetchContractorByEmail(email) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  const exactResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/contractors?select=id,name,company_id,email&email=eq.${encodeURIComponent(email)}&limit=1`,
    { method: 'GET', headers }
  );

  if (exactResponse.ok) {
    const exactMatches = await exactResponse.json();
    if (Array.isArray(exactMatches) && exactMatches.length > 0) {
      return exactMatches[0];
    }
  }

  const ilikeResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/contractors?select=id,name,company_id,email&email=ilike.${encodeURIComponent(email)}&limit=1`,
    { method: 'GET', headers }
  );

  if (!ilikeResponse.ok) {
    const errorText = await ilikeResponse.text();
    console.error('❌ Contractor lookup failed:', ilikeResponse.status, errorText);
    return null;
  }

  const matches = await ilikeResponse.json();
  return Array.isArray(matches) && matches.length > 0 ? matches[0] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase configuration for contractor lookup');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const accessToken = authHeader.slice('Bearer '.length).trim();
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = await userResponse.json();
    if (!user?.email) {
      return res.status(400).json({ error: 'Authenticated user has no email' });
    }

    const metadata = user.user_metadata || {};
    if (metadata.contractor_id) {
      const byIdResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/contractors?select=id,name,company_id,email&id=eq.${encodeURIComponent(metadata.contractor_id)}&limit=1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (byIdResponse.ok) {
        const byIdMatches = await byIdResponse.json();
        if (Array.isArray(byIdMatches) && byIdMatches.length > 0) {
          return res.status(200).json({ success: true, contractor: byIdMatches[0] });
        }
      }
    }

    const contractor = await fetchContractorByEmail(user.email);
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor record not found' });
    }

    if (!metadata.contractor_id) {
      const syncResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          user_metadata: {
            ...metadata,
            contractor_id: contractor.id,
            contractor_name: contractor.name,
            company_id: contractor.company_id,
            name: contractor.name,
            user_type: metadata.user_type || 'contractor',
          },
        }),
      });

      if (!syncResponse.ok) {
        console.warn('⚠️ Failed to sync contractor metadata:', await syncResponse.text());
      } else {
        console.log(`✅ Synced contractor metadata for ${user.email}`);
      }
    }

    return res.status(200).json({ success: true, contractor });
  } catch (error) {
    console.error('❌ lookup-contractor error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}

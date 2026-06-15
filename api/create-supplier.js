/**
 * Backend endpoint to create or update suppliers using the service role key.
 * Allows the admin panel (custom auth) to add suppliers and import CSV data.
 *
 * Usage:
 *   POST /api/create-supplier
 *   Body: { company_name, risk_classification?, status?, contact_email?, tech_contact_name?, accreditation_deadline?, upsert? }
 */

import { ensureSupplierFormRecord } from './lib/supplierFormStorage.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const VALID_RISK_LEVELS = new Set(['Critical', 'High', 'Medium', 'Low']);
const VALID_STATUSES = new Set(['active', 'inactive']);

const serviceRoleHeaders = (serviceRoleKey, prefer = 'return=representation') => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  Prefer: prefer,
});

function normalizeRiskClassification(value) {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  if (VALID_RISK_LEVELS.has(normalized)) {
    return normalized;
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('critical')) return 'Critical';
  if (lower.includes('high')) return 'High';
  if (lower.includes('medium')) return 'Medium';
  if (lower.includes('low')) return 'Low';

  return null;
}

function normalizeStatus(value) {
  if (!value) {
    return 'active';
  }

  const normalized = String(value).trim().toLowerCase();
  return VALID_STATUSES.has(normalized) ? normalized : 'active';
}

function buildSupplierPayload(body) {
  const payload = {};

  if (body.company_name !== undefined) {
    payload.company_name = String(body.company_name).trim();
  }
  if (body.risk_classification !== undefined) {
    payload.risk_classification = normalizeRiskClassification(body.risk_classification);
  }
  if (body.status !== undefined) {
    payload.status = normalizeStatus(body.status);
  }
  if (body.contact_email !== undefined) {
    const email = String(body.contact_email).trim();
    payload.contact_email = email || null;
  }
  if (body.tech_contact_name !== undefined) {
    const name = String(body.tech_contact_name).trim();
    payload.tech_contact_name = name || null;
  }
  if (body.accreditation_deadline !== undefined) {
    payload.accreditation_deadline = body.accreditation_deadline || null;
  }
  if (body.invitation_sent_at !== undefined) {
    payload.invitation_sent_at = body.invitation_sent_at || null;
  }
  if (body.company_email !== undefined) {
    const email = String(body.company_email).trim();
    payload.company_email = email || null;
  }
  if (body.contact_surname !== undefined) {
    const surname = String(body.contact_surname).trim();
    payload.contact_surname = surname || null;
  }
  if (body.contact_phone !== undefined) {
    const phone = String(body.contact_phone).trim();
    payload.contact_phone = phone || null;
  }
  if (body.nzbn !== undefined) {
    const nzbn = String(body.nzbn).trim();
    payload.nzbn = nzbn || null;
  }
  if (body.address_1 !== undefined) {
    const address = String(body.address_1).trim();
    payload.address_1 = address || null;
  }
  if (body.address_city !== undefined) {
    const city = String(body.address_city).trim();
    payload.address_city = city || null;
  }
  if (body.address_postcode !== undefined) {
    const postcode = String(body.address_postcode).trim();
    payload.address_postcode = postcode || null;
  }

  return payload;
}

async function findSupplierByName(serviceRoleKey, companyName) {
  const response = await fetch(
      `${SUPABASE_URL}/rest/v1/suppliers?company_name=ilike.${encodeURIComponent(companyName.trim())}&select=*&limit=5`,
    {
      headers: serviceRoleHeaders(serviceRoleKey, ''),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to look up supplier: ${errorText}`);
  }

  const suppliers = await response.json();
  return suppliers.find(
    (supplier) => supplier.company_name?.trim().toLowerCase() === companyName.trim().toLowerCase()
  ) || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: 'Supabase service role is not configured on the server',
    });
  }

  const body = req.body || {};
  const payload = buildSupplierPayload(body);

  if (!payload.company_name) {
    return res.status(400).json({ error: 'company_name is required' });
  }

  try {
    if (body.upsert) {
      const existing = await findSupplierByName(SUPABASE_SERVICE_ROLE_KEY, payload.company_name);

      if (existing?.id) {
        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${existing.id}`,
          {
            method: 'PATCH',
            headers: serviceRoleHeaders(SUPABASE_SERVICE_ROLE_KEY),
            body: JSON.stringify(payload),
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('Failed to update supplier:', errorText);
          return res.status(updateResponse.status).json({ error: 'Failed to update supplier' });
        }

        const updated = await updateResponse.json();
        return res.status(200).json({
          ...(updated[0] || updated),
          _action: 'updated',
        });
      }
    }

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/suppliers`, {
      method: 'POST',
      headers: serviceRoleHeaders(SUPABASE_SERVICE_ROLE_KEY),
      body: JSON.stringify({
        company_name: payload.company_name,
        risk_classification: payload.risk_classification ?? null,
        status: payload.status || 'active',
        contact_email: payload.contact_email ?? null,
        tech_contact_name: payload.tech_contact_name ?? null,
        company_email: payload.company_email ?? null,
        contact_surname: payload.contact_surname ?? null,
        contact_phone: payload.contact_phone ?? null,
        nzbn: payload.nzbn ?? null,
        address_1: payload.address_1 ?? null,
        address_city: payload.address_city ?? null,
        address_postcode: payload.address_postcode ?? null,
        accreditation_deadline: payload.accreditation_deadline ?? null,
        invitation_sent_at: payload.invitation_sent_at ?? null,
      }),
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('Failed to create supplier:', errorText);
      return res.status(insertResponse.status).json({ error: 'Failed to create supplier' });
    }

    const created = await insertResponse.json();
    const supplier = created[0] || created;
    await ensureSupplierFormRecord(supplier.id);

    return res.status(200).json({
      ...supplier,
      _action: 'created',
    });
  } catch (error) {
    console.error('create-supplier error:', error);
    return res.status(500).json({ error: error.message || 'Failed to save supplier' });
  }
}

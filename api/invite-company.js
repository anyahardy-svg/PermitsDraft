/**
 * Create a contractor company and send an accreditation invitation email.
 *
 * Public usage (standalone link):
 *   POST /api/invite-company
 *   Body: { companyName, email, contractor_type?, deadline?, siteId?, contactName? }
 *
 * Manager / admin usage (optional requestingAdminId for site access + assignees):
 *   Body: { ..., requestingAdminId, assignedManagerId?, assignedHsPersonId? }
 */

const { getSupabaseAdmin } = require('./supabaseAdmin');
const { assertManagerAccess } = require('./lib/managerAccess');

const VALID_CONTRACTOR_TYPES = new Set(['A', 'B', 'C', 'D']);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeContractorType(value) {
  const type = String(value || 'D').trim().toUpperCase();
  return VALID_CONTRACTOR_TYPES.has(type) ? type : 'D';
}

async function resolveAdminAssigneeId(adminClient, assigneeId) {
  if (!assigneeId) {
    return null;
  }

  const { data, error } = await adminClient
    .from('admin_users')
    .select('id')
    .eq('id', assigneeId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data?.id) {
    return { error: 'Invalid approval assignee on invite link', status: 400 };
  }

  return data.id;
}

function getRequestOrigin(req) {
  const configured = (process.env.REACT_APP_BASE_URL || '').replace(/\/$/, '');
  if (configured) {
    return configured;
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  if (host) {
    return `${proto}://${host}`.replace(/\/$/, '');
  }
  return 'https://contractorhq.co.nz';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'Supabase service role is not configured on the server' });
  }

  try {
    const {
      companyName,
      email,
      contractor_type: contractorTypeInput,
      deadline,
      siteId,
      contactName,
      assignedManagerId,
      assignedHsPersonId,
      requestingAdminId,
    } = req.body || {};

    const name = String(companyName || '').trim();
    const normalizedEmail = normalizeEmail(email);

    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'A valid contact email is required' });
    }

    const contractorType = normalizeContractorType(contractorTypeInput);
    let siteIds = [];
    let managerId = null;
    let hsPersonId = null;

    if (requestingAdminId) {
      const access = await assertManagerAccess(requestingAdminId, siteId || null);
      if (access.error) {
        return res.status(access.status || 403).json({ error: access.error });
      }

      if (siteId) {
        siteIds = [siteId];
      }

      managerId = assignedManagerId || (access.manager?.role === 'manager' ? requestingAdminId : null);
      hsPersonId = assignedHsPersonId || null;
    } else {
      if (siteId) {
        const { data: siteRow, error: siteError } = await admin
          .from('sites')
          .select('id')
          .eq('id', siteId)
          .maybeSingle();

        if (siteError) {
          throw siteError;
        }
        if (!siteRow) {
          return res.status(400).json({ error: 'Invalid site' });
        }
        siteIds = [siteId];
      }

      const resolvedManager = await resolveAdminAssigneeId(admin, assignedManagerId || null);
      if (resolvedManager && typeof resolvedManager === 'object' && resolvedManager.error) {
        return res.status(resolvedManager.status || 400).json({ error: resolvedManager.error });
      }
      managerId = resolvedManager || null;

      const resolvedHs = await resolveAdminAssigneeId(admin, assignedHsPersonId || null);
      if (resolvedHs && typeof resolvedHs === 'object' && resolvedHs.error) {
        return res.status(resolvedHs.status || 400).json({ error: resolvedHs.error });
      }
      hsPersonId = resolvedHs || null;
    }

    const insertPayload = {
      name,
      email: normalizedEmail,
      contact_email: normalizedEmail,
      contractor_type: contractorType,
      accreditation_status: 'none',
      manually_created: true,
      company_active: true,
      site_ids: siteIds,
      assigned_manager_id: managerId,
      assigned_hs_person_id: hsPersonId,
      contact_name: contactName ? String(contactName).trim() : null,
    };

    const { data: createdRows, error: createError } = await admin
      .from('companies')
      .insert([insertPayload])
      .select('id, name')
      .limit(1);

    if (createError) {
      throw createError;
    }

    const company = createdRows?.[0];
    if (!company?.id) {
      return res.status(500).json({ error: 'Failed to create company' });
    }

    const origin = getRequestOrigin(req);
    const emailResponse = await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'invitation',
        toEmail: normalizedEmail,
        companyName: name,
        deadline: deadline || null,
        companyId: company.id,
        contactName: contactName ? String(contactName).trim() : null,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.json().catch(() => ({}));
      return res.status(502).json({
        error: emailError.error || 'Company was created but the invitation email could not be sent',
        companyId: company.id,
        emailSent: false,
      });
    }

    return res.status(200).json({
      success: true,
      companyId: company.id,
      emailSent: true,
    });
  } catch (error) {
    console.error('invite-company error:', error);
    return res.status(500).json({ error: error.message || 'Failed to invite company' });
  }
};

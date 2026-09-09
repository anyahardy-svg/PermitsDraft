const { getApprovalTokenRecord, markTokenUsed } = require('./accreditationApprovalTokens');
const {
  sendAccreditationApprovedEmail,
  sendHsApprovalRequest,
  sendManagerApprovalRequest,
  sendRevisionRequestedEmail,
} = require('./accreditationApprovalEmails');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const COMPANY_SELECT =
  'id,name,contact_name,contact_surname,contact_email,accreditation_status,assigned_manager_id,assigned_hs_person_id,accredited_date,contractor_type';

const serviceRoleHeaders = (prefer = '') => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  ...(prefer ? { Prefer: prefer } : {}),
});

async function fetchCompany(companyId) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?id=eq.${companyId}&select=${encodeURIComponent(COMPANY_SELECT)}&limit=1`,
    { headers: serviceRoleHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch company: ${await response.text()}`);
  }
  const records = await response.json();
  return records[0] || null;
}

async function fetchAdminUser(adminUserId) {
  if (!adminUserId) {
    return null;
  }
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?id=eq.${adminUserId}&select=id,email,name,role&limit=1`,
    { headers: serviceRoleHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch admin user: ${await response.text()}`);
  }
  const records = await response.json();
  return records[0] || null;
}

async function patchCompany(companyId, updates) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${companyId}`, {
    method: 'PATCH',
    headers: serviceRoleHeaders('return=representation'),
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error(`Failed to update company: ${await response.text()}`);
  }
  const records = await response.json();
  return Array.isArray(records) ? records[0] : records;
}

function validateApproverAssignments(company) {
  if (!company.assigned_manager_id) {
    return 'Assigned manager is not set for this company. Please assign a manager before submitting for approval.';
  }
  if (!company.assigned_hs_person_id) {
    return 'Assigned H&S person is not set for this company. Please assign an H&S approver before submitting for approval.';
  }
  return null;
}

function canActAsApprover({ company, stage, adminUser }) {
  if (!adminUser) {
    return false;
  }
  if (adminUser.role === 'super_admin') {
    return true;
  }
  if (stage === 'manager') {
    return company.assigned_manager_id === adminUser.id;
  }
  if (stage === 'hs') {
    return company.assigned_hs_person_id === adminUser.id;
  }
  return false;
}

function expectedStatusForStage(stage) {
  return stage === 'manager' ? 'pending_manager' : 'pending_hs';
}

async function startApprovalChain(companyId, baseUrl) {
  const company = await fetchCompany(companyId);
  if (!company) {
    return { success: false, error: 'Company not found', status: 404 };
  }

  const assignmentError = validateApproverAssignments(company);
  if (assignmentError) {
    return { success: false, error: assignmentError, status: 400 };
  }

  const allowedStatuses = new Set(['pending_manager', 'completed']);
  if (!allowedStatuses.has(company.accreditation_status)) {
    return {
      success: false,
      error: `Company is not awaiting manager approval (status: ${company.accreditation_status})`,
      status: 400,
    };
  }

  if (company.accreditation_status === 'completed') {
    await patchCompany(companyId, { accreditation_status: 'pending_manager' });
  }

  const manager = await fetchAdminUser(company.assigned_manager_id);
  if (!manager?.email) {
    return { success: false, error: 'Assigned manager does not have an email address', status: 400 };
  }

  const updatedCompany = await fetchCompany(companyId);
  await sendManagerApprovalRequest(updatedCompany, manager, baseUrl);

  return { success: true, status: 'pending_manager' };
}

async function processManagerApproval({ companyId, adminUserId, notes, baseUrl }) {
  const company = await fetchCompany(companyId);
  if (!company) {
    return { success: false, error: 'Company not found', status: 404 };
  }

  const adminUser = await fetchAdminUser(adminUserId);
  if (!canActAsApprover({ company, stage: 'manager', adminUser })) {
    return { success: false, error: 'You are not authorised to approve at the manager stage', status: 403 };
  }

  const allowedStatuses = new Set(['pending_manager', 'completed']);
  if (!allowedStatuses.has(company.accreditation_status)) {
    return {
      success: false,
      error: `Company is not awaiting manager approval (status: ${company.accreditation_status})`,
      status: 400,
    };
  }

  const hsPerson = await fetchAdminUser(company.assigned_hs_person_id);
  if (!hsPerson?.email) {
    return { success: false, error: 'Assigned H&S person does not have an email address', status: 400 };
  }

  const now = new Date().toISOString();
  await patchCompany(companyId, {
    accreditation_status: 'pending_hs',
    manager_approved_at: now,
    manager_approved_by: adminUser.id,
    manager_approval_notes: notes || null,
    accreditation_rejection_reason: null,
  });

  const updatedCompany = await fetchCompany(companyId);
  await sendHsApprovalRequest(updatedCompany, hsPerson, baseUrl);

  return { success: true, status: 'pending_hs' };
}

async function processHsApproval({ companyId, adminUserId, notes }) {
  const company = await fetchCompany(companyId);
  if (!company) {
    return { success: false, error: 'Company not found', status: 404 };
  }

  const adminUser = await fetchAdminUser(adminUserId);
  if (!canActAsApprover({ company, stage: 'hs', adminUser })) {
    return { success: false, error: 'You are not authorised to approve at the H&S stage', status: 403 };
  }

  if (company.accreditation_status !== 'pending_hs') {
    return {
      success: false,
      error: `Company is not awaiting H&S approval (status: ${company.accreditation_status})`,
      status: 400,
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const accreditedDate = company.accredited_date || today;

  await patchCompany(companyId, {
    accreditation_status: 'approved',
    in_radar: false,
    accredited_date: accreditedDate,
    hs_approved_at: now,
    hs_approved_by: adminUser.id,
    hs_approval_notes: notes || null,
    accreditation_rejection_reason: null,
  });

  const updatedCompany = await fetchCompany(companyId);
  await sendAccreditationApprovedEmail(updatedCompany);

  return { success: true, status: 'approved', accreditedDate };
}

async function processRejection({ companyId, stage, adminUserId, notes }) {
  const company = await fetchCompany(companyId);
  if (!company) {
    return { success: false, error: 'Company not found', status: 404 };
  }

  const adminUser = await fetchAdminUser(adminUserId);
  if (!canActAsApprover({ company, stage, adminUser })) {
    return { success: false, error: 'You are not authorised to reject at this stage', status: 403 };
  }

  const expectedStatus = expectedStatusForStage(stage);
  const allowedStatuses = stage === 'manager'
    ? new Set(['pending_manager', 'completed'])
    : new Set(['pending_hs']);

  if (!allowedStatuses.has(company.accreditation_status)) {
    return {
      success: false,
      error: `Company is not awaiting ${stage} approval (status: ${company.accreditation_status})`,
      status: 400,
    };
  }

  const feedback = (notes || '').trim() || 'Changes are required before your accreditation can be approved.';
  await patchCompany(companyId, {
    accreditation_status: 'needs_revision',
    accreditation_rejection_reason: feedback,
  });

  const updatedCompany = await fetchCompany(companyId);
  await sendRevisionRequestedEmail(updatedCompany, feedback);

  return { success: true, status: 'needs_revision', stage: expectedStatus };
}

async function notifyAccreditationApproved(companyId) {
  const company = await fetchCompany(companyId);
  if (!company) {
    return { success: false, error: 'Company not found', status: 404 };
  }
  if (company.accreditation_status !== 'approved') {
    return { success: false, error: 'Company is not approved', status: 400 };
  }
  await sendAccreditationApprovedEmail(company);
  return { success: true };
}

async function getApprovalContextByToken(token) {
  const tokenResult = await getApprovalTokenRecord(token);
  if (tokenResult.error) {
    return tokenResult;
  }

  const { record } = tokenResult;
  const company = await fetchCompany(record.company_id);
  if (!company) {
    return { error: 'Company not found', status: 404 };
  }

  const expectedStatus = expectedStatusForStage(record.stage);
  if (company.accreditation_status !== expectedStatus && !(record.stage === 'manager' && company.accreditation_status === 'completed')) {
    return {
      error: 'This approval request is no longer active',
      status: 400,
      companyName: company.name,
      stage: record.stage,
    };
  }

  let approverId = record.stage === 'manager' ? company.assigned_manager_id : company.assigned_hs_person_id;
  const approver = await fetchAdminUser(approverId);

  return {
    company: {
      id: company.id,
      name: company.name,
      status: company.accreditation_status,
    },
    stage: record.stage,
    stageLabel: record.stage === 'manager' ? 'Manager' : 'Health & Safety',
    approverName: approver?.name || '',
    token,
  };
}

async function processApprovalByToken({ token, action, notes, baseUrl }) {
  const tokenResult = await getApprovalTokenRecord(token);
  if (tokenResult.error) {
    return tokenResult;
  }

  const { record } = tokenResult;
  const company = await fetchCompany(record.company_id);
  if (!company) {
    return { success: false, error: 'Company not found', status: 404 };
  }

  const approverId = record.stage === 'manager'
    ? company.assigned_manager_id
    : company.assigned_hs_person_id;

  if (!approverId) {
    return { success: false, error: 'Approver is not assigned for this company', status: 400 };
  }

  let result;
  if (action === 'approve') {
    if (record.stage === 'manager') {
      result = await processManagerApproval({ companyId: company.id, adminUserId: approverId, notes, baseUrl });
    } else {
      result = await processHsApproval({ companyId: company.id, adminUserId: approverId, notes });
    }
  } else if (action === 'reject') {
    result = await processRejection({
      companyId: company.id,
      stage: record.stage,
      adminUserId: approverId,
      notes,
    });
  } else {
    return { success: false, error: 'Invalid action', status: 400 };
  }

  if (result.success) {
    await markTokenUsed(token);
  }

  return result;
}

module.exports = {
  canActAsApprover,
  expectedStatusForStage,
  fetchAdminUser,
  fetchCompany,
  getApprovalContextByToken,
  notifyAccreditationApproved,
  processApprovalByToken,
  processHsApproval,
  processManagerApproval,
  processRejection,
  startApprovalChain,
  validateApproverAssignments,
};

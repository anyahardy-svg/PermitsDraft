/**
 * Kiosk sign-in register (site-scoped, service role).
 *
 * POST /api/kiosk-sign-ins
 * Body: { action, siteId, kioskSubdomain?, hostname?, ... }
 *
 * Actions: checkInVisitor | checkOut | listOnSite
 */

const { assertKioskSiteAccess } = require('./lib/kioskSiteAuth');
const { runSignInNotification } = require('./lib/runSignInNotification');

const ON_SITE_SELECT = `
  id,
  contractor_id,
  contractor_name,
  contractor_phone,
  contractor_company,
  visitor_name,
  visitor_company,
  phone_number,
  check_in_time,
  inducted,
  induction_status,
  flag_taken,
  flag_name,
  rt_taken,
  rt_name,
  visiting_person_name
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const action = body.action;
  const siteId = body.siteId;
  const kioskSubdomain = body.kioskSubdomain;
  const hostname = body.hostname;

  if (!action) {
    return res.status(400).json({ error: 'action is required' });
  }

  const siteAuth = await assertKioskSiteAccess(siteId, kioskSubdomain, { hostname });
  if (siteAuth.error) {
    return res.status(siteAuth.status || 403).json({ error: siteAuth.error });
  }

  const { site, admin } = siteAuth;
  const businessUnitId = body.businessUnitId || site.business_unit_id;

  try {
    if (action === 'listOnSite') {
      const { data, error } = await admin
        .from('sign_ins')
        .select(ON_SITE_SELECT)
        .eq('site_id', siteId)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false });

      if (error) {
        throw error;
      }

      return res.status(200).json({ success: true, data: data || [] });
    }

    if (action === 'checkInVisitor') {
      const visitorName = String(body.visitorName || '').trim();
      const visitorCompany = String(body.visitorCompany || '').trim();
      const phone = body.phone ? String(body.phone).trim() : null;

      if (!visitorName || !visitorCompany) {
        return res.status(400).json({ error: 'visitorName and visitorCompany are required' });
      }
      if (!businessUnitId) {
        return res.status(400).json({ error: 'Site business unit is not configured' });
      }

      const { data, error } = await admin
        .from('sign_ins')
        .insert({
          visitor_name: visitorName,
          visitor_company: visitorCompany,
          phone_number: phone,
          site_id: siteId,
          business_unit_id: businessUnitId,
          check_in_time: new Date().toISOString(),
          inducted: true,
          visiting_person_name: body.visitingPersonName || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      let notification = null;
      if (data?.id) {
        notification = await runSignInNotification(data.id, {
          visitingPersonEmail: body.visitingPersonEmail || null,
        });
      }

      return res.status(200).json({
        success: true,
        data,
        notification: notification?.messageId
          ? { sent: true, recipientEmail: notification.recipientEmail }
          : notification?.skipped
            ? { skipped: true, reason: notification.reason }
            : notification?.error
              ? { error: notification.error }
              : null,
      });
    }

    if (action === 'checkOut') {
      const signInId = body.signInId;
      if (!signInId) {
        return res.status(400).json({ error: 'signInId is required' });
      }

      const { data: existing, error: fetchError } = await admin
        .from('sign_ins')
        .select('id, site_id, check_in_time')
        .eq('id', signInId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }
      if (!existing) {
        return res.status(404).json({ error: 'Sign-in record not found' });
      }
      if (existing.site_id !== siteId) {
        return res.status(403).json({ error: 'Sign-in does not belong to this site' });
      }

      const now = new Date().toISOString();
      const updateData = {
        check_out_time: now,
        updated_at: now,
      };

      if (body.flagReturnData !== undefined && body.flagReturnData !== null) {
        updateData.flag_returned = body.flagReturnData;
      }
      if (body.rtReturnData !== undefined && body.rtReturnData !== null) {
        updateData.rt_returned = body.rtReturnData;
      }

      const { data, error } = await admin
        .from('sign_ins')
        .update(updateData)
        .eq('id', signInId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const checkInTime = new Date(data.check_in_time);
      const checkOutTime = new Date(data.check_out_time);
      const durationMinutes = Math.round((checkOutTime - checkInTime) / 60000);

      return res.status(200).json({
        success: true,
        data: { ...data, duration_minutes: durationMinutes },
      });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    console.error('kiosk-sign-ins error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Request failed',
    });
  }
}

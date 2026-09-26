import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "2026-09-26-v3";
const PAGE_SIZE = 1000;
const IN_QUERY_BATCH_SIZE = 200;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("company-data: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

type RequestingAdmin = { id: string; role: string; email: string };

async function getRequestingAdmin(
  supabase: SupabaseClient,
  requesterId: string,
): Promise<RequestingAdmin | null> {
  if (!requesterId) return null;
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, role, email")
    .eq("id", requesterId)
    .maybeSingle();
  if (error || !data) return null;
  return data as RequestingAdmin;
}

async function fetchAllPaginated<T>(
  supabase: SupabaseClient,
  buildQuery: (from: number, to: number) => ReturnType<SupabaseClient["from"]>,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function escapeIlikePattern(value: string) {
  return String(value).replace(/[\\%_]/g, "\\$&");
}

function normalizeCompanyName(name: string) {
  return String(name || "").trim().toLowerCase();
}

function buildCreatePayload(companyData: Record<string, unknown>) {
  return {
    name: companyData.name,
    email: companyData.email || null,
    manually_created: companyData.manually_created ?? companyData.manuallyCreated ?? false,
    created_by_contractor_id:
      companyData.created_by_contractor_id ?? companyData.createdByContractorId ?? null,
    contact_name: companyData.contact_name ?? companyData.contactName ?? null,
    contact_surname: companyData.contact_surname ?? companyData.contactSurname ?? null,
    contact_email: companyData.contact_email ?? companyData.contactEmail ?? null,
    contact_phone: companyData.contact_phone ?? companyData.contactPhone ?? null,
    contact_manager: companyData.contact_manager ?? companyData.contactManager ?? null,
    business_unit_ids: companyData.business_unit_ids ?? companyData.businessUnitIds ?? [],
    public_liability_expiry:
      companyData.public_liability_expiry ?? companyData.publicLiabilityExpiry ?? null,
    motor_vehicle_insurance_expiry:
      companyData.motor_vehicle_insurance_expiry ?? companyData.motorVehicleInsuranceExpiry ?? null,
    review_date: companyData.review_date ?? companyData.reviewDate ?? null,
    accredited_date: companyData.accredited_date ?? companyData.accreditedDate ?? null,
    company_active:
      companyData.company_active !== undefined
        ? companyData.company_active
        : companyData.companyActive !== undefined
          ? companyData.companyActive
          : true,
    pre_qualification_approved:
      companyData.pre_qualification_approved ?? companyData.preQualificationApproved ?? false,
    nzbn: companyData.nzbn ?? companyData.abn_nzbn ?? companyData.abnNzbn ?? null,
    address_1: companyData.address_1 ?? companyData.address1 ?? null,
    address_city: companyData.address_city ?? companyData.addressCity ?? null,
    address_postcode: companyData.address_postcode ?? companyData.addressPostcode ?? null,
    contractor_type: companyData.contractor_type ?? companyData.contractorType ?? "D",
    accreditation_status: "none",
    assigned_manager_id: companyData.assigned_manager_id ?? companyData.assignedManagerId ?? null,
    assigned_hs_person_id: companyData.assigned_hs_person_id ?? companyData.assignedHsPersonId ?? null,
  };
}

function mapUpdatesToDb(updates: Record<string, unknown>) {
  const allowedFields = [
    "name",
    "email",
    "business_unit_ids",
    "contact_name",
    "contact_surname",
    "contact_email",
    "contact_phone",
    "contact_manager",
    "public_liability_expiry",
    "motor_vehicle_insurance_expiry",
    "review_date",
    "accredited_date",
    "accreditation_next_reminder_at",
    "company_active",
    "pre_qualification_approved",
    "in_radar",
    "nzbn",
    "abn_nzbn",
    "address_1",
    "address_city",
    "address_postcode",
    "contractor_type",
    "site_ids",
    "assigned_manager_id",
    "assigned_hs_person_id",
    "accreditation_status",
    "accreditation_rejection_reason",
    "training_records_total",
    "training_records_approved",
    "training_matrices_total",
    "training_matrices_approved",
  ];
  const validUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    const snakeCaseKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (allowedFields.includes(snakeCaseKey)) {
      validUpdates[snakeCaseKey] = value;
    } else if (allowedFields.includes(key)) {
      validUpdates[key] = value;
    }
  }
  if (validUpdates.abn_nzbn && !validUpdates.nzbn) {
    validUpdates.nzbn = validUpdates.abn_nzbn;
  }
  delete validUpdates.abn_nzbn;
  return validUpdates;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse({ success: false, error: "Server misconfigured", version: VERSION }, 500);
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "ping") {
      return jsonResponse({ success: true, version: VERSION, serviceRoleConfigured: true });
    }

    if (action === "listAll") {
      const requester = await getRequestingAdmin(supabase, String(body.requestingAdminId ?? ""));
      if (!requester) {
        return jsonResponse({ success: false, error: "Not signed in or session expired" });
      }
      const rows = await fetchAllPaginated<Record<string, unknown>>(supabase, (from, to) =>
        supabase.from("companies").select("*").order("name", { ascending: true }).range(from, to),
      );
      return jsonResponse({ success: true, data: rows, version: VERSION });
    }

    if (action === "search" || action === "searchForKiosk") {
      if (action === "search") {
        const requester = await getRequestingAdmin(supabase, String(body.requestingAdminId ?? ""));
        if (!requester) {
          return jsonResponse({ success: false, error: "Not signed in or session expired" });
        }
      }
      const query = String(body.query ?? "").trim();
      const limit = Math.min(Number(body.limit) || 50, 100);
      if (!query) {
        return jsonResponse({ success: true, data: [], version: VERSION });
      }
      const pattern = `%${escapeIlikePattern(query)}%`;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .ilike("name", pattern)
        .order("name", { ascending: true })
        .limit(limit);
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
      }
      return jsonResponse({ success: true, data: data ?? [], version: VERSION });
    }

    if (action === "get" || action === "getForKiosk") {
      if (action === "get") {
        const requester = await getRequestingAdmin(supabase, String(body.requestingAdminId ?? ""));
        if (!requester) {
          return jsonResponse({ success: false, error: "Not signed in or session expired" });
        }
      }
      const companyId = String(body.companyId ?? "");
      if (!companyId) {
        return jsonResponse({ success: false, error: "Missing company id" }, 400);
      }
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
      }
      if (!data) {
        return jsonResponse({ success: false, error: "Company not found" }, 404);
      }
      return jsonResponse({ success: true, data, version: VERSION });
    }

    if (action === "listNamesByIds") {
      const ids = [...new Set(((body.companyIds as string[]) || []).filter(Boolean))];
      if (ids.length === 0) {
        return jsonResponse({ success: true, data: [], version: VERSION });
      }
      const rows: { id: string; name: string }[] = [];
      for (let i = 0; i < ids.length; i += IN_QUERY_BATCH_SIZE) {
        const batch = ids.slice(i, i + IN_QUERY_BATCH_SIZE);
        const { data, error } = await supabase.from("companies").select("id, name").in("id", batch);
        if (error) {
          return jsonResponse({ success: false, error: error.message }, 500);
        }
        rows.push(...((data ?? []) as { id: string; name: string }[]));
      }
      return jsonResponse({ success: true, data: rows, version: VERSION });
    }

    if (action === "listAtSite") {
      const siteId = String(body.siteId ?? "");
      if (!siteId) {
        return jsonResponse({ success: false, error: "Missing site id" }, 400);
      }
      const requesterId = String(body.requestingAdminId ?? "");
      if (requesterId) {
        const requester = await getRequestingAdmin(supabase, requesterId);
        if (!requester) {
          return jsonResponse({ success: false, error: "Not signed in or session expired" });
        }
      }
      const rows = await fetchAllPaginated<Record<string, unknown>>(supabase, (from, to) =>
        supabase
          .from("companies")
          .select("*")
          .contains("site_ids", [siteId])
          .order("name", { ascending: true })
          .range(from, to),
      );
      return jsonResponse({ success: true, data: rows, version: VERSION });
    }

    if (action === "searchNotAtSite") {
      const siteId = String(body.siteId ?? "");
      const query = String(body.query ?? "").trim();
      if (!siteId) {
        return jsonResponse({ success: false, error: "Missing site id" }, 400);
      }
      const requesterId = String(body.requestingAdminId ?? "");
      if (requesterId) {
        const requester = await getRequestingAdmin(supabase, requesterId);
        if (!requester) {
          return jsonResponse({ success: false, error: "Not signed in or session expired" });
        }
      }
      const rows = await fetchAllPaginated<Record<string, unknown>>(supabase, (from, to) => {
        let request = supabase.from("companies").select("*").order("name", { ascending: true }).range(from, to);
        if (query) {
          request = request.ilike("name", `%${escapeIlikePattern(query)}%`);
        }
        return request;
      });
      const filtered = rows.filter((row) => {
        const siteIds = row.site_ids as string[] | undefined;
        return !Array.isArray(siteIds) || !siteIds.includes(siteId);
      });
      return jsonResponse({ success: true, data: filtered, version: VERSION });
    }

    if (action === "lookupByEmail") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!email) {
        return jsonResponse({ success: true, data: [], version: VERSION });
      }
      const [byContact, byEmail] = await Promise.all([
        supabase.from("companies").select("*").ilike("contact_email", email),
        supabase.from("companies").select("*").ilike("email", email),
      ]);
      if (byContact.error) {
        return jsonResponse({ success: false, error: byContact.error.message }, 500);
      }
      if (byEmail.error) {
        return jsonResponse({ success: false, error: byEmail.error.message }, 500);
      }
      const byId = new Map<string, Record<string, unknown>>();
      for (const row of [...(byContact.data ?? []), ...(byEmail.data ?? [])]) {
        byId.set(row.id as string, row);
      }
      return jsonResponse({ success: true, data: [...byId.values()], version: VERSION });
    }

    if (action === "getByName") {
      const trimmedName = String(body.name ?? "").trim();
      if (!trimmedName) {
        return jsonResponse({ success: true, data: null, version: VERSION });
      }
      const normalizedTarget = normalizeCompanyName(trimmedName);
      const { data: candidates, error } = await supabase
        .from("companies")
        .select("*")
        .ilike("name", `%${escapeIlikePattern(trimmedName)}%`)
        .order("name", { ascending: true })
        .limit(25);
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
      }
      const exact = (candidates ?? []).find(
        (c) => normalizeCompanyName(c.name as string) === normalizedTarget,
      );
      return jsonResponse({ success: true, data: exact ?? null, version: VERSION });
    }

    if (action === "listPendingApprovals") {
      const adminUserId = String(body.adminUserId ?? "");
      if (!adminUserId) {
        return jsonResponse({
          success: true,
          data: { managerApprovals: [], hsApprovals: [] },
          version: VERSION,
        });
      }
      const [managerData, hsData] = await Promise.all([
        fetchAllPaginated<Record<string, unknown>>(supabase, (from, to) =>
          supabase
            .from("companies")
            .select(
              "id, name, accreditation_status, accreditation_last_updated, assigned_manager_id, assigned_hs_person_id",
            )
            .eq("assigned_manager_id", adminUserId)
            .eq("accreditation_status", "pending_manager")
            .order("accreditation_last_updated", { ascending: false })
            .range(from, to),
        ),
        fetchAllPaginated<Record<string, unknown>>(supabase, (from, to) =>
          supabase
            .from("companies")
            .select(
              "id, name, accreditation_status, accreditation_last_updated, assigned_manager_id, assigned_hs_person_id",
            )
            .eq("assigned_hs_person_id", adminUserId)
            .eq("accreditation_status", "pending_hs")
            .order("accreditation_last_updated", { ascending: false })
            .range(from, to),
        ),
      ]);
      return jsonResponse({
        success: true,
        data: { managerApprovals: managerData, hsApprovals: hsData },
        version: VERSION,
      });
    }

    if (action === "create" || action === "createForKiosk") {
      if (action === "create") {
        const requester = await getRequestingAdmin(supabase, String(body.requestingAdminId ?? ""));
        if (!requester) {
          return jsonResponse({ success: false, error: "Not signed in or session expired" });
        }
      }
      const dbData = buildCreatePayload((body.companyData ?? {}) as Record<string, unknown>);
      const { data, error } = await supabase.from("companies").insert([dbData]).select().single();
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      return jsonResponse({ success: true, data, version: VERSION });
    }

    if (action === "updateAccreditation") {
      const requester = await getRequestingAdmin(supabase, String(body.requestingAdminId ?? ""));
      if (!requester) {
        return jsonResponse({ success: false, error: "Not signed in or session expired" });
      }
      const companyId = String(body.companyId ?? "");
      const updates = { ...((body.updates ?? {}) as Record<string, unknown>) };
      delete updates.id;
      if (!companyId) {
        return jsonResponse({ success: false, error: "Missing company id" }, 400);
      }
      const { data, error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", companyId)
        .select()
        .single();
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      return jsonResponse({ success: true, data, version: VERSION });
    }

    if (action === "update" || action === "updateForKiosk") {
      if (action === "update") {
        const requester = await getRequestingAdmin(supabase, String(body.requestingAdminId ?? ""));
        if (!requester) {
          return jsonResponse({ success: false, error: "Not signed in or session expired" });
        }
      }
      const companyId = String(body.companyId ?? "");
      const updates = mapUpdatesToDb((body.updates ?? {}) as Record<string, unknown>);
      if (!companyId) {
        return jsonResponse({ success: false, error: "Missing company id" }, 400);
      }
      const { data, error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", companyId)
        .select()
        .single();
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      return jsonResponse({ success: true, data, version: VERSION });
    }

    if (action === "approveAccreditation" || action === "rejectAccreditation") {
      const requester = await getRequestingAdmin(supabase, String(body.requestingAdminId ?? ""));
      if (!requester) {
        return jsonResponse({ success: false, error: "Not signed in or session expired" });
      }
      const companyId = String(body.companyId ?? "");
      if (!companyId) {
        return jsonResponse({ success: false, error: "Missing company id" }, 400);
      }
      if (action === "rejectAccreditation") {
        const { data, error } = await supabase
          .from("companies")
          .update({
            accreditation_status: "needs_revision",
            accreditation_rejection_reason: body.reason || null,
          })
          .eq("id", companyId)
          .select()
          .single();
        if (error) {
          return jsonResponse({ success: false, error: error.message }, 400);
        }
        return jsonResponse({ success: true, data, version: VERSION });
      }
      const { data: current, error: fetchError } = await supabase
        .from("companies")
        .select("accredited_date")
        .eq("id", companyId)
        .maybeSingle();
      if (fetchError) {
        return jsonResponse({ success: false, error: fetchError.message }, 500);
      }
      const today = new Date().toISOString().split("T")[0];
      const updateData: Record<string, unknown> = {
        accreditation_status: "approved",
        in_radar: false,
      };
      if (current && !current.accredited_date) {
        updateData.accredited_date = today;
      }
      const { data, error } = await supabase
        .from("companies")
        .update(updateData)
        .eq("id", companyId)
        .select()
        .single();
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      return jsonResponse({ success: true, data, version: VERSION });
    }

    if (action === "delete") {
      const requester = await getRequestingAdmin(supabase, String(body.requestingAdminId ?? ""));
      if (!requester) {
        return jsonResponse({ success: false, error: "Not signed in or session expired" });
      }
      const companyId = String(body.companyId ?? "");
      const options = (body.options ?? {}) as { deleteContractors?: boolean };
      if (!companyId) {
        return jsonResponse({ success: false, error: "Missing company id" }, 400);
      }

      const { data: companyContractors, error: fetchError } = await supabase
        .from("contractors")
        .select("id")
        .eq("company_id", companyId);
      if (fetchError) {
        return jsonResponse({ success: false, error: fetchError.message }, 500);
      }
      const contractorIds = (companyContractors ?? []).map((c) => c.id as string);

      if (options.deleteContractors && contractorIds.length > 0) {
        await supabase.from("permits").delete().in("contractor_id", contractorIds);
        await supabase.from("contractor_inductions").delete().in("contractor_id", contractorIds);
        await supabase.from("contractors").delete().eq("company_id", companyId);
      } else if (contractorIds.length > 0) {
        await supabase.from("permits").update({ contractor_id: null }).in("contractor_id", contractorIds);
        await supabase.from("contractors").update({ company_id: null }).eq("company_id", companyId);
      }

      const { error } = await supabase.from("companies").delete().eq("id", companyId);
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      return jsonResponse({ success: true, version: VERSION });
    }

    return jsonResponse({ success: false, error: "Unknown action", version: VERSION }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("company-data unhandled error:", message, e);
    return jsonResponse({ success: false, error: message, version: VERSION }, 500);
  }
});

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "2026-09-26-v1";
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
    console.error(
      "training-records-data: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
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

async function requireAdmin(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<RequestingAdmin | null> {
  return await getRequestingAdmin(supabase, String(body.requestingAdminId ?? ""));
}

type ContractorRow = { id: string; name: string; company_id: string | null };

async function loadContractorsForCompany(
  supabase: SupabaseClient,
  companyId: string,
): Promise<ContractorRow[]> {
  return await fetchAllPaginated<ContractorRow>(supabase, (from, to) =>
    supabase
      .from("contractors")
      .select("id, name, company_id")
      .eq("company_id", companyId)
      .order("name", { ascending: true })
      .range(from, to),
  );
}

async function loadRecordsForContractorIds(
  supabase: SupabaseClient,
  contractorIds: string[],
) {
  const uniqueIds = [...new Set(contractorIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const records: Record<string, unknown>[] = [];
  for (let i = 0; i < uniqueIds.length; i += IN_QUERY_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + IN_QUERY_BATCH_SIZE);
    const batchRows = await fetchAllPaginated<Record<string, unknown>>(
      supabase,
      (from, to) =>
        supabase
          .from("training_records")
          .select("*")
          .in("contractor_id", batch)
          .order("uploaded_at", { ascending: false })
          .range(from, to),
    );
    records.push(...batchRows);
  }

  return records.sort(
    (a, b) =>
      new Date(String(b.uploaded_at || 0)).getTime() -
      new Date(String(a.uploaded_at || 0)).getTime(),
  );
}

function enrichRecords(
  records: Record<string, unknown>[],
  contractorById: Map<string, ContractorRow>,
  companyId: string,
) {
  return records.map((record) => {
    const contractorId = String(record.contractor_id ?? "");
    const contractor = contractorById.get(contractorId);
    return {
      ...record,
      contractor: {
        id: contractorId,
        name: contractor?.name || "Unknown",
        company_id: companyId,
      },
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse(
      { success: false, error: "Server misconfigured", version: VERSION },
      500,
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "ping") {
      return jsonResponse({
        success: true,
        version: VERSION,
        serviceRoleConfigured: true,
      });
    }

    const adminOnlyActions = new Set([
      "listByCompany",
      "listByContractor",
      "get",
      "update",
      "delete",
      "approve",
      "approveAllPending",
    ]);

    if (adminOnlyActions.has(action)) {
      const requester = await requireAdmin(supabase, body);
      if (!requester) {
        return jsonResponse({
          success: false,
          error: "Not signed in or session expired",
        });
      }
    }

    if (action === "listByCompany") {
      const companyId = String(body.companyId ?? "");
      if (!companyId) {
        return jsonResponse({ success: false, error: "Missing company id" }, 400);
      }
      const contractors = await loadContractorsForCompany(supabase, companyId);
      const contractorById = new Map(contractors.map((c) => [c.id, c]));
      const records = await loadRecordsForContractorIds(
        supabase,
        contractors.map((c) => c.id),
      );
      const data = enrichRecords(records, contractorById, companyId);
      return jsonResponse({ success: true, data, version: VERSION });
    }

    if (action === "listByContractor") {
      const contractorId = String(body.contractorId ?? "");
      if (!contractorId) {
        return jsonResponse({ success: false, error: "Missing contractor id" }, 400);
      }
      const records = await fetchAllPaginated<Record<string, unknown>>(
        supabase,
        (from, to) =>
          supabase
            .from("training_records")
            .select("*")
            .eq("contractor_id", contractorId)
            .order("uploaded_at", { ascending: false })
            .range(from, to),
      );
      return jsonResponse({ success: true, data: records, version: VERSION });
    }

    if (action === "get") {
      const recordId = String(body.recordId ?? "");
      if (!recordId) {
        return jsonResponse({ success: false, error: "Missing record id" }, 400);
      }
      const { data, error } = await supabase
        .from("training_records")
        .select("*")
        .eq("id", recordId)
        .maybeSingle();
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
      }
      if (!data) {
        return jsonResponse({ success: false, error: "Record not found" }, 404);
      }
      return jsonResponse({ success: true, data, version: VERSION });
    }

    if (action === "update") {
      const recordId = String(body.recordId ?? "");
      const updates = (body.updates ?? {}) as Record<string, unknown>;
      if (!recordId) {
        return jsonResponse({ success: false, error: "Missing record id" }, 400);
      }
      const allowed = [
        "training_type",
        "file_name",
        "file_url",
        "file_size",
        "file_type",
        "status",
        "expiry_date",
        "notes",
        "approved_by_name",
        "approved_by_business_unit",
        "approved_at",
        "uploaded_by",
      ];
      const validUpdates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        const snake = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        if (allowed.includes(snake)) validUpdates[snake] = value;
        else if (allowed.includes(key)) validUpdates[key] = value;
      }
      const { data, error } = await supabase
        .from("training_records")
        .update(validUpdates)
        .eq("id", recordId)
        .select()
        .single();
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      return jsonResponse({ success: true, data, version: VERSION });
    }

    if (action === "delete") {
      const recordId = String(body.recordId ?? "");
      if (!recordId) {
        return jsonResponse({ success: false, error: "Missing record id" }, 400);
      }
      const { error } = await supabase
        .from("training_records")
        .delete()
        .eq("id", recordId);
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      return jsonResponse({ success: true, version: VERSION });
    }

    if (action === "approve") {
      const recordId = String(body.recordId ?? "");
      const approvedByName = String(body.approvedByName ?? "");
      const businessUnitName = String(body.businessUnitName ?? "");
      if (!recordId) {
        return jsonResponse({ success: false, error: "Missing record id" }, 400);
      }
      const { data, error } = await supabase
        .from("training_records")
        .update({
          status: "approved",
          approved_by_name: approvedByName,
          approved_by_business_unit: businessUnitName,
          approved_at: new Date().toISOString(),
        })
        .eq("id", recordId)
        .select()
        .single();
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      return jsonResponse({ success: true, data, version: VERSION });
    }

    if (action === "approveAllPending") {
      const companyId = String(body.companyId ?? "");
      const approvedByName = String(body.approvedByName ?? "");
      const businessUnitName = String(body.businessUnitName ?? "");
      if (!companyId) {
        return jsonResponse({ success: false, error: "Missing company id" }, 400);
      }
      const contractors = await loadContractorsForCompany(supabase, companyId);
      const records = await loadRecordsForContractorIds(
        supabase,
        contractors.map((c) => c.id),
      );
      const pending = records.filter((r) => r.status === "pending");
      let approvedCount = 0;
      for (const record of pending) {
        const recordId = String(record.id ?? "");
        if (!recordId) continue;
        const { error } = await supabase
          .from("training_records")
          .update({
            status: "approved",
            approved_by_name: approvedByName,
            approved_by_business_unit: businessUnitName,
            approved_at: new Date().toISOString(),
          })
          .eq("id", recordId);
        if (!error) approvedCount += 1;
      }
      return jsonResponse({
        success: true,
        approvedCount,
        version: VERSION,
      });
    }

    return jsonResponse(
      { success: false, error: "Unknown action", version: VERSION },
      400,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("training-records-data unhandled error:", message, e);
    return jsonResponse({ success: false, error: message, version: VERSION }, 500);
  }
});

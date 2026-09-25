import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "2026-03-23-v1";
const IN_QUERY_BATCH_SIZE = 200;
const PAGE_SIZE = 1000;

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
    console.error("contractor-data: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

type RequestingAdmin = { id: string; role: string; email: string };

async function getRequestingAdmin(
  supabase: SupabaseClient,
  requesterId: string,
): Promise<RequestingAdmin | null> {
  if (!requesterId) {
    return null;
  }
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, role, email")
    .eq("id", requesterId)
    .maybeSingle();
  if (error || !data) {
    return null;
  }
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
    if (error) {
      throw error;
    }
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }
  return rows;
}

function mergeUniqueContractors(...lists: Record<string, unknown>[][]) {
  const byId = new Map<string, Record<string, unknown>>();
  for (const list of lists) {
    for (const row of list || []) {
      const id = row?.id as string | undefined;
      if (id) {
        byId.set(id, row);
      }
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || "")),
  );
}

async function attachCompanyNames(
  supabase: SupabaseClient,
  contractors: Record<string, unknown>[],
) {
  const companyIds = [
    ...new Set(
      contractors
        .map((c) => c.company_id as string | null)
        .filter(Boolean) as string[],
    ),
  ];
  const companyMap: Record<string, string> = {};
  for (let i = 0; i < companyIds.length; i += IN_QUERY_BATCH_SIZE) {
    const batch = companyIds.slice(i, i + IN_QUERY_BATCH_SIZE);
    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", batch);
    if (error) {
      console.warn("contractor-data: company name fetch failed", error.message);
      break;
    }
    for (const company of data ?? []) {
      companyMap[company.id] = company.name;
    }
  }
  return contractors.map((row) => ({
    ...row,
    company_name: companyMap[row.company_id as string] || row.company_name || "",
  }));
}

async function fetchContractorIdsWithSiteInductionRecord(
  supabase: SupabaseClient,
  siteId: string,
) {
  const inductionRows = await fetchAllPaginated<{ contractor_id: string }>(
    supabase,
    (from, to) =>
      supabase
        .from("contractor_inductions")
        .select("contractor_id")
        .eq("site_id", siteId)
        .range(from, to),
  );
  return [
    ...new Set(inductionRows.map((row) => row.contractor_id).filter(Boolean)),
  ];
}

async function fetchContractorsByIds(
  supabase: SupabaseClient,
  contractorIds: string[],
) {
  const uniqueIds = [...new Set(contractorIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < uniqueIds.length; i += IN_QUERY_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + IN_QUERY_BATCH_SIZE);
    const batchRows = await fetchAllPaginated<Record<string, unknown>>(
      supabase,
      (from, to) =>
        supabase
          .from("contractors")
          .select("*")
          .in("id", batch)
          .order("name", { ascending: true })
          .range(from, to),
    );
    rows.push(...batchRows);
  }
  return rows;
}

async function fetchCompanyIdsForKioskSite(
  supabase: SupabaseClient,
  siteId: string,
  businessUnitId: string | null,
) {
  const ids = new Set<string>();
  const bySite = await fetchAllPaginated<{ id: string }>(supabase, (from, to) =>
    supabase.from("companies").select("id").contains("site_ids", [siteId]).range(from, to),
  );
  bySite.forEach((company) => ids.add(company.id));

  if (businessUnitId) {
    const byBu = await fetchAllPaginated<{ id: string }>(supabase, (from, to) =>
      supabase
        .from("companies")
        .select("id")
        .overlaps("business_unit_ids", [businessUnitId])
        .range(from, to),
    );
    byBu.forEach((company) => ids.add(company.id));
  }
  return Array.from(ids);
}

async function fetchContractorsByCompanyIds(
  supabase: SupabaseClient,
  companyIds: string[],
) {
  const uniqueIds = [...new Set(companyIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < uniqueIds.length; i += IN_QUERY_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + IN_QUERY_BATCH_SIZE);
    const batchRows = await fetchAllPaginated<Record<string, unknown>>(
      supabase,
      (from, to) =>
        supabase
          .from("contractors")
          .select("*")
          .in("company_id", batch)
          .order("name", { ascending: true })
          .range(from, to),
    );
    rows.push(...batchRows);
  }
  return rows;
}

async function listContractorsBySiteInternal(supabase: SupabaseClient, siteId: string) {
  const bySiteAssignment = await fetchAllPaginated<Record<string, unknown>>(
    supabase,
    (from, to) =>
      supabase
        .from("contractors")
        .select("*")
        .contains("site_ids", [siteId])
        .order("name", { ascending: true })
        .range(from, to),
  );
  const inductedContractorIds = await fetchContractorIdsWithSiteInductionRecord(
    supabase,
    siteId,
  );
  const inductedOnlyIds = inductedContractorIds.filter(
    (contractorId) => !bySiteAssignment.some((row) => row.id === contractorId),
  );
  const bySiteInductionRecord = await fetchContractorsByIds(supabase, inductedOnlyIds);
  const merged = mergeUniqueContractors(bySiteAssignment, bySiteInductionRecord);
  return attachCompanyNames(supabase, merged);
}

async function listContractorsForKioskInternal(supabase: SupabaseClient, siteId: string) {
  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, business_unit_id")
    .eq("id", siteId)
    .maybeSingle();
  if (siteError) {
    throw siteError;
  }
  const businessUnitId = (site?.business_unit_id as string) || null;

  const [bySiteAssignment, byBusinessUnit, companyIds] = await Promise.all([
    fetchAllPaginated<Record<string, unknown>>(supabase, (from, to) =>
      supabase
        .from("contractors")
        .select("*")
        .contains("site_ids", [siteId])
        .order("name", { ascending: true })
        .range(from, to),
    ),
    businessUnitId
      ? fetchAllPaginated<Record<string, unknown>>(supabase, (from, to) =>
          supabase
            .from("contractors")
            .select("*")
            .overlaps("business_unit_ids", [businessUnitId])
            .order("name", { ascending: true })
            .range(from, to),
        )
      : Promise.resolve([]),
    fetchCompanyIdsForKioskSite(supabase, siteId, businessUnitId),
  ]);

  const [byCompany, inductedContractorIds] = await Promise.all([
    fetchContractorsByCompanyIds(supabase, companyIds),
    fetchContractorIdsWithSiteInductionRecord(supabase, siteId),
  ]);

  const assignedIds = new Set(
    mergeUniqueContractors(bySiteAssignment, byBusinessUnit, byCompany).map(
      (row) => row.id as string,
    ),
  );
  const inductedOnlyIds = inductedContractorIds.filter((id) => !assignedIds.has(id));
  const bySiteInductionRecord = await fetchContractorsByIds(supabase, inductedOnlyIds);
  const merged = mergeUniqueContractors(
    bySiteAssignment,
    byBusinessUnit,
    byCompany,
    bySiteInductionRecord,
  );
  return attachCompanyNames(supabase, merged);
}

function escapeIlikePattern(value: string) {
  return String(value).replace(/[\\%_]/g, "\\$&");
}

async function searchContractorsForKioskInternal(
  supabase: SupabaseClient,
  siteId: string,
  searchText: string,
  limit: number,
) {
  const trimmed = searchText?.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }
  const pattern = `%${escapeIlikePattern(trimmed)}%`;

  const [{ data: siteAssigned, error: siteError }, { data: globalNameMatches, error: globalError }] =
    await Promise.all([
      supabase
        .from("contractors")
        .select("*")
        .contains("site_ids", [siteId])
        .or(`name.ilike.${pattern},email.ilike.${pattern}`)
        .order("name", { ascending: true })
        .limit(limit),
      supabase
        .from("contractors")
        .select("*")
        .or(`name.ilike.${pattern},email.ilike.${pattern}`)
        .order("name", { ascending: true })
        .limit(limit * 2),
    ]);

  if (siteError) {
    throw siteError;
  }
  if (globalError) {
    throw globalError;
  }

  const inductedIds = await fetchContractorIdsWithSiteInductionRecord(supabase, siteId);
  const siteAssignedIds = new Set((siteAssigned || []).map((c) => c.id));
  const inductedOnlyIds = inductedIds.filter((id) => !siteAssignedIds.has(id));

  const inductedMatches: Record<string, unknown>[] = [];
  for (
    let i = 0;
    i < inductedOnlyIds.length && inductedMatches.length < limit;
    i += IN_QUERY_BATCH_SIZE
  ) {
    const batch = inductedOnlyIds.slice(i, i + IN_QUERY_BATCH_SIZE);
    const { data, error } = await supabase
      .from("contractors")
      .select("*")
      .in("id", batch)
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .order("name", { ascending: true })
      .limit(limit - inductedMatches.length);
    if (error) {
      throw error;
    }
    inductedMatches.push(...(data || []));
  }

  const merged = mergeUniqueContractors(
    siteAssigned || [],
    inductedMatches,
    globalNameMatches || [],
  );
  return attachCompanyNames(supabase, merged).then((rows) => rows.slice(0, limit));
}

function mapUpdatesToDb(updates: Record<string, unknown>) {
  const dbUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === "serviceIds") {
      dbUpdates.service_ids = value;
    } else if (key === "siteIds") {
      dbUpdates.site_ids = value;
    } else if (key === "businessUnitIds") {
      dbUpdates.business_unit_ids = value;
    } else if (key === "companyId") {
      dbUpdates.company_id = value;
    } else if (key === "inductionExpiry") {
      dbUpdates.induction_expiry = value;
    } else {
      dbUpdates[key] = value;
    }
  }
  return dbUpdates;
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
      return jsonResponse({
        success: true,
        version: VERSION,
        serviceRoleConfigured: true,
      });
    }

    if (action === "listAll") {
      const requester = await getRequestingAdmin(
        supabase,
        String(body.requestingAdminId ?? ""),
      );
      if (!requester) {
        return jsonResponse({ success: false, error: "Not signed in or session expired" });
      }

      const rows = await fetchAllPaginated<Record<string, unknown>>(supabase, (from, to) =>
        supabase
          .from("contractors")
          .select("*")
          .order("name", { ascending: true })
          .range(from, to),
      );
      const withCompanies = await attachCompanyNames(supabase, rows);
      return jsonResponse({ success: true, data: withCompanies, version: VERSION });
    }

    if (action === "listByCompany" || action === "listExpiredInductions") {
      const requester = await getRequestingAdmin(
        supabase,
        String(body.requestingAdminId ?? ""),
      );
      if (!requester) {
        return jsonResponse({ success: false, error: "Not signed in or session expired" });
      }

      if (action === "listByCompany") {
        const companyId = String(body.companyId ?? "");
        if (!companyId) {
          return jsonResponse({ success: false, error: "Missing company id" }, 400);
        }
        const rows = await fetchAllPaginated<Record<string, unknown>>(supabase, (from, to) =>
          supabase
            .from("contractors")
            .select("*")
            .eq("company_id", companyId)
            .order("name", { ascending: true })
            .range(from, to),
        );
        const withCompanies = await attachCompanyNames(supabase, rows);
        return jsonResponse({ success: true, data: withCompanies, version: VERSION });
      }

      const today = new Date().toISOString().split("T")[0];
      const rows = await fetchAllPaginated<Record<string, unknown>>(supabase, (from, to) =>
        supabase
          .from("contractors")
          .select("*")
          .lt("induction_expiry", today)
          .order("induction_expiry", { ascending: false })
          .range(from, to),
      );
      const withCompanies = await attachCompanyNames(supabase, rows);
      return jsonResponse({ success: true, data: withCompanies, version: VERSION });
    }

    if (action === "listBySite") {
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
      const rows = await listContractorsBySiteInternal(supabase, siteId);
      return jsonResponse({ success: true, data: rows, version: VERSION });
    }

    if (action === "listForKiosk") {
      const siteId = String(body.siteId ?? "");
      if (!siteId) {
        return jsonResponse({ success: false, error: "Missing site id" }, 400);
      }
      const rows = await listContractorsForKioskInternal(supabase, siteId);
      return jsonResponse({ success: true, data: rows, version: VERSION });
    }

    if (action === "searchForKiosk") {
      const siteId = String(body.siteId ?? "");
      const searchText = String(body.searchText ?? "");
      const limit = Math.min(Number(body.limit) || 40, 100);
      if (!siteId) {
        return jsonResponse({ success: false, error: "Missing site id" }, 400);
      }
      const rows = await searchContractorsForKioskInternal(
        supabase,
        siteId,
        searchText,
        limit,
      );
      return jsonResponse({ success: true, data: rows, version: VERSION });
    }

    if (action === "get" || action === "getForKiosk") {
      if (action === "get") {
        const requester = await getRequestingAdmin(
          supabase,
          String(body.requestingAdminId ?? ""),
        );
        if (!requester) {
          return jsonResponse({ success: false, error: "Not signed in or session expired" });
        }
      }
      const contractorId = String(body.contractorId ?? "");
      if (!contractorId) {
        return jsonResponse({ success: false, error: "Missing contractor id" }, 400);
      }
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", contractorId)
        .maybeSingle();
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
      }
      if (!data) {
        return jsonResponse({ success: false, error: "Contractor not found" }, 404);
      }
      const [withCompany] = await attachCompanyNames(supabase, [data]);
      return jsonResponse({ success: true, data: withCompany, version: VERSION });
    }

    if (action === "create") {
      const requester = await getRequestingAdmin(
        supabase,
        String(body.requestingAdminId ?? ""),
      );
      if (!requester) {
        return jsonResponse({ success: false, error: "Not signed in or session expired" });
      }
      const contractorData = (body.contractorData ?? {}) as Record<string, unknown>;
      const dbData = {
        ...contractorData,
        service_ids:
          contractorData.service_ids ||
          contractorData.serviceIds ||
          contractorData.services ||
          [],
      };
      const { data, error } = await supabase
        .from("contractors")
        .insert([dbData])
        .select()
        .single();
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      const [withCompany] = await attachCompanyNames(supabase, [data]);
      return jsonResponse({ success: true, data: withCompany, version: VERSION });
    }

    if (action === "update") {
      const requester = await getRequestingAdmin(
        supabase,
        String(body.requestingAdminId ?? ""),
      );
      if (!requester) {
        return jsonResponse({ success: false, error: "Not signed in or session expired" });
      }
      const contractorId = String(body.contractorId ?? "");
      const updates = mapUpdatesToDb((body.updates ?? {}) as Record<string, unknown>);
      if (!contractorId) {
        return jsonResponse({ success: false, error: "Missing contractor id" }, 400);
      }
      const { data, error } = await supabase
        .from("contractors")
        .update(updates)
        .eq("id", contractorId)
        .select()
        .single();
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      const [withCompany] = await attachCompanyNames(supabase, [data]);
      return jsonResponse({ success: true, data: withCompany, version: VERSION });
    }

    if (action === "delete") {
      const requester = await getRequestingAdmin(
        supabase,
        String(body.requestingAdminId ?? ""),
      );
      if (!requester) {
        return jsonResponse({ success: false, error: "Not signed in or session expired" });
      }
      const contractorId = String(body.contractorId ?? "");
      if (!contractorId) {
        return jsonResponse({ success: false, error: "Missing contractor id" }, 400);
      }
      const { error } = await supabase.from("contractors").delete().eq("id", contractorId);
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      return jsonResponse({ success: true, version: VERSION });
    }

    return jsonResponse({ success: false, error: "Unknown action", version: VERSION }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("contractor-data unhandled error:", message, e);
    return jsonResponse({ success: false, error: message, version: VERSION }, 500);
  }
});

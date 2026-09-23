import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "2026-03-23-v3";

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

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("admin-auth: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

async function comparePassword(plain: string, hash: string): Promise<boolean> {
  const bcrypt = await import("npm:bcryptjs@2.4.3");
  return bcrypt.compareSync(plain, hash);
}

async function hashPassword(plain: string): Promise<string> {
  const bcrypt = await import("npm:bcryptjs@2.4.3");
  return bcrypt.hashSync(plain, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (e) {
    console.error("admin-auth: invalid JSON body", e);
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const action = String(body?.action ?? "");

  // No database — confirms deploy + runtime (check version in response)
  if (action === "ping") {
    return jsonResponse({
      success: true,
      message: "admin-auth is running",
      version: VERSION,
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return jsonResponse({ success: false, error: "Server configuration error" }, 500);
    }

    if (action === "login") {
      const email = normalizeEmail(String(body.email ?? ""));
      const password = String(body.password ?? "");
      if (!email || !password) {
        return jsonResponse({ success: false, error: "Password or username incorrect" }, 400);
      }

      let { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("id, email, password_hash, name, role, site_ids")
        .ilike("email", email)
        .maybeSingle();

      if (error?.message?.includes("site_ids")) {
        const retry = await supabase
          .from("admin_users")
          .select("id, email, password_hash, name, role")
          .ilike("email", email)
          .maybeSingle();
        adminUser = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error("admin-auth login query error:", error.message);
        return jsonResponse({ success: false, error: "Password or username incorrect" });
      }

      if (!adminUser) {
        return jsonResponse({ success: false, error: "Password or username incorrect" });
      }

      const storedHash = String(adminUser.password_hash ?? "");
      if (!storedHash || storedHash.length < 20) {
        return jsonResponse({ success: false, error: "Password or username incorrect" });
      }

      const passwordMatch = await comparePassword(password, storedHash);
      if (!passwordMatch) {
        return jsonResponse({ success: false, error: "Password or username incorrect" });
      }

      return jsonResponse({
        success: true,
        data: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          site_ids: adminUser.site_ids ?? [],
          siteIds: adminUser.site_ids ?? [],
        },
      });
    }

    if (action === "checkPasswordSetup") {
      const email = normalizeEmail(String(body.email ?? ""));
      if (!email) {
        return jsonResponse({ needsSetup: false });
      }

      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("id, email, password_hash")
        .ilike("email", email)
        .maybeSingle();

      if (error || !adminUser) {
        return jsonResponse({ needsSetup: false });
      }

      const needsSetup =
        !adminUser.password_hash || String(adminUser.password_hash).trim() === "";

      return jsonResponse({
        needsSetup,
        adminId: adminUser.id,
        email: adminUser.email,
        version: VERSION,
      });
    }

    if (action === "listForKioskSite") {
      const siteId = String(body.siteId ?? "");
      if (!siteId) {
        return jsonResponse({ success: true, data: [] });
      }

      let { data, error } = await supabase
        .from("admin_users")
        .select("id, email, name, role, site_ids")
        .contains("site_ids", [siteId])
        .order("name", { ascending: true });

      if (error?.message?.includes("site_ids")) {
        const retry = await supabase
          .from("admin_users")
          .select("id, email, name, role")
          .order("name", { ascending: true });
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
      }

      const filtered = (data ?? []).filter((row) => {
        const ids = row.site_ids as string[] | undefined;
        if (!ids) return true;
        return ids.includes(siteId);
      });

      return jsonResponse({ success: true, data: filtered });
    }

    if (action === "setPassword") {
      const email = normalizeEmail(String(body.email ?? ""));
      const password = String(body.password ?? "");
      if (!email || password.length < 6) {
        return jsonResponse({ success: false, error: "Invalid email or password" }, 400);
      }

      const passwordHash = await hashPassword(password);
      const { error } = await supabase
        .from("admin_users")
        .update({ password_hash: passwordHash })
        .ilike("email", email);

      if (error) {
        return jsonResponse({ success: false, error: "Failed to set password" }, 500);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ success: false, error: "Unknown action", version: VERSION }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("admin-auth unhandled error:", message, e);
    return jsonResponse({ success: false, error: "Server error", version: VERSION }, 500);
  }
});

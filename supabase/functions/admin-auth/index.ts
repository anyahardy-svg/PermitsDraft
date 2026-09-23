import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "2026-03-23-v9";

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

type BcryptModule = {
  compareSync: (plain: string, hash: string) => boolean;
  hashSync: (plain: string, rounds: number) => string;
};

let bcryptModule: BcryptModule | null = null;

async function loadBcrypt(): Promise<BcryptModule> {
  if (bcryptModule) {
    return bcryptModule;
  }
  try {
    bcryptModule = await import("https://esm.sh/bcryptjs@2.4.3");
    return bcryptModule;
  } catch (e) {
    console.error("admin-auth: esm.sh bcrypt load failed, trying npm:", e);
    bcryptModule = await import("npm:bcryptjs@2.4.3");
    return bcryptModule;
  }
}

function isBcryptHash(hash: string) {
  return hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
}

async function comparePassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) {
    return false;
  }
  try {
    const bcrypt = await loadBcrypt();
    return bcrypt.compareSync(plain, hash);
  } catch (e) {
    console.error("admin-auth: bcrypt compare error", e);
    return false;
  }
}

async function hashPassword(plain: string): Promise<string | null> {
  try {
    const bcrypt = await loadBcrypt();
    return bcrypt.hashSync(plain, 10);
  } catch (e) {
    console.error("admin-auth: bcrypt hash error", e);
    return null;
  }
}

type AdminLoginRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  site_ids?: string[] | null;
};

function loginSuccessResponse(adminUser: AdminLoginRow) {
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
    version: VERSION,
  });
}

type AdminUserWithHash = AdminLoginRow & { password_hash?: string | null };

async function fetchAdminByEmail(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  email: string,
): Promise<{ user: AdminUserWithHash | null; error: string | null }> {
  let { data: rows, error } = await supabase
    .from("admin_users")
    .select("id, email, name, role, site_ids, password_hash")
    .ilike("email", email)
    .limit(2);

  if (error?.message?.includes("site_ids")) {
    const retry = await supabase
      .from("admin_users")
      .select("id, email, name, role, password_hash")
      .ilike("email", email)
      .limit(2);
    rows = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("admin-auth fetch admin error:", error.message);
    return { user: null, error: error.message };
  }

  if (!rows?.length) {
    return { user: null, error: null };
  }

  if (rows.length > 1) {
    console.error("admin-auth: duplicate admin_users rows for email", email);
  }

  return { user: rows[0] as AdminUserWithHash, error: null };
}

function toLoginRow(user: AdminUserWithHash): AdminLoginRow {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    site_ids: user.site_ids ?? [],
  };
}

async function verifyAdminPassword(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  email: string,
  password: string,
): Promise<
  | { ok: true; user: AdminLoginRow }
  | { ok: false; reason: "not_found" | "needs_setup" | "invalid_password" }
> {
  const { user, error } = await fetchAdminByEmail(supabase, email);
  if (error) {
    return { ok: false, reason: "invalid_password" };
  }
  if (!user) {
    return { ok: false, reason: "not_found" };
  }

  const hash = String(user.password_hash ?? "").trim();
  if (!hash) {
    return { ok: false, reason: "needs_setup" };
  }

  if (isBcryptHash(hash)) {
    const bcryptOk = await comparePassword(password, hash);
    if (bcryptOk) {
      return { ok: true, user: toLoginRow(user) };
    }
  }

  const { data: rpcRows, error: rpcError } = await supabase.rpc("admin_login_verify", {
    p_email: email,
    p_password: password,
  });

  if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
    return { ok: true, user: rpcRows[0] as AdminLoginRow };
  }

  if (rpcError) {
    console.error("admin-auth login rpc error:", rpcError.message, rpcError.code);
  }

  if (!isBcryptHash(hash)) {
    const bcryptOk = await comparePassword(password, hash);
    if (bcryptOk) {
      return { ok: true, user: toLoginRow(user) };
    }
  }

  return { ok: false, reason: "invalid_password" };
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

      const verification = await verifyAdminPassword(supabase, email, password);
      if (verification.ok) {
        return loginSuccessResponse(verification.user);
      }

      if (verification.reason === "needs_setup") {
        const { user } = await fetchAdminByEmail(supabase, email);
        return jsonResponse({
          success: false,
          needsPasswordSetup: true,
          adminId: user?.id,
          email: user?.email ?? email,
          error: "You need to set your password before you can sign in.",
          version: VERSION,
        });
      }

      return jsonResponse({ success: false, error: "Password or username incorrect", version: VERSION });
    }

    if (action === "checkPasswordSetup") {
      const email = normalizeEmail(String(body.email ?? ""));
      if (!email) {
        return jsonResponse({ needsSetup: false, version: VERSION });
      }

      try {
        const { data: adminUser, error } = await supabase
          .from("admin_users")
          .select("id, email, password_hash")
          .ilike("email", email)
          .maybeSingle();

        if (error) {
          console.error("admin-auth checkPasswordSetup query error:", error.message, error.code);
          return jsonResponse({ needsSetup: false, version: VERSION });
        }

        if (!adminUser) {
          return jsonResponse({ needsSetup: false, version: VERSION });
        }

        const needsSetup =
          !adminUser.password_hash || String(adminUser.password_hash).trim() === "";

        return jsonResponse({
          needsSetup,
          adminId: adminUser.id,
          email: adminUser.email,
          version: VERSION,
        });
      } catch (setupError) {
        console.error("admin-auth checkPasswordSetup failed:", setupError);
        return jsonResponse({ needsSetup: false, version: VERSION });
      }
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
      if (!passwordHash) {
        return jsonResponse({ success: false, error: "Failed to set password" }, 500);
      }

      const { error } = await supabase
        .from("admin_users")
        .update({ password_hash: passwordHash })
        .ilike("email", email);

      if (error) {
        console.error("admin-auth setPassword update error:", error.message);
        return jsonResponse({ success: false, error: "Failed to set password" }, 500);
      }

      return jsonResponse({ success: true, version: VERSION });
    }

    return jsonResponse({ success: false, error: "Unknown action", version: VERSION }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("admin-auth unhandled error:", message, e);
    return jsonResponse({ success: false, error: "Server error", version: VERSION }, 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "2026-03-23-v14";

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
  compare?: (
    plain: string,
    hash: string,
    callback: (err: Error | null, same: boolean) => void,
  ) => void;
  hashSync: (plain: string, rounds: number) => string;
};

let bcryptModule: BcryptModule | null = null;

function resolveBcryptModule(mod: BcryptModule & { default?: BcryptModule }): BcryptModule {
  if (mod?.default && typeof mod.default.compareSync === "function") {
    return mod.default;
  }
  return mod;
}

async function loadBcrypt(): Promise<BcryptModule> {
  if (bcryptModule) {
    return bcryptModule;
  }
  try {
    const mod = await import("https://esm.sh/bcryptjs@2.4.3");
    bcryptModule = resolveBcryptModule(mod as BcryptModule & { default?: BcryptModule });
    return bcryptModule;
  } catch (e) {
    console.error("admin-auth: esm.sh bcrypt load failed, trying npm:", e);
    const mod = await import("npm:bcryptjs@2.4.3");
    bcryptModule = resolveBcryptModule(mod as BcryptModule & { default?: BcryptModule });
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
    if (typeof bcrypt.compare === "function") {
      return await new Promise((resolve) => {
        bcrypt.compare(plain, hash, (err, same) => {
          if (err) {
            console.error("admin-auth: bcrypt.compare error", err.message);
            resolve(false);
            return;
          }
          resolve(Boolean(same));
        });
      });
    }
    return bcrypt.compareSync(plain, hash);
  } catch (e) {
    console.error("admin-auth: bcrypt compare error", e);
    return false;
  }
}

async function verifyWithPostgresCrypt(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
  email: string,
  password: string,
): Promise<boolean> {
  const { data: byId, error: byIdError } = await supabase.rpc("admin_password_matches", {
    p_user_id: userId,
    p_password: password,
  });
  if (!byIdError && byId === true) {
    return true;
  }
  if (byIdError && !byIdError.message.includes("does not exist")) {
    console.error("admin-auth admin_password_matches error:", byIdError.message);
  }

  const rpcEmail = normalizeEmail(email);
  const { data: rpcRows, error: rpcError } = await supabase.rpc("admin_login_verify", {
    p_email: rpcEmail,
    p_password: password,
  });
  if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
    return true;
  }
  if (rpcError) {
    console.error("admin-auth admin_login_verify error:", rpcError.message, rpcError.code);
  }
  return false;
}

async function getLoginRpcHealth(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { error: loginVerifyError } = await supabase.rpc("admin_login_verify", {
    p_email: "login-health-check@invalid.local",
    p_password: "x",
  });
  const loginVerify = loginVerifyError?.message?.includes("does not exist")
    ? "missing"
    : loginVerifyError
      ? "error"
      : "ok";

  const { error: matchError } = await supabase.rpc("admin_password_matches", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
    p_password: "x",
  });
  const passwordMatches = matchError?.message?.includes("does not exist")
    ? "missing"
    : matchError
      ? "ok"
      : "ok";

  return { loginVerify, passwordMatches };
}

async function hashPasswordWithSql(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  plain: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("admin_crypt_hash_password", { p_plain: plain });
  if (!error && typeof data === "string" && data.length > 0) {
    return data;
  }
  if (error && !error.message.includes("does not exist")) {
    console.error("admin-auth admin_crypt_hash_password error:", error.message);
  }
  return null;
}

async function hashPassword(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>> | null,
  plain: string,
): Promise<string | null> {
  if (supabase) {
    const sqlHash = await hashPasswordWithSql(supabase, plain);
    if (sqlHash) {
      return sqlHash;
    }
  }
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

type RequestingAdmin = { id: string; role: string; email: string };

async function getRequestingAdmin(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
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

function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mapAdminListRow(row: Record<string, unknown>) {
  const passwordHash = row.password_hash;
  const hasPassword =
    passwordHash != null && String(passwordHash).trim().length > 0;
  const siteIds = (row.site_ids as string[] | null | undefined) ?? [];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    created_at: row.created_at,
    site_ids: siteIds,
    siteIds: siteIds,
    needsPasswordSetup: !hasPassword,
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

  const pgOk = await verifyWithPostgresCrypt(supabase, user.id, String(user.email ?? email), password);
  if (pgOk) {
    return { ok: true, user: toLoginRow(user) };
  }

  const bcryptOk = await comparePassword(password, hash);
  if (bcryptOk) {
    return { ok: true, user: toLoginRow(user) };
  }

  console.error(
    "admin-auth login failed for",
    normalizeEmail(String(user.email ?? email)),
    "hashLen",
    hash.length,
    "hashPrefix",
    hash.slice(0, 7),
  );

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
    const supabase = getSupabaseAdmin();
    const rpcHealth = supabase ? await getLoginRpcHealth(supabase) : null;
    let bcryptSelfTest = false;
    try {
      const bcrypt = await loadBcrypt();
      const sample = bcrypt.hashSync("admin-auth-self-test", 10);
      bcryptSelfTest = bcrypt.compareSync("admin-auth-self-test", sample);
    } catch (e) {
      console.error("admin-auth ping bcryptSelfTest failed:", e);
    }
    return jsonResponse({
      success: true,
      message: "admin-auth is running",
      version: VERSION,
      serviceRoleConfigured: Boolean(supabase),
      rpcHealth,
      bcryptSelfTest,
      hint:
        rpcHealth?.loginVerify === "missing"
          ? "Run migrations/RUN_IN_SUPABASE_FOR_LOGIN.sql in Supabase SQL Editor"
          : !bcryptSelfTest
            ? "Bcrypt broken in Edge runtime; ensure SQL login functions are installed"
            : undefined,
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

      const rpcHealth = await getLoginRpcHealth(supabase);
      if (rpcHealth.loginVerify === "missing") {
        return jsonResponse({
          success: false,
          error: "Password or username incorrect",
          loginSystemMisconfigured: true,
          adminMessage:
            "Supabase is missing admin_login_verify SQL (run migrations/add-admin-login-verify-rpc.sql). Passwords cannot be checked until that is installed.",
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

    if (action === "listAll") {
      const requesterId = String(body.requestingAdminId ?? "");
      const requester = await getRequestingAdmin(supabase, requesterId);
      if (!requester) {
        return jsonResponse({ success: false, error: "Not signed in or session expired" });
      }

      let { data, error } = await supabase
        .from("admin_users")
        .select("id, email, name, role, site_ids, created_at, password_hash")
        .order("name", { ascending: true });

      if (error?.message?.includes("site_ids")) {
        const retry = await supabase
          .from("admin_users")
          .select("id, email, name, role, created_at, password_hash")
          .order("name", { ascending: true });
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
      }

      const rows = (data ?? []).map((row) => mapAdminListRow(row as Record<string, unknown>));
      return jsonResponse({ success: true, data: rows, version: VERSION });
    }

    if (action === "updateAdmin") {
      const requesterId = String(body.requestingAdminId ?? "");
      const requester = await getRequestingAdmin(supabase, requesterId);
      if (!requester || requester.role !== "super_admin") {
        return jsonResponse({
          success: false,
          error: "Only super admins can edit admin users. Log out and back in if your role was recently changed.",
        });
      }

      const userId = String(body.userId ?? "");
      const updates = (body.updates ?? {}) as Record<string, unknown>;
      if (!userId) {
        return jsonResponse({ success: false, error: "Missing user id" }, 400);
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.email !== undefined) {
        updateData.email = normalizeEmail(String(updates.email));
      }
      if (updates.name !== undefined) {
        updateData.name = String(updates.name);
      }
      if (updates.role !== undefined && ["super_admin", "manager"].includes(String(updates.role))) {
        updateData.role = String(updates.role);
      }
      if (updates.siteIds !== undefined || updates.site_ids !== undefined) {
        updateData.site_ids = (updates.siteIds ?? updates.site_ids ?? []) as string[];
      }
      if (updates.password) {
        const passwordHash = await hashPassword(supabase, String(updates.password));
        if (!passwordHash) {
          return jsonResponse({ success: false, error: "Failed to hash password" }, 500);
        }
        updateData.password_hash = passwordHash;
      }

      let { data, error } = await supabase
        .from("admin_users")
        .update(updateData)
        .eq("id", userId)
        .select("id, email, name, role, site_ids")
        .single();

      if (error?.message?.includes("site_ids")) {
        const { site_ids, ...fallback } = updateData;
        const retry = await supabase
          .from("admin_users")
          .update(fallback)
          .eq("id", userId)
          .select("id, email, name, role")
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error("admin-auth updateAdmin error:", error.message);
        const message = error.message.includes("admin_users_email_key")
          ? "An admin with this email already exists"
          : error.message;
        return jsonResponse({ success: false, error: message }, 400);
      }

      const siteIds = (data as { site_ids?: string[] })?.site_ids ?? [];
      return jsonResponse({
        success: true,
        data: { ...data, siteIds },
        version: VERSION,
      });
    }

    if (action === "createAdmin") {
      const requesterId = String(body.requestingAdminId ?? "");
      const requester = await getRequestingAdmin(supabase, requesterId);
      if (!requester || requester.role !== "super_admin") {
        return jsonResponse({ success: false, error: "Only super admins can create admin users" });
      }

      const email = normalizeEmail(String(body.email ?? ""));
      const name = String(body.name ?? "").trim();
      const role = String(body.role ?? "manager");
      const siteIds = (body.siteIds ?? body.site_ids ?? []) as string[];
      const password = String(body.password ?? "");

      if (!email || !name) {
        return jsonResponse({ success: false, error: "Email and name are required" }, 400);
      }
      if (!["super_admin", "manager"].includes(role)) {
        return jsonResponse({ success: false, error: "Invalid role" }, 400);
      }

      let passwordHash = "";
      if (password) {
        passwordHash = (await hashPassword(supabase, password)) ?? "";
        if (!passwordHash) {
          return jsonResponse({ success: false, error: "Failed to hash password" }, 500);
        }
      }

      const insertPayload: Record<string, unknown> = {
        email,
        name,
        role,
        password_hash: passwordHash,
        site_ids: siteIds,
      };

      let { data, error } = await supabase
        .from("admin_users")
        .insert([insertPayload])
        .select("id, email, name, role, site_ids")
        .single();

      if (error?.message?.includes("site_ids")) {
        const { site_ids, ...fallback } = insertPayload;
        const retry = await supabase
          .from("admin_users")
          .insert([fallback])
          .select("id, email, name, role")
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }

      const outSiteIds = (data as { site_ids?: string[] })?.site_ids ?? [];
      return jsonResponse({
        success: true,
        data: { ...data, siteIds: outSiteIds },
        version: VERSION,
      });
    }

    if (action === "deleteAdmin") {
      const requesterId = String(body.requestingAdminId ?? "");
      const requester = await getRequestingAdmin(supabase, requesterId);
      if (!requester || requester.role !== "super_admin") {
        return jsonResponse({ success: false, error: "Only super admins can delete admin users" });
      }

      const userId = String(body.userId ?? "");
      if (!userId) {
        return jsonResponse({ success: false, error: "Missing user id" }, 400);
      }
      if (userId === requesterId) {
        return jsonResponse({ success: false, error: "You cannot delete your own account" }, 400);
      }

      const { error } = await supabase.from("admin_users").delete().eq("id", userId);
      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }
      return jsonResponse({ success: true, version: VERSION });
    }

    if (action === "requestPasswordReset") {
      const email = normalizeEmail(String(body.email ?? ""));
      if (!email) {
        return jsonResponse({ success: true, version: VERSION });
      }

      const { user } = await fetchAdminByEmail(supabase, email);
      if (!user?.id) {
        return jsonResponse({ success: true, version: VERSION });
      }

      const token = generateResetToken();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from("admin_users")
        .update({
          password_reset_token: token,
          password_reset_token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        console.error("admin-auth requestPasswordReset error:", error.message);
        return jsonResponse({ success: false, error: "Failed to process reset request", version: VERSION });
      }

      const appOrigin = String(body.appOrigin ?? "").trim().replace(/\/$/, "");
      const resetUrl = appOrigin
        ? `${appOrigin}/admin/reset-password?token=${token}`
        : `/admin/reset-password?token=${token}`;

      return jsonResponse({
        success: true,
        resetUrl,
        email: user.email,
        version: VERSION,
      });
    }

    if (action === "resetPasswordWithToken") {
      const token = String(body.token ?? "").trim();
      const newPassword = String(body.newPassword ?? "");
      if (!token || newPassword.length < 6) {
        return jsonResponse({ success: false, error: "Invalid reset request", version: VERSION });
      }

      const { data: adminUser, error: fetchError } = await supabase
        .from("admin_users")
        .select("id, email, password_reset_token_expires_at")
        .eq("password_reset_token", token)
        .maybeSingle();

      if (fetchError || !adminUser) {
        return jsonResponse({ success: false, error: "Invalid or expired reset link", version: VERSION });
      }

      const expiresAt = new Date(String(adminUser.password_reset_token_expires_at));
      if (expiresAt < new Date()) {
        return jsonResponse({
          success: false,
          error: "Reset link has expired. Please request a new one.",
          version: VERSION,
        });
      }

      const passwordHash = await hashPassword(newPassword);
      if (!passwordHash) {
        return jsonResponse({ success: false, error: "Failed to set password", version: VERSION });
      }

      const { error: updateError } = await supabase
        .from("admin_users")
        .update({
          password_hash: passwordHash,
          password_reset_token: null,
          password_reset_token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", adminUser.id);

      if (updateError) {
        console.error("admin-auth resetPasswordWithToken error:", updateError.message);
        return jsonResponse({ success: false, error: "Failed to update password", version: VERSION });
      }

      return jsonResponse({ success: true, message: "Password has been reset successfully", version: VERSION });
    }

    if (action === "getAdminByEmail") {
      const requesterId = String(body.requestingAdminId ?? "");
      const requester = await getRequestingAdmin(supabase, requesterId);
      if (!requester || requester.role !== "super_admin") {
        return jsonResponse({ success: false, error: "Only super admins can access this" });
      }

      const email = normalizeEmail(String(body.email ?? ""));
      const { user } = await fetchAdminByEmail(supabase, email);
      if (!user?.id) {
        return jsonResponse({ success: false, error: "Admin user not found" });
      }

      const hash = String(user.password_hash ?? "").trim();
      return jsonResponse({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          needsPasswordSetup: !hash,
        },
        version: VERSION,
      });
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

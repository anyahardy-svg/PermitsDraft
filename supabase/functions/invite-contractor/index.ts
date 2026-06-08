import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, redirectTo } = await req.json();

    console.log(`🔐 Inviting contractor: ${email}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const normalizedEmail = String(email || "").trim();
    if (!normalizedEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: contractor, error: contractorError } = await supabase
      .from("contractors")
      .select("id, name, company_id, email")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (contractorError || !contractor) {
      console.error("❌ Contractor not found for invite:", contractorError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email not found in contractor list. Please add them first.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const inviteMetadata = {
      contractor_id: contractor.id,
      contractor_name: contractor.name,
      company_id: contractor.company_id,
      name: contractor.name,
      user_type: "contractor",
    };

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo:
          redirectTo || "https://contractorhq.co.nz/sign-in-contractor/",
        data: inviteMetadata,
      }
    );

    if (error) {
      console.error("❌ Invite error:", error);

      if (error.message?.toLowerCase().includes("already been registered")) {
        const { data: existingUsers, error: listError } =
          await supabase.auth.admin.listUsers();

        if (!listError && existingUsers?.users) {
          const existingUser = existingUsers.users.find(
            (user) =>
              user.email?.toLowerCase() === normalizedEmail.toLowerCase()
          );

          if (existingUser) {
            const { error: updateError } =
              await supabase.auth.admin.updateUserById(existingUser.id, {
                user_metadata: {
                  ...(existingUser.user_metadata || {}),
                  ...inviteMetadata,
                },
              });

            if (!updateError) {
              const { error: recoveryError } =
                await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                  redirectTo:
                    redirectTo ||
                    "https://contractorhq.co.nz/sign-in-contractor/",
                });

              if (!recoveryError) {
                return new Response(
                  JSON.stringify({
                    success: true,
                    message: `Password setup link sent to ${normalizedEmail}`,
                  }),
                  {
                    headers: {
                      ...corsHeaders,
                      "Content-Type": "application/json",
                    },
                  }
                );
              }
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to invite user",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ User invited successfully:", data);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Password setup link sent to ${normalizedEmail}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Exception:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

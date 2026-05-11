import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, name, phone, companyName } = await req.json();

    // Validate input
    if (!email || !name || !companyName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: email, name, companyName",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role key (server-side)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for duplicate pending request
    const { data: existingRequest, error: queryError } = await supabaseAdmin
      .from("contractor_join_requests")
      .select("id, status")
      .eq("email", email)
      .isNull("company_id")
      .eq("status", "pending")
      .single();

    if (queryError && queryError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is expected
      console.error("Query error:", queryError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to check for existing request",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (existingRequest) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You already have a pending request for this company",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert the join request
    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from("contractor_join_requests")
      .insert({
        email,
        name,
        phone: phone || null,
        company_name: companyName,
        company_id: null, // No company_id yet - admin will assign during review
        status: "pending",
      })
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError.message || "Failed to submit join request",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Your request to join ${companyName} has been submitted. An admin will review within 24 hours.`,
        data: newRequest,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

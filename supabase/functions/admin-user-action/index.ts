import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};
const allowedOrigins = new Set([
  "https://xn--3bts89a.com",
  "https://宫水.com",
]);
const json = (body: unknown, status = 200, origin = "") => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, ...(allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}), "Content-Type": "application/json" } },
);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    if (origin && !allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403, "");
    return new Response("ok", { headers: { ...corsHeaders, ...(origin ? { "Access-Control-Allow-Origin": origin } : {}) } });
  }
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403, "");
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
    if (!url || !anonKey || !serviceKey) return json({ error: "Server credentials are not configured" }, 500, origin);

    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token || token === authorization) return json({ error: "Authentication required" }, 401, origin);

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Session expired. Please sign in again." }, 401, origin);

    // This existing read RPC performs the server-side developer allowlist check.
    const { error: permissionError } = await userClient.rpc("admin_user_overview", {
      p_search: null, p_limit: 1, p_offset: 0,
    });
    if (permissionError) return json({ error: "Developer access required" }, 403, origin);

    const body = await req.json().catch(() => null);
    const action = body?.action;
    const userId = String(body?.userId || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return json({ error: "Invalid user ID" }, 400, origin);
    }
    if (userId === authData.user.id) return json({ error: "You cannot manage your own administrator account here." }, 400, origin);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === "ban") {
      const seconds = Number(body?.durationSeconds);
      if (!Number.isInteger(seconds) || seconds < 60 || seconds > 3153600000) {
        return json({ error: "Ban duration must be between 1 minute and 100 years." }, 400, origin);
      }
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: `${seconds}s`,
      });
      if (error) return json({ error: error.message }, 400, origin);
      console.info("admin_user_banned", { actor: authData.user.id, target: userId, durationSeconds: seconds });
      return json({ ok: true, action: "ban" }, 200, origin);
    }

    if (action === "unban") {
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (error) return json({ error: error.message }, 400, origin);
      console.info("admin_user_unbanned", { actor: authData.user.id, target: userId });
      return json({ ok: true, action: "unban" }, 200, origin);
    }

    if (action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(userId, false);
      if (error) return json({ error: error.message }, 400, origin);
      console.warn("admin_user_deleted", { actor: authData.user.id, target: userId });
      return json({ ok: true, action: "delete" }, 200, origin);
    }

    return json({ error: "Unsupported action" }, 400, origin);
  } catch (error) {
    console.error("admin_user_action_failed", error);
    return json({ error: "Internal server error" }, 500, origin);
  }
});

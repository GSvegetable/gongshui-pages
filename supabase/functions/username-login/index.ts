import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const { username, password } = await req.json();
    const name = String(username || "").trim();
    const pass = String(password || "");
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$/.test(name) || !pass) {
      return new Response(JSON.stringify({ error: "用户名或密码不正确" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const lookup = await fetch(url + "/rest/v1/rpc/resolve_username_user_id", {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" },
      body: JSON.stringify({ p_username: name }),
    });
    if (!lookup.ok) throw new Error("Username lookup failed");
    const userId = await lookup.json();
    if (!userId) return new Response(JSON.stringify({ error: "用户名或密码不正确" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const profile = await fetch(url + "/auth/v1/admin/users/" + encodeURIComponent(userId), {
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey },
    });
    if (!profile.ok) throw new Error("Account lookup failed");
    const account = await profile.json();
    if (!account.email) throw new Error("Account email unavailable");

    const auth = await fetch(url + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: account.email, password: pass }),
    });
    const result = await auth.json();
    if (!auth.ok) return new Response(JSON.stringify({ error: "用户名或密码不正确" }), { status: auth.status === 429 ? 429 : 401, headers: { ...cors, "Content-Type": "application/json" } });
    return new Response(JSON.stringify(result), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "账号服务暂时不可用，请稍后再试" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});

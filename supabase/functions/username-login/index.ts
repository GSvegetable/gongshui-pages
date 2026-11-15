import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "Retry-After",
};

const responseHeaders = {
  ...cors,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...responseHeaders, ...extra } });

const hmacHex = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const contentLength = Number(req.headers.get("Content-Length") || 0);
    if (contentLength > 4096) return json({ error: "Request too large" }, 413);
    const rawBody = await req.text();
    if (rawBody.length > 4096) return json({ error: "Request too large" }, 413);

    let body: { username?: unknown; password?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid request" }, 400);
    }

    const name = String(body.username || "").trim();
    const pass = String(body.password || "");
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$/.test(name) || !pass || pass.length > 1024) {
      return json({ error: "用户名或密码不正确" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!url || !serviceKey || !anonKey) throw new Error("Auth service configuration missing");

    const subjectHash = await hmacHex(serviceKey, "username-login:" + name.toLowerCase());
    const throttleRes = await fetch(url + "/rest/v1/rpc/consume_username_login_rate_limit", {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_subject_hash: subjectHash }),
    });
    if (!throttleRes.ok) throw new Error("Username login throttle unavailable");
    const throttle = await throttleRes.json();
    if (!throttle?.allowed) {
      const retry = Math.max(1, Number(throttle.retry_after_seconds) || 900);
      return json({ error: "尝试次数过多，请 15 分钟后再试" }, 429, { "Retry-After": String(retry) });
    }

    const lookup = await fetch(url + "/rest/v1/rpc/resolve_username_email", {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_username: name }),
    });
    if (!lookup.ok) throw new Error("Username lookup failed");
    const accountEmail = await lookup.json();

    const authEmail = typeof accountEmail === "string" && accountEmail
      ? accountEmail
      : crypto.randomUUID() + "@example.com";
    const auth = await fetch(url + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: authEmail, password: pass }),
    });
    const result = await auth.json();

    if (!accountEmail || !auth.ok) {
      if (auth.status === 429) {
        const retry = auth.headers.get("Retry-After");
        return json({ error: "尝试次数过多，请稍后再试" }, 429, retry ? { "Retry-After": retry } : {});
      }
      return json({ error: "用户名或密码不正确" }, 401);
    }

    return json(result, 200);
  } catch (_error) {
    return json({ error: "账号服务暂时不可用，请稍后再试" }, 500);
  }
});

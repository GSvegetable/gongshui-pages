import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "Retry-After",
};
const headers = {
  ...cors,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });

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
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    const callerToken = authorization.replace(/^Bearer\s+/i, "");
    if (!callerToken || callerToken === authorization) return json({ error: "请先登录" }, 401);

    const contentLength = Number(req.headers.get("Content-Length") || 0);
    if (contentLength > 4096) return json({ error: "Request too large" }, 413);
    const rawBody = await req.text();
    if (rawBody.length > 4096) return json({ error: "Request too large" }, 413);

    let body: { identifier?: unknown; password?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid request" }, 400);
    }

    const login = String(body.identifier || "").trim();
    const password = String(body.password || "");
    if (!login || !password || password.length > 1024 || login.length > 320) {
      return json({ error: "请填写有效的账号和密码" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL") || "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!url || !service || !anon) throw new Error("Auth service configuration missing");

    const callerRes = await fetch(url + "/auth/v1/user", {
      headers: { apikey: anon, Authorization: "Bearer " + callerToken },
    });
    if (!callerRes.ok) return json({ error: "当前登录状态已失效，请重新登录" }, 401);
    const caller = await callerRes.json();

    const subjectHash = await hmacHex(service, "link-account:" + login.toLowerCase());
    const throttleRes = await fetch(url + "/rest/v1/rpc/consume_username_login_rate_limit", {
      method: "POST",
      headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json" },
      body: JSON.stringify({ p_subject_hash: subjectHash }),
    });
    if (!throttleRes.ok) throw new Error("Account-link throttle unavailable");
    const throttle = await throttleRes.json();
    if (!throttle?.allowed) {
      const retry = Math.max(1, Number(throttle.retry_after_seconds) || 900);
      return json({ error: "尝试次数过多，请 15 分钟后再试" }, 429, { "Retry-After": String(retry) });
    }

    let email = login;
    if (!login.includes("@")) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$/.test(login)) {
        return json({ error: "用户名或密码不正确" }, 401);
      }
      const lookup = await fetch(url + "/rest/v1/rpc/resolve_username_email", {
        method: "POST",
        headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json" },
        body: JSON.stringify({ p_username: login }),
      });
      if (!lookup.ok) throw new Error("Username lookup failed");
      email = await lookup.json() || "";
    }

    const resolvedEmail = email;
    const authEmail = resolvedEmail || crypto.randomUUID() + "@example.com";
    const authRes = await fetch(url + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email: authEmail, password }),
    });
    const session = await authRes.json();
    if (!resolvedEmail || !authRes.ok || !session?.user?.id) {
      if (authRes.status === 429) {
        const retry = authRes.headers.get("Retry-After");
        return json({ error: "尝试次数过多，请稍后再试" }, 429, retry ? { "Retry-After": retry } : {});
      }
      return json({ error: "用户名或密码不正确" }, 401);
    }
    if (session.user.id === caller.id) return json({ error: "这已经是当前登录的账号" }, 400);

    const attach = await fetch(url + "/rest/v1/rpc/attach_accounts_to_group", {
      method: "POST",
      headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json" },
      body: JSON.stringify({ p_current_user_id: caller.id, p_target_user_id: session.user.id }),
    });
    if (!attach.ok) {
      const detail = await attach.text();
      if (detail.includes("maximum nine accounts")) return json({ error: "一个人最多关联 9 个账号" }, 400);
      if (detail.includes("account groups changed")) return json({ error: "账号关联状态刚刚发生变化，请重试" }, 409);
      throw new Error("Account group attachment failed");
    }

    return json(session, 200);
  } catch (_error) {
    return json({ error: "账号关联失败，请检查登录信息后重试" }, 500);
  }
});

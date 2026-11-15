import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const headers = {
  ...cors,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const contentLength = Number(req.headers.get("Content-Length") || 0);
    if (contentLength > 4096) return json({ error: "Request too large" }, 413);
    const rawBody = await req.text();
    if (rawBody.length > 4096) return json({ error: "Request too large" }, 413);

    let body: { password?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid request" }, 400);
    }

    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 12) {
      return json({ error: "新密码至少需要 12 位" }, 400);
    }
    if (password.length > 1024) {
      return json({ error: "密码长度超出允许范围" }, 400);
    }

    // HIBP Pwned Passwords k-anonymity: only the first five SHA-1
    // characters leave this function. Never log or persist the password/hash.
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const hibp = await fetch("https://api.pwnedpasswords.com/range/" + prefix, {
      method: "GET",
      headers: {
        "User-Agent": "Gongshui-Password-Policy/1.0",
        "Add-Padding": "true",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!hibp.ok) {
      return json({ error: "暂时无法完成密码安全检查，请稍后再试" }, 503);
    }

    const responseText = await hibp.text();
    const compromised = responseText.split(/\r?\n/).some(line => {
      const [candidate, countText] = line.trim().split(":");
      return candidate?.toUpperCase() === suffix && Number(countText) > 0;
    });

    if (compromised) {
      return json({ error: "这个密码曾出现在已知数据泄露记录中，请更换一个从未使用过的密码" }, 400);
    }

    return json({ ok: true, minimumLength: 12 });
  } catch (_error) {
    return json({ error: "暂时无法完成密码安全检查，请稍后再试" }, 503);
  }
});

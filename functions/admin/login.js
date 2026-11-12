
const encoder = new TextEncoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid encoding");
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value))
  );
}

function verifyPassword(password, storedPassword) {
  if (
    typeof password !== "string" ||
    typeof storedPassword !== "string"
  ) {
    return false;
  }

  return password === storedPassword;
  
}
async function createSession(email, secret) {
  const now = Math.floor(Date.now() / 1000);

  const payload = base64url(
    encoder.encode(JSON.stringify({
      email,
      iat: now,
      exp: now + 28800
    }))
  );

  const signature = await hmac(payload, secret);

  return payload + "." + base64url(signature);
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, {
      Allow: "POST"
    });
  }

  const origin = request.headers.get("Origin");

  if (origin !== new URL(request.url).origin) {
    return json({ error: "Forbidden" }, 403);
  }

  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    return json({ error: "JSON required" }, 415);
  }

  if (!env.DB || !env.ADMIN_EMAIL ||
      !env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ error: "Server configuration error" }, 500);
  }

  try {
    const rawBody = await request.text();

    if (rawBody.length > 4096) {
      return json({ error: "Request too large" }, 413);
    }

    const body = JSON.parse(rawBody);

    const email = typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

    const password = typeof body.password === "string"
      ? body.password
      : "";

    if (!email || !password || password.length > 1024) {
      return json({ error: "Invalid email or password" }, 400);
    }

    const ip = request.headers.get("CF-Connecting-IP");

    if (!ip) {
      return json({ error: "Unable to verify request" }, 503);
    }

    const ipHash = base64url(
      await hmac(ip, env.SESSION_SECRET)
    );

    const now = Math.floor(Date.now() / 1000);

    const previous = await env.DB.prepare(
      "SELECT failed_attempts, window_started_at, locked_until FROM admin_login_attempts WHERE ip_hash = ?"
    ).bind(ipHash).first();

    if (previous?.locked_until && previous.locked_until > now) {
      return json({
        error: "Too many attempts. Try again later."
      }, 429, {
        "Retry-After": String(previous.locked_until - now)
      });
    }

    const expectedEmail = env.ADMIN_EMAIL.trim().toLowerCase();

    const emailMatches = email === expectedEmail;

    const passwordMatches = emailMatches
      ? await verifyPassword(password, env.ADMIN_PASSWORD)
      : false;
    
    if (!emailMatches || !passwordMatches) {
      await env.DB.prepare(`
        INSERT INTO admin_login_attempts
          (ip_hash, failed_attempts, window_started_at, locked_until, updated_at)
        VALUES (?, 1, ?, NULL, ?)
        ON CONFLICT(ip_hash) DO UPDATE SET
          failed_attempts = CASE
            WHEN excluded.updated_at - admin_login_attempts.window_started_at >= 900
            THEN 1
            ELSE admin_login_attempts.failed_attempts + 1
          END,
          window_started_at = CASE
            WHEN excluded.updated_at - admin_login_attempts.window_started_at >= 900
            THEN excluded.updated_at
            ELSE admin_login_attempts.window_started_at
          END,
          locked_until = CASE
            WHEN (
              CASE
                WHEN excluded.updated_at - admin_login_attempts.window_started_at >= 900
                THEN 1
                ELSE admin_login_attempts.failed_attempts + 1
              END
            ) >= 5
            THEN excluded.updated_at + 900
            ELSE NULL
          END,
          updated_at = excluded.updated_at
      `).bind(ipHash, now, now).run();

      return json({
        error: "Invalid email or password"
      }, 401);
    }

    await env.DB.prepare(
      "DELETE FROM admin_login_attempts WHERE ip_hash = ?"
    ).bind(ipHash).run();

    const session = await createSession(
      expectedEmail,
      env.SESSION_SECRET
    );

    return json(
      {
        status: "ok",
        message: "Login successful"
      },
      200,
      {
        "Set-Cookie":
          `LW_ADMIN_SESSION=${session}; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=28800`
      }
    );

  } catch (error) {
    return json({
      error: "Unable to process login"
    }, 500);
  }
}

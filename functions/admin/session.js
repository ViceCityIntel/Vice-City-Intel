
const encoder = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
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

async function verifySignature(payload, signature, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(payload)
  );
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const cookieHeader = request.headers.get("Cookie") || "";

    const cookie = cookieHeader
      .split(";")
      .map(item => item.trim())
      .find(item => item.startsWith("LW_ADMIN_SESSION="));

    if (!cookie || !env.SESSION_SECRET || !env.ADMIN_EMAIL) {
      return json({ authenticated: false }, 401);
    }

    const token = cookie.substring("LW_ADMIN_SESSION=".length);
    const parts = token.split(".");

    if (parts.length !== 2) {
      return json({ authenticated: false }, 401);
    }

    const [payload, signatureText] = parts;

    const signature = decodeBase64url(signatureText);

    const valid = await verifySignature(
      payload,
      signature,
      env.SESSION_SECRET
    );

    if (!valid) {
      return json({ authenticated: false }, 401);
    }

    const decoded = new TextDecoder().decode(
      decodeBase64url(payload)
    );

    const session = JSON.parse(decoded);

    const now = Math.floor(Date.now() / 1000);

    if (
      session.email !== env.ADMIN_EMAIL.trim().toLowerCase() ||
      !Number.isInteger(session.iat) ||
      !Number.isInteger(session.exp) ||
      session.exp <= now ||
      session.exp - session.iat !== 28800 ||
      session.iat > now + 60
    ) {
      return json({ authenticated: false }, 401);
    }

    return json({
      authenticated: true,
      email: session.email
    });

  } catch (error) {
    return json({ authenticated: false }, 401);
  }
}


const encoder = new TextEncoder();

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function decodeBase64url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid encoding");
  }

  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = base64 + "=".repeat(
    (4 - base64.length % 4) % 4
  );

  const binary = atob(padded);

  return Uint8Array.from(
    binary,
    character => character.charCodeAt(0)
  );
}

export async function requireAdmin(request, env) {
  try {
    if (!env.SESSION_SECRET || !env.ADMIN_EMAIL) {
      return json({ error: "Server configuration error" }, 500);
    }

    const cookieHeader = request.headers.get("Cookie") || "";

    const cookie = cookieHeader
      .split(";")
      .map(item => item.trim())
      .find(item => item.startsWith("LW_ADMIN_SESSION="));

    if (!cookie) {
      return json({ error: "Authentication required" }, 401);
    }

    const token = cookie.substring(
      "LW_ADMIN_SESSION=".length
    );

    const parts = token.split(".");

    if (parts.length !== 2) {
      return json({ error: "Invalid session" }, 401);
    }

    const [payload, signatureText] = parts;

    const signature = decodeBase64url(signatureText);

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.SESSION_SECRET),
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(payload)
    );

    if (!valid) {
      return json({ error: "Invalid session" }, 401);
    }

    const session = JSON.parse(
      new TextDecoder().decode(
        decodeBase64url(payload)
      )
    );

    const now = Math.floor(Date.now() / 1000);

    if (
      session.email !== env.ADMIN_EMAIL.trim().toLowerCase() ||
      !Number.isInteger(session.iat) ||
      !Number.isInteger(session.exp) ||
      session.exp <= now ||
      session.exp - session.iat !== 28800 ||
      session.iat > now + 60
    ) {
      return json({ error: "Session expired or invalid" }, 401);
    }

    return null;

  } catch (error) {
    return json({ error: "Authentication failed" }, 401);
  }
}

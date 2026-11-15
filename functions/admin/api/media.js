
import { requireAdmin } from "../_auth.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequest({ request, env }) {
  const authError = await requireAdmin(request, env);

  if (authError) return authError;

  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, 405);
  }

  if (!env.MEDIA) {
    return json({
      error: "Media storage is not configured."
    }, 500);
  }

  try {
    const url = new URL(request.url);

    const cursor = url.searchParams.get("cursor");

    const options = {
      prefix: "uploads/",
      limit: 100
    };

    if (cursor) {
      options.cursor = cursor;
    }

    const result = await env.MEDIA.list(options);

    const media = result.objects.map(object => ({
      key: object.key,
      filename: object.key.split("/").pop(),
      url: `https://media.leonidawhispers.com/${object.key}`,
      size: object.size,
      uploaded: object.uploaded,
      type: object.httpMetadata?.contentType || "unknown"
    }));

    return json({
      status: "success",
      total: media.length,
      media,
      truncated: result.truncated,
      cursor: result.truncated ? result.cursor : null
    });

  } catch (error) {
    return json({
      error: "Unable to load media library."
    }, 500);
  }
}

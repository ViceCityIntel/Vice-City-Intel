
import { requireAdmin } from "../_auth.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

// Identify file types when R2 metadata is missing.
function getContentType(object) {
  const storedType = object.httpMetadata?.contentType;

  if (
    storedType &&
    storedType !== "unknown" &&
    storedType !== "application/octet-stream"
  ) {
    return storedType;
  }

  const filename = object.key.split("/").pop().toLowerCase();
  const extension = filename.includes(".")
    ? filename.split(".").pop()
    : "";

  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    avif: "image/avif",
    bmp: "image/bmp",
    ico: "image/x-icon",

    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    m4v: "video/x-m4v",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
    ogv: "video/ogg",

    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg"
  };

  return types[extension] || storedType || "unknown";
}

export async function onRequest({ request, env }) {
  const authError = await requireAdmin(request, env);

  if (authError) return authError;

  if (
    request.method !== "GET" &&
    request.method !== "DELETE"
  ) {
    return json({ error: "Method not allowed." }, 405);
  }

  if (!env.MEDIA) {
    return json({
      error: "Media storage is not configured."
    }, 500);
  }

  try {
    // Delete media
    if (request.method === "DELETE") {
      const body = await request.json();
      const key = body.key;

      if (
        typeof key !== "string" ||
        !key.startsWith("uploads/") ||
        key.split("/").includes("..") ||
        key.includes("\\")
      ) {
        return json({ error: "Invalid media file." }, 400);
      }

      const object = await env.MEDIA.head(key);

      if (!object) {
        return json({ error: "Media file not found." }, 404);
      }

      await env.MEDIA.delete(key);

      return json({
        status: "success",
        message: "Media deleted successfully."
      });
    }

    // Load media library
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
      type: getContentType(object)
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

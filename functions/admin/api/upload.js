
import { requireAdmin } from "../_auth.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov"
};

export async function onRequest({ request, env }) {
  const authError = await requireAdmin(request, env);

  if (authError) return authError;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!env.MEDIA) {
    return json({ error: "Media storage is not configured" }, 500);
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file.stream !== "function") {
      return json({ error: "Please select a file" }, 400);
    }

    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
      return json({ error: "Unsupported file type" }, 400);
    }

    const maxSize = file.type.startsWith("video/")
      ? 50 * 1024 * 1024
      : 15 * 1024 * 1024;

    if (file.size > maxSize) {
      return json({
        error: "File is too large. Maximum: 50MB for video and 15MB for images."
      }, 413);
    }

    const date = new Date();
    const folder = date.toISOString().slice(0, 7);

    const key = `uploads/${folder}/${crypto.randomUUID()}.${extension}`;

    await env.MEDIA.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable"
      }
    });

    const url = `https://media.leonidawhispers.com/${key}`;

    return json({
      status: "success",
      message: "Media uploaded successfully",
      key,
      url,
      filename: file.name,
      type: file.type,
      size: file.size
    });

  } catch (error) {
    return json({
      error: "Upload failed. Please try again."
    }, 500);
  }
}


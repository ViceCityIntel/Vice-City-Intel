
import { requireAdmin } from "../../_auth.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

const MAX_SIZE = 250 * 1024 * 1024;
const MAX_PARTS = 50;

const ALLOWED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime"
];

export async function onRequest({ request, env }) {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;

  if (!env.MEDIA) {
    return json({ error: "Media storage is not configured." }, 500);
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    if (request.method === "POST" && action === "initiate") {
      const body = await request.json();

      if (!ALLOWED_TYPES.includes(body.type)) {
        return json({ error: "Unsupported video format." }, 400);
      }

      if (
        !Number.isSafeInteger(body.size) ||
        body.size < 1 ||
        body.size > MAX_SIZE
      ) {
        return json({ error: "Videos must be no larger than 250MB." }, 413);
      }

      const folder = new Date().toISOString().slice(0, 7);
      const extension = body.type === "video/webm" ? "webm" :
        body.type === "video/quicktime" ? "mov" : "mp4";

      const key = `uploads/${folder}/${crypto.randomUUID()}.${extension}`;

      const upload = await env.MEDIA.createMultipartUpload(key, {
        httpMetadata: {
          contentType: body.type,
          cacheControl: "public, max-age=31536000, immutable"
        }
      });

      return json({
        status: "success",
        key: upload.key,
        uploadId: upload.uploadId
      });
    }

    if (request.method === "PUT" && action === "part") {
      const key = url.searchParams.get("key");
      const uploadId = url.searchParams.get("uploadId");
      const partNumber = Number(url.searchParams.get("partNumber"));

      if (
        !key?.startsWith("uploads/") ||
        !uploadId ||
        !Number.isInteger(partNumber) ||
        partNumber < 1 ||
        partNumber > MAX_PARTS ||
        !request.body
      ) {
        return json({ error: "Invalid upload part." }, 400);
      }

      const upload = env.MEDIA.resumeMultipartUpload(key, uploadId);
      const result = await upload.uploadPart(partNumber, request.body);

      return json(result);
    }

    if (request.method === "POST" && action === "complete") {
      const body = await request.json();

      if (
        !body.key?.startsWith("uploads/") ||
        typeof body.uploadId !== "string" ||
        !Array.isArray(body.parts) ||
        body.parts.length < 1 ||
        body.parts.length > MAX_PARTS
      ) {
        return json({ error: "Invalid completion details." }, 400);
      }

      const parts = body.parts.map(part => ({
        partNumber: part.partNumber,
        etag: part.etag
      })).sort((a, b) => a.partNumber - b.partNumber);

      for (let i = 0; i < parts.length; i++) {
        if (
          parts[i].partNumber !== i + 1 ||
          typeof parts[i].etag !== "string" ||
          !parts[i].etag
        ) {
          return json({ error: "Invalid upload parts." }, 400);
        }
      }

      const upload = env.MEDIA.resumeMultipartUpload(
        body.key,
        body.uploadId
      );

      const object = await upload.complete(parts);

      return json({
        status: "success",
        message: "Video uploaded successfully.",
        key: object.key,
        url: `https://media.leonidawhispers.com/${object.key}`,
        size: object.size
      });
    }

    if (request.method === "POST" && action === "abort") {
      const body = await request.json();

      if (
        !body.key?.startsWith("uploads/") ||
        typeof body.uploadId !== "string"
      ) {
        return json({ error: "Invalid abort details." }, 400);
      }

      const upload = env.MEDIA.resumeMultipartUpload(
        body.key,
        body.uploadId
      );

      await upload.abort();

      return json({
        status: "success",
        message: "Upload cancelled."
      });
    }

    return json({ error: "Invalid upload action." }, 400);

  } catch (error) {
    return json({
      error: "Multipart upload failed. Please try again."
    }, 500);
  }
}

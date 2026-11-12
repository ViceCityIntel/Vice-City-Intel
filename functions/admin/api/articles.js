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

  if (request.method === "GET") {
    try {
      const result = await env.DB.prepare(`
        SELECT
          id, title, slug, excerpt, category,
          status, featured, cover_image_url,
          published_at, created_at, updated_at
        FROM articles
        ORDER BY updated_at DESC
      `).all();

      return json({
        status: "ok",
        count: result.results.length,
        articles: result.results
      });

    } catch (error) {
      return json({
        error: "Unable to retrieve articles"
      }, 500);
    }
  }

  return json({
    error: "Method not allowed"
  }, 405);
}

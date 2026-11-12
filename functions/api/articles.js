
export async function onRequest({ request, env }) {
  if (request.method !== "GET") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const result = await env.DB.prepare(`
      SELECT
        id,
        title,
        slug,
        excerpt,
        content_markdown,
        category,
        featured,
        cover_image_url,
        published_at,
        created_at
      FROM articles
      WHERE status = 'published'
      ORDER BY
        featured DESC,
        COALESCE(published_at, created_at) DESC
    `).all();

    return Response.json(
      {
        status: "ok",
        count: result.results.length,
        articles: result.results
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60"
        }
      }
    );

  } catch (error) {
    return Response.json(
      {
        status: "error",
        message: "Unable to retrieve articles"
      },
      { status: 500 }
    );
  }
}

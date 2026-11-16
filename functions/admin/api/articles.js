
import { requireAdmin } from "../_auth.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function makeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

async function notifyIndexNow(env, slug) {
  const key = typeof env.INDEXNOW_KEY === "string"
    ? env.INDEXNOW_KEY.trim()
    : "";

  if (!key) {
    console.warn("IndexNow key is missing.");

    return {
      accepted: false,
      pending: false,
      httpStatus: null,
      message: "INDEXNOW_KEY is not configured."
    };
  }

  const articleURL =
    "https://leonidawhispers.com/article.html?slug=" +
    encodeURIComponent(slug);

  try {
    const response = await fetch(
      "https://api.indexnow.org/indexnow",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify({
          host: "leonidawhispers.com",
          key,
          keyLocation:
            "https://leonidawhispers.com/" + key + ".txt",
          urlList: [articleURL]
        })
      }
    );

    const accepted =
      response.status === 200 ||
      response.status === 202;

    return {
      accepted,
      pending: response.status === 202,
      httpStatus: response.status,
      message: response.status === 200
        ? "URL notification accepted."
        : response.status === 202
        ? "Request accepted; key validation is pending."
        : "IndexNow returned HTTP " + response.status + "."
    };

  } catch (error) {
    console.warn("IndexNow notification failed:", error);

    return {
      accepted: false,
      pending: false,
      httpStatus: null,
      message: "IndexNow request failed: " +
        (error?.message || "network error")
    };
  }
}

async function readBody(request) {
  const contentType =
    request.headers.get("Content-Type") || "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await request.json();
  } catch {
    return null;
  }
}

function validateArticle(body) {
  if (
    !body ||
    typeof body.title !== "string" ||
    !body.title.trim() ||
    body.title.length > 200
  ) {
    return "A valid article title is required";
  }

  if (
    typeof body.content_markdown !== "string" ||
    body.content_markdown.length > 100000
  ) {
    return "Article content is required and must be under 100,000 characters";
  }

  if (
    body.status !== undefined &&
    !["draft", "published"].includes(body.status)
  ) {
    return "Status must be draft or published";
  }

  if (
    body.featured !== undefined &&
    typeof body.featured !== "boolean" &&
    body.featured !== 0 &&
    body.featured !== 1
  ) {
    return "Featured must be true or false";
  }

  return null;
}

export async function onRequest({ request, env }) {
  const authError = await requireAdmin(request, env);

  if (authError) return authError;

  try {

    // GET: Retrieve all articles
    if (request.method === "GET") {
      const result = await env.DB.prepare(`
        SELECT
          id, title, slug, excerpt, content_markdown,
          category, status, featured, cover_image_url,
          published_at, created_at, updated_at
        FROM articles
        ORDER BY updated_at DESC
      `).all();

      return json({
        status: "ok",
        count: result.results.length,
        articles: result.results
      });
    }

    // POST: Create a new article
    if (request.method === "POST") {
      const body = await readBody(request);

      if (!body) {
        return json({ error: "Valid JSON required" }, 400);
      }

      const validationError = validateArticle(body);

      if (validationError) {
        return json({ error: validationError }, 400);
      }

      const title = body.title.trim();
      const slug = makeSlug(body.slug || title);

      if (!slug) {
        return json({
          error: "A valid article slug is required"
        }, 400);
      }

      const duplicate = await env.DB.prepare(
        "SELECT id FROM articles WHERE slug = ?"
      ).bind(slug).first();

      if (duplicate) {
        return json({
          error: "That article slug already exists"
        }, 409);
      }

      const now = new Date().toISOString();
      const status = body.status || "draft";
      const publishedAt =
        status === "published" ? now : null;

      const result = await env.DB.prepare(`
        INSERT INTO articles (
          title, slug, excerpt, content_markdown,
          category, status, featured, cover_image_url,
          published_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        title,
        slug,
        typeof body.excerpt === "string"
          ? body.excerpt.trim()
          : "",
        body.content_markdown,
        typeof body.category === "string"
          ? body.category.trim()
          : "General",
        status,
        body.featured ? 1 : 0,
        typeof body.cover_image_url === "string"
          ? body.cover_image_url.trim()
          : "",
        publishedAt,
        now,
        now
      ).run();

      const indexNow = status === "published"
        ? await notifyIndexNow(env, slug)
        : null;

      return json({
        status: "ok",
        message: status === "published"
          ? "Article published"
          : "Draft saved",
        id: result.meta.last_row_id,
        slug,
        indexNow
      }, 201);
    }

    // PUT: Edit an existing article
    if (request.method === "PUT") {
      const body = await readBody(request);

      if (!body) {
        return json({ error: "Valid JSON required" }, 400);
      }

      const id = Number(body.id);

      if (!Number.isInteger(id) || id < 1) {
        return json({
          error: "A valid article ID is required"
        }, 400);
      }

      const validationError = validateArticle(body);

      if (validationError) {
        return json({ error: validationError }, 400);
      }

      const existing = await env.DB.prepare(
        "SELECT id, published_at FROM articles WHERE id = ?"
      ).bind(id).first();

      if (!existing) {
        return json({ error: "Article not found" }, 404);
      }

      const title = body.title.trim();
      const slug = makeSlug(body.slug || title);

      if (!slug) {
        return json({
          error: "A valid article slug is required"
        }, 400);
      }

      const duplicate = await env.DB.prepare(
        "SELECT id FROM articles WHERE slug = ? AND id != ?"
      ).bind(slug, id).first();

      if (duplicate) {
        return json({
          error: "That article slug already exists"
        }, 409);
      }

      const status = body.status || "draft";
      const now = new Date().toISOString();

      const publishedAt = status === "published"
        ? (existing.published_at || now)
        : null;

      await env.DB.prepare(`
        UPDATE articles SET
          title = ?,
          slug = ?,
          excerpt = ?,
          content_markdown = ?,
          category = ?,
          status = ?,
          featured = ?,
          cover_image_url = ?,
          published_at = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        title,
        slug,
        typeof body.excerpt === "string"
          ? body.excerpt.trim()
          : "",
        body.content_markdown,
        typeof body.category === "string"
          ? body.category.trim()
          : "General",
        status,
        body.featured ? 1 : 0,
        typeof body.cover_image_url === "string"
          ? body.cover_image_url.trim()
          : "",
        publishedAt,
        now,
        id
      ).run();

      const indexNow = status === "published"
        ? await notifyIndexNow(env, slug)
        : null;

      return json({
        status: "ok",
        message: status === "published"
          ? "Article updated and published"
          : "Draft updated",
        id,
        slug,
        indexNow
      });
    }

    // DELETE: Delete an article
    if (request.method === "DELETE") {
      const body = await readBody(request);
      const id = Number(body?.id);

      if (!Number.isInteger(id) || id < 1) {
        return json({
          error: "A valid article ID is required"
        }, 400);
      }

      const result = await env.DB.prepare(
        "DELETE FROM articles WHERE id = ?"
      ).bind(id).run();

      if (!result.meta.changes) {
        return json({
          error: "Article not found"
        }, 404);
      }

      return json({
        status: "ok",
        message: "Article deleted",
        id
      });
    }

    return json({
      error: "Method not allowed"
    }, 405);

  } catch (error) {
    console.error("Articles API error:", error);

    return json({
      error: "Unable to process article request"
    }, 500);
  }
}

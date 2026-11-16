
const STATIC_PAGES = [
  ["", "1.0"],
  ["Locations.html", "0.8"],
  ["vice-city.html", "0.8"],
  ["leonida-keys.html", "0.8"],
  ["leonida-secrets.html", "0.8"],
  ["ambrosia.html", "0.7"],
  ["grassrivers.html", "0.7"],
  ["launch-watch.html", "0.7"],
  ["mount-kalaga.html", "0.7"],
  ["port-gellhorn.html", "0.7"],
  ["first-day-in-leonida.html", "0.7"]
];

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, char => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;"
  })[char]);
}

function validDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString();
}

export async function onRequest({ env }) {
  try {
    const result = await env.DB.prepare(`
      SELECT
        slug,
        published_at,
        created_at,
        updated_at
      FROM articles
      WHERE status = 'published'
      ORDER BY COALESCE(published_at, created_at) DESC
    `).all();

    const urls = STATIC_PAGES.map(([path, priority]) => `
  <url>
    <loc>https://leonidawhispers.com/${path}</loc>
    <priority>${priority}</priority>
  </url>`);

    for (const article of result.results || []) {
      if (!article.slug) continue;

      const slug = encodeURIComponent(article.slug);

      const lastmod = validDate(
        article.updated_at ||
        article.published_at ||
        article.created_at
      );

      urls.push(`
  <url>
    <loc>https://leonidawhispers.com/article.html?slug=${escapeXml(slug)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <priority>0.8</priority>
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300"
      }
    });

  } catch (error) {
    return new Response("Unable to generate sitemap", {
      status: 500,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }
}

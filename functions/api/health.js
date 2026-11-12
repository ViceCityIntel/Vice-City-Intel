
export async function onRequest({ env }) {
  try {
    await env.DB.prepare("SELECT 1").first();

    return Response.json({
      status: "ok",
      database: "connected",
      project: "Leonida Whispers"
    });

  } catch (error) {
    return Response.json({
      status: "error",
      database: "connection failed"
    }, { status: 500 });
  }
}

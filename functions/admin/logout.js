
export async function onRequest({ request }) {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405 }
    );
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      message: "Logged out"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": "LW_ADMIN_SESSION=; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
      }
    }
  );
}

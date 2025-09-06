export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  console.log("[health] ok");
  return new Response("ok", {
    status: 200,
    headers: { "x-pack-debug": "health-v1" },
  });
}

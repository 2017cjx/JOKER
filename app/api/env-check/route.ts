export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const keys = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
  ];
  const present: Record<string, boolean> = {};
  for (const k of keys) present[k] = !!process.env[k];
  return new Response(JSON.stringify({ present }, null, 2), {
    status: 200,
    headers: { "content-type": "application/json", "x-pack-debug": "env-v1" },
  });
}

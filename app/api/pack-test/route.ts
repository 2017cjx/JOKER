export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getR2 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

async function streamSize(body: Readable) {
  let n = 0;
  for await (const c of body)
    n += Buffer.isBuffer(c) ? c.length : Buffer.byteLength(c as any);
  return n;
}

export async function POST(req: Request) {
  try {
    const { key } = await req.json();
    if (!key)
      return NextResponse.json(
        { ok: false, error: "key required" },
        { status: 400 }
      );
    const BUCKET = process.env.R2_BUCKET!;
    const r2 = getR2();
    const out = await r2.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key })
    );
    if (!out.Body)
      return NextResponse.json(
        { ok: false, error: "no body" },
        { status: 502 }
      );
    const size = await streamSize(out.Body as Readable);
    return NextResponse.json({ ok: true, key, size }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

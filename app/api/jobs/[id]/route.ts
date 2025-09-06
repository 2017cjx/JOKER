import { NextResponse, type NextRequest } from "next/server";
import { getR2 } from "@/lib/r2";
import {
  HeadObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

const BUCKET = process.env.R2_BUCKET!;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ← ここを Promise に
) {
  const { id } = await ctx.params; // ← await が必要
  const jobId = id;

  try {
    // 1) 完了品チェック
    const resultKey = `results/${jobId}.zip`;
    const r2 = getR2();
    try {
      await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: resultKey }));
      const url = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: BUCKET, Key: resultKey }),
        { expiresIn: 60 * 10 }
      );
      return NextResponse.json({
        status: "done",
        downloadKey: resultKey,
        downloadUrl: url,
      });
    } catch {}

    // 2) アップロード済みチェック
    const list = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `uploads/${jobId}/`,
        MaxKeys: 1,
      })
    );
    if (list.Contents && list.Contents.length > 0) {
      return NextResponse.json({ status: "uploaded" });
    }

    // 3) 未発見
    return NextResponse.json({ status: "notfound" }, { status: 404 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { status: "error", detail: e?.message ?? "unknown" },
      { status: 500 }
    );
  }
}

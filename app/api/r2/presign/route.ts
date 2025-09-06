// app/api/r2/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

const BUCKET = process.env.R2_BUCKET!;
const MAX_SIZE_BYTES = 1024 * 1024 * 200; // 任意: 200MB 上限（必要に応じて調整）

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType, size } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename and contentType are required" },
        { status: 400 }
      );
    }
    // 任意：サイズの事前バリデーション（クライアントから size を渡している場合）
    if (typeof size === "number" && size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `file is too large (>${MAX_SIZE_BYTES} bytes)` },
        { status: 413 }
      );
    }

    // 1) ジョブID発行
    const jobId = crypto.randomUUID();

    // 2) オブジェクトキー（ジョブ単位でフォルダを切ると後処理が楽）
    //    例: uploads/<jobId>/project.zip
    //    拡張子はクライアントでzip固定なら filename を無視してもOK
    const safeName = filename.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
    const objectKey = `uploads/${jobId}/${encodeURIComponent(safeName)}`;

    // 3) 署名付きPUTのコマンド（メタデータに jobId を載せておく）
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
      ContentType: contentType,
    });

    // 4) 署名URL（有効期限）
    const expiresIn = 60 * 5; // 5分
    const url = await getSignedUrl(r2, cmd, { expiresIn });

    // 5) 返却（フロントは jobId を保持→ポーリング用に使う）
    return NextResponse.json({
      url, // PUT先（このURLにそのままPUT）
      objectKey, // R2内の保存先キー（後段APIやWorkerで使用）
      jobId, // ← フロントのポーリング・画面表示に使う
      bucket: BUCKET,
      expiresIn,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "failed to create presigned url", detail: e?.message },
      { status: 500 }
    );
  }
}

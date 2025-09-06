// app/api/pack/route.ts
import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { getR2 } from "@/lib/r2"; // ← 変更: 関数で遅延初期化
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { categorize } from "@/lib/categorize";
import {
  BINARY_EXTS,
  IGNORE_DIRS,
  IGNORE_FILES,
  MAX_FILE_BYTES,
} from "@/lib/filters";
import { maskSecrets, isEnvLike } from "@/lib/mask";
import { looksBinary, extOf, posix } from "@/lib/textish";
import { buildProjectMap } from "@/lib/treemap";

// 重要：R2 + AWS SDK v3 は Node ランタイム推奨
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ===== helper =====
function shouldSkipPath(rel: string) {
  const p = rel.replaceAll("\\", "/");
  for (const d of IGNORE_DIRS) {
    const dir = d.endsWith("/") ? d : d + "/";
    if (p.includes(`/${dir}`) || p.startsWith(dir)) return true;
  }
  const base = p.split("/").pop() || "";
  if (IGNORE_FILES.includes(base)) return true;
  return false;
}

// Node Readable → Buffer
async function nodeStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// ===== handler =====
export async function POST(req: NextRequest) {
  try {
    const { objectKey, originalName, jobId } = await req
      .json()
      .catch(() => ({} as any));
    console.log("[pack] start", { objectKey, originalName, jobId });

    if (!objectKey) {
      return NextResponse.json(
        { error: "objectKey is required" },
        { status: 400 }
      );
    }

    const BUCKET = process.env.R2_BUCKET;
    if (!BUCKET) {
      return NextResponse.json({ error: "R2_BUCKET missing" }, { status: 500 });
    }

    const r2 = getR2(); // ← 変更: ここで初めてクライアント生成

    // 1) 入力zipをR2から取得
    let zipBuf: Buffer;
    try {
      const out = await r2.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: objectKey })
      );
      if (!out.Body) {
        return NextResponse.json({ error: "No body from R2" }, { status: 502 });
      }
      zipBuf = await nodeStreamToBuffer(out.Body as Readable);
    } catch (e: any) {
      console.error("[pack] GetObject failed:", e?.message);
      return NextResponse.json(
        { error: "GetObject failed", detail: String(e?.message ?? e) },
        { status: 500 }
      );
    }

    // 2) zipを展開してダンプ生成（従来ロジック）
    const inputZip = await JSZip.loadAsync(new Uint8Array(zipBuf));
    const allPaths = Object.keys(inputZip.files).map(posix).sort();

    // safeName 推定
    const firstSegs = allPaths
      .filter((p) => p && !p.startsWith("__MACOSX"))
      .map((p) => p.split("/")[0]!)
      .filter(Boolean);

    let root = "";
    if (firstSegs.length) {
      const counts = new Map<string, number>();
      for (const s of firstSegs) counts.set(s, (counts.get(s) || 0) + 1);
      root = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    }

    const fallbackFromKey =
      (originalName as string | undefined)?.replace(/\.zip$/i, "") ||
      objectKey
        .split("/")
        .pop()
        ?.replace(/\.zip$/i, "") ||
      "project";

    const baseName = root || fallbackFromKey;
    const safeName = baseName.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);

    let mapMd = buildProjectMap(allPaths, `${safeName}.zip`);

    const buckets: Record<"src" | "tests" | "config" | "scripts", string[]> = {
      src: [],
      tests: [],
      config: [],
      scripts: [],
    };

    for (const rel of allPaths) {
      const entry = inputZip.file(rel);
      if (!entry || rel.endsWith("/")) continue;
      if (shouldSkipPath(rel)) continue;

      const ex = extOf(rel);
      if (BINARY_EXTS.has(ex)) continue;

      const buf = new Uint8Array(await entry.async("uint8array"));
      if (!ex && looksBinary(buf)) continue;
      if (looksBinary(buf)) continue;

      const cat = categorize(rel);
      const size = buf.byteLength;
      const header = (extra = "") =>
        `===== FILE: ${rel} (UTF-8, ${size} bytes) ${extra} =====`;

      if (size > MAX_FILE_BYTES) {
        const text = new TextDecoder().decode(buf);
        const lines = text.split(/\r?\n/);
        const head = lines.slice(0, 80).join("\n");
        const tail = lines.slice(-40).join("\n");
        buckets[cat].push(
          [
            header("(SKIPPED: >1MB)"),
            "# preview (first 80 lines)",
            "```text",
            head,
            "```",
            "# tail (last 40 lines)",
            "```text",
            tail,
            "```",
            "",
          ].join("\n")
        );
        continue;
      }

      if (isEnvLike(rel)) {
        const raw = new TextDecoder().decode(buf);
        const keys = raw
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("#") && l.includes("="))
          .map((l) => l.split("=")[0]!.trim());
        buckets[cat].push(
          [
            header("(REDACTED)"),
            "```text",
            "# .env keys",
            ...keys.map((k) => `- ${k}`),
            "```",
            "",
          ].join("\n")
        );
        continue;
      }

      const content = maskSecrets(new TextDecoder().decode(buf));
      buckets[cat].push([header(), "```text", content, "```", ""].join("\n"));
    }

    // 3) 出力zipを作る
    const outZip = new JSZip();
    outZip.file("project_map.md", mapMd);
    outZip.file("src_dump.txt", buckets.src.join("\n"));
    outZip.file("tests_dump.txt", buckets.tests.join("\n"));
    outZip.file("config_dump.txt", buckets.config.join("\n"));
    outZip.file("scripts_dump.txt", buckets.scripts.join("\n"));

    // jobId の有無で分岐：
    // - jobId あり → 非同期パイプライン: R2 results/ に保存して 200（ボディ無し）
    // - jobId なし → 同期ダウンロード: zip をレスポンスで返す
    if (jobId) {
      const nodeBuf = await outZip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const resultKey = `results/${jobId}.zip`;
      try {
        await r2.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: resultKey,
            Body: nodeBuf,
            ContentType: "application/zip",
          })
        );
      } catch (e: any) {
        console.error("[pack] PutObject failed:", e?.message);
        return NextResponse.json(
          { error: "PutObject failed", detail: String(e?.message ?? e) },
          { status: 500 }
        );
      }

      console.log("[pack] success (async)", { jobId, resultKey });
      return new NextResponse(null, { status: 200 });
    } else {
      const ab = await outZip.generateAsync({ type: "arraybuffer" });
      console.log("[pack] success (sync)", { name: `${safeName}-dump.zip` });
      return new NextResponse(ab, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${safeName}-dump.zip"`,
          "Cache-Control": "no-store",
        },
      });
    }
  } catch (e: any) {
    console.error("[pack] fatal:", e?.message, e?.stack);
    return NextResponse.json(
      { error: "fatal", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

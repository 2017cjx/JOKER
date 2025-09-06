// app/api/pack/route.ts
import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { r2 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

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

const BUCKET = process.env.R2_BUCKET!;

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

// NodeのReadable → Buffer
async function nodeStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  // 1) JSON で objectKey を受け取る
  const { objectKey, originalName, jobId } = await req
    .json()
    .catch(() => ({} as any));
  if (!objectKey) {
    return NextResponse.json(
      { error: "objectKey is required" },
      { status: 400 }
    );
  }

  // 2) R2 から zip を取得
  const get = new GetObjectCommand({ Bucket: BUCKET, Key: objectKey });
  const out = await r2.send(get);
  if (!out.Body) {
    return NextResponse.json({ error: "No body from R2" }, { status: 500 });
  }

  // Node ランタイム前提：Body は Readable
  const zipBuf = await nodeStreamToBuffer(out.Body as Readable);

  // 3) ここからは “これまでの処理” をほぼ踏襲（file→zipの違いだけ吸収）
  const inputZip = await JSZip.loadAsync(new Uint8Array(zipBuf));
  const allPaths = Object.keys(inputZip.files).map(posix).sort();

  // ベース名（safeName）の組み立て：最上位ディレクトリか、originalName/objectKey から推測
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

  // 例: originalName: "project.zip" / objectKey: "uploads/2025-09-05/xxx-project.zip"
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

  // 旧実装の “skippedJson” は、R2直PUTでは渡していない想定なので省略
  // 必要なら presign 時にメタ情報を objectKey とは別に保存してここで読む

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

  const outZip = new JSZip();
  outZip.file("project_map.md", mapMd);
  outZip.file("src_dump.txt", buckets.src.join("\n"));
  outZip.file("tests_dump.txt", buckets.tests.join("\n"));
  outZip.file("config_dump.txt", buckets.config.join("\n"));
  outZip.file("scripts_dump.txt", buckets.scripts.join("\n"));

  // 4) ArrayBuffer でレスポンス（Bufferではなく BodyInit 互換で返す）
  const outBuf = await outZip.generateAsync({ type: "arraybuffer" });
  if (jobId) {
    const resultKey = `results/${jobId}.zip`;
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: resultKey,
        Body: Buffer.from(outBuf), // ArrayBuffer→Buffer化
        ContentType: "application/zip",
      })
    );
  }
  return new NextResponse(outBuf, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}-dump.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

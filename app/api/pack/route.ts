import JSZip from "jszip";
import { NextRequest } from "next/server";
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

export const dynamic = "force-dynamic";

function shouldSkipPath(rel: string) {
  const p = rel.replaceAll("\\", "/"); // 念のため
  // 任意の階層に含まれるディレクトリを判定
  for (const d of IGNORE_DIRS) {
    const dir = d.endsWith("/") ? d : d + "/";
    if (p.includes(`/${dir}`) || p.startsWith(dir)) return true;
  }
  const base = p.split("/").pop() || "";
  if (IGNORE_FILES.includes(base)) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("archive") as File | null;
  if (!file)
    return new Response(JSON.stringify({ error: "No 'archive' file" }), {
      status: 400,
    });

  const inputZip = await JSZip.loadAsync(
    new Uint8Array(await file.arrayBuffer())
  );
  const allPaths = Object.keys(inputZip.files).map(posix).sort();

  const mapMd = buildProjectMap(allPaths, file.name);

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
    if (!ex && looksBinary(buf)) continue; // 無拡張子のバイナリ回避
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

  const out = new JSZip();
  out.file("project_map.md", mapMd);
  out.file("src_dump.txt", buckets.src.join("\n"));
  out.file("tests_dump.txt", buckets.tests.join("\n"));
  out.file("config_dump.txt", buckets.config.join("\n"));
  out.file("scripts_dump.txt", buckets.scripts.join("\n"));

  const outBlob = await out.generateAsync({ type: "uint8array" });
  return new Response(outBlob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="dumps.zip"`,
    },
  });
}

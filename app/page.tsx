"use client";
import { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import ToggleCard from "@/app/components/ToggleCard";
import ContactForm from "./contact/ContactForm";

export default function Page() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(0);
  const [log, setLog] = useState("Ready.");
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const year = new Date().getFullYear();

  async function onPickFolder(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    await processFiles(files);
  }

  async function processFiles(files: FileList) {
    setBusy(true);
    setProgress(0); // ← 追加
    setLog("Zipping folder...");
    try {
      const zip = new JSZip();
      const list = Array.from(files);
      const total = list.length;

      // 0〜60%: ファイル取り込み
      let done = 0;
      for (const f of list) {
        const rel = (f as any).webkitRelativePath || f.name;
        zip.file(rel, await f.arrayBuffer());
        done++;
        setProgress(Math.min(60, Math.round((done / total) * 60))); // ← 追加
      }

      // 60〜90%: 圧縮（JSZipの進捗コールバック）
      const zipped = await zip.generateAsync(
        {
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
        },
        (meta) => {
          const p = 60 + Math.round((meta.percent || 0) * 0.3); // 60→90
          setProgress(Math.min(90, p)); // ← 追加
        }
      );

      setLog("Uploading to JOKER...");
      setProgress(92); // ← 追加

      const form = new FormData();
      form.append(
        "archive",
        new File([zipped], "project.zip", { type: "application/zip" })
      );
      const res = await fetch("/api/pack", { method: "POST", body: form });
      if (!res.ok) {
        setBusy(false);
        setProgress(null); // ← 追加
        setLog("Server error.");
        return;
      }

      // 90〜100%: ダウンロード
      setProgress(98);
      const blob = await res.blob();

      // レスポンスヘッダからファイル名抽出
      let filename = "dumps.zip";
      const cd = res.headers.get("Content-Disposition");
      const m = cd && cd.match(/filename="([^"]+)"/);
      if (m && m[1]) filename = m[1];

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setProgress(100);
      setLog(`Done! Downloaded ${filename}`);
    } catch (e: any) {
      console.error(e);
      setLog(`Something went wrong. ${e?.message || ""}`.trim());
    } finally {
      setBusy(false);
      // 余韻でプログレスを隠したい場合は次を有効化
      // setTimeout(() => setProgress(null), 800);
    }
  }

  // Drag & Drop
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDrag = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      const dt = e.dataTransfer;
      if (!dt) return;
      const files = dt.files;
      if (files?.length) processFiles(files);
    };
    el.addEventListener("dragenter", onDrag);
    el.addEventListener("dragover", onDrag);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragenter", onDrag);
      el.removeEventListener("dragover", onDrag);
      el.removeEventListener("dragleave", onLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  return (
    <>
      <div
        style={{
          placeItems: "center",
          marginTop: "50px",
        }}
      >
        <h1 style={{ marginBottom: 20 }}>JOKER</h1>
        <p className="subtle">📁 → 📃 → 🤖</p>
        <p className="subtle">Upload. Convert. Let AI Understand Your App.</p>
      </div>
      <main
        style={{
          //   minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 860, display: "grid", gap: 20 }}>
          {/* Hero: 説明 */}

          {/* メイン操作カード（旧デザイン） */}
          <section
            ref={dropRef}
            className={`card dropzone ${dragging ? "dragging" : ""}`}
            style={{ padding: 20 }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Create dumps</h2>
            <p className="subtle" style={{ marginTop: 0 }}>
              Upload your project folder. We zip locally, then send once.
            </p>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <label className="button" aria-disabled={busy}>
                {busy ? "Processing..." : "Choose a folder"}
                <input
                  type="file"
                  className="mono"
                  style={{ display: "none" }}
                  multiple
                  // フォルダ選択
                  // @ts-ignore
                  webkitdirectory="true"
                  directory=""
                  onChange={onPickFolder}
                  disabled={busy}
                />
              </label>
              <div className="hint subtle" aria-hidden>
                or drag & drop the folder onto this card
              </div>
            </div>
            {progress !== null && (
              <div
                className="progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
                <div className="progress-label subtle">
                  {busy
                    ? `Zipping & Uploading… ${progress}%`
                    : progress === 100
                    ? "Complete — 100%"
                    : `Idle — ${progress}%`}
                </div>
              </div>
            )}
            <p
              className="mono subtle"
              style={{
                marginTop: 16,
                whiteSpace: "pre-wrap",
              }}
            >
              {log}
            </p>
          </section>

          <ToggleCard title="What is JOKER">
            <h4 className="subtle" style={{ margin: "12px 0 6px" }}>
              What to upload
            </h4>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Your project folder (root)</li>
              <li>Large folders are OK; processing may be slower</li>
              <li>Images/other binaries are fine — they’re skipped</li>
              <li>Env/key files are summarized; secrets are masked</li>
            </ul>

            <h4 className="subtle" style={{ margin: "14px 0 6px" }}>
              What you will get
            </h4>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>
                <code>project_map.md</code> — directory & file map
              </li>
              <li>
                <code>src_dump.txt</code> — source files (masked)
              </li>
              <li>
                <code>tests_dump.txt</code> — test files
              </li>
              <li>
                <code>config_dump.txt</code> — config files
              </li>
              <li>
                <code>scripts_dump.txt</code> — scripts / migrations
              </li>
              <li>Files &gt; ~1&nbsp;MB include head/tail preview</li>
            </ul>
            <p style={{ margin: 0, lineHeight: 1.7 }}>
              To work effectively with AI in app development, you need to keep
              everything aligned. This tool helps by consolidating your program
              files into a few document files. Just upload your project folder
              to generate text files, which can then be imported into AI tools
              to give them a full understanding of your app.
            </p>
          </ToggleCard>

          {/* How to use */}
          <ToggleCard title="How to use">
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
              <li>
                <strong>Prepare</strong>: Open your project. Exclude heavy
                folders if possible.
              </li>
              <li>
                <strong>Select</strong>: Choose a folder or drag & drop (coming
                soon).
              </li>
              <li>
                <strong>Zip</strong>: Files are zipped locally first.
              </li>
              <li>
                <strong>Upload</strong>: The zip is sent to{" "}
                <code>/api/pack</code>.
              </li>
              <li>
                <strong>Download</strong>: Get <code>dumps.zip</code> and import
                into your AI tool.
              </li>
            </ol>
          </ToggleCard>
          <ToggleCard title="Safety">
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
              <li>
                <strong>Local first</strong>: Zipping happens on your device.
                Nothing leaves until upload.
              </li>
              <li>
                <strong>Skip noise</strong>: Common build/cache dirs & noise
                files are excluded (e.g. <code>.git/</code>, <code>dist/</code>,{" "}
                <code>build/</code>, <code>.next/</code>, <code>.vercel/</code>,{" "}
                <code>venv/</code>, <code>__pycache__/</code>,{" "}
                <code>coverage/</code>, <code>out/</code>, <code>.turbo/</code>,{" "}
                <code>.DS_Store</code>, <code>Thumbs.db</code>,{" "}
                <code>*.log</code>).
              </li>
              <li>
                <strong>No images/binaries</strong>: Binaries (images, media,
                fonts, archives, etc.) are not converted to text.
              </li>
              <li>
                <strong>Mask secrets</strong>: Env-like lines and known key
                formats are masked as <code>***REDACTED***</code>.
              </li>
              <li>
                <strong>No server retention (app-side)</strong>: The API streams
                back the result; it does not persist uploads.
              </li>
            </ul>
          </ToggleCard>

          <ToggleCard title="Contact">
            <ContactForm />
          </ToggleCard>
        </div>
      </main>
      <footer className="footer">
        © {year} JOKER — Safe project dumps for AI
      </footer>
    </>
  );
}

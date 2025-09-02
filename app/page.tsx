"use client";
import { useState } from "react";
import JSZip from "jszip";

export default function Page() {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("Ready.");

  async function onPickFolder(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setBusy(true);
    setLog("Zipping folder...");
    const zip = new JSZip();
    for (const f of Array.from(files)) {
      const rel = (f as any).webkitRelativePath || f.name;
      zip.file(rel, await f.arrayBuffer());
    }
    const zipped = await zip.generateAsync({ type: "blob" });

    setLog("Uploading to JOKER...");
    const form = new FormData();
    form.append(
      "archive",
      new File([zipped], "project.zip", { type: "application/zip" })
    );
    const res = await fetch("/api/pack", { method: "POST", body: form });
    if (!res.ok) {
      setBusy(false);
      setLog("Server error.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dumps.zip";
    a.click();
    URL.revokeObjectURL(url);

    setBusy(false);
    setLog("Done! Downloaded dumps.zip");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <div className="card" style={{ maxWidth: 720, width: "100%" }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>JOKER</h1>
        <p className="subtle" style={{ marginTop: 0 }}>
          Safe project dumps for ChatGPT
        </p>

        <div style={{ marginTop: 16 }}>
          <label className="button">
            {busy ? "Processing..." : "Choose a folder"}
            <input
              type="file"
              className="mono"
              style={{ display: "none" }}
              multiple
              // フォルダ選択
              //@ts-ignore
              webkitdirectory="true"
              directory=""
              onChange={onPickFolder}
              disabled={busy}
            />
          </label>
        </div>
        <p
          className="mono subtle"
          style={{ marginTop: 16, whiteSpace: "pre-wrao" }}
        >
          {log}
        </p>
      </div>
    </main>
  );
}

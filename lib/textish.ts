export function posix(p: string) {
  return p.replaceAll("\\", "/");
}
export function extOf(p: string) {
  const base = p.split("/").pop() || "";
  if (/^(Makefile|Dockerfile)$/i.test(base)) return base.toLowerCase();
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i + 1).toLowerCase() : "";
}

export function looksBinary(buf: Uint8Array) {
  const len = buf.length;
  if (len === 0) return false;
  let nonPrintable = 0;
  for (let i = 0; i < len; i++) {
    const c = buf[i]!;
    if (c === 0) return true;
    if (!(c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 126)))
      nonPrintable++;
  }
  return nonPrintable / len > 0.1;
}

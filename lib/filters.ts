export const IGNORE_DIRS = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  ".vercel/",
  "target/",
  "venv/",
  "__pycache__/",
  "coverage/",
  "out/",
  ".turbo",
];

export const IGNORE_FILES = [
  ".DS_Store",
  "Thumbs.db",
  "*.log",
  "*.lock",
  "*.map",
];

export const BINARY_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "pdf",
  "zip",
  "jar",
  "exe",
  "dylib",
  "so",
  "class",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "mp3",
  "mp4",
  "mov",
  "avi",
]);

export const MAX_FILE_BYTES = 1_000_000;

export const IGNORE_DIRS = [
  "node_modues/",
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
  ".turbo.",
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
  "git",
  "webp",
  "ico",
  "pfd",
  "zip",
  "jar",
  "exe",
  "bylib",
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

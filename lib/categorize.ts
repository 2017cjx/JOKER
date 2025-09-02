export function categorize(
  path: string
): "src" | "tests" | "config" | "scripts" {
  const p = path.toLowerCase();
  const base = p.split("/").pop() || "";
  if (
    p.includes("/test/") ||
    p.includes("/tests/") ||
    p.includes("/__tests__/") ||
    /\.test\.[^.]+$/.test(p) ||
    /\.spec\.[^.]+$/.test(p)
  )
    return "tests";

  if (
    /^(package\.json|tsconfig\.json|dockerfile|docker-compose\.ya?ml|vite\.config\.[jt]s|next\.config\.[jt]s|pnpm-lock\.yaml|yarn\.lock)$/.test(
      base
    ) ||
    p.includes("/config/") ||
    p.includes("/configs/") ||
    p.includes("/prisma/")
  )
    return "config";

  if (
    p.includes("/scripts/") ||
    p.includes("/bin/") ||
    p.includes("/migrations/")
  )
    return "scripts";

  return "src";
}

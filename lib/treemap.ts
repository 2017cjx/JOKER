export function buildProjectMap(paths: string[], sourceName: string) {
  const lines = [
    "# Project Map",
    `# SOURCE: ${sourceName}`,
    `# GENERATED_AT: ${new Date().toISOString()}`,
    "",
    "```",
    ...paths.slice(0, 500),
    paths.length > 500 ? `... (+${paths.length - 500} more)` : "",
    "```",
    "",
    "## Buckets",
    "- src: app/src/components/lib etc.",
    "- tests: __tests__/*.test.* etc",
    "- config: package.json/tsconfig/prisma etc",
    "- scripts: scripts/bin/migrations etc",
    "",
  ];
  return lines.join("\n");
}

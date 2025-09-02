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
    "- src: app/src/components/lib など",
    "- tests: __tests__/*.test.* など",
    "- config: package.json/tsconfig/prisma など",
    "- scripts: scripts/bin/migrations など",
    "",
  ];
  return lines.join("\n");
}

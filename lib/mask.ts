export function maskSecrets(text: string) {
  const rules = [
    { re: /^(\s*[A-Z0-9_.-]{3,64}\s*=\s*).+$/gim, rep: "$1***REDACTED***" },
    {
      re: /("(?:(?:api|secret|token|password)[^"]*)"\s*:\s*)".*?"/gim,
      rep: '$1"***REDACTED***"',
    },
    { re: /AKIA[0-9A-Z]{16}/g, rep: "***AWS_ACCESS_KEY***" },
    { re: /AIza[0-9A-Za-z\-_]{35}/g, rep: "***GOOGLE_API_KEY***" },
    { re: /sk_live_[0-9a-zA-Z]{24,}/g, rep: "***STRIPE_SECRET***" },
    { re: /xox[baprs]-[0-9A-Za-z-]{10,}/g, rep: "***SLACK_TOKEN***" },
  ];
  return rules.reduce((s, r) => s.replace(r.re, r.rep), text);
}

export function isEnvLike(rel: string) {
  return (
    /\.env(\..+)?$/i.test(rel) ||
    /(\.pem|\.key|id_rsa|\.p12)$/i.test(rel) ||
    /service-account.*\.json$/i.test(rel)
  );
}

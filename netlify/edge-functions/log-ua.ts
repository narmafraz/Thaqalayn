// Edge function for the June 2026 bandwidth incident.
//
// Two jobs:
//   1. Block hostile crawlers at the edge with a 403, before they reach
//      origin (so they consume ~zero bandwidth — just the 403 response).
//   2. Log User-Agent + IP + path of remaining traffic to console.log
//      for ongoing diagnostics.
//
// Path config lives in netlify.toml [[edge_functions]] blocks
// (/books/* and /people/*). Block list is here. To extend the block,
// add another regex to BLOCK_PATTERNS and redeploy.
//
// To stop diagnostics entirely once the incident is resolved: remove
// this file + the [[edge_functions]] blocks in netlify.toml. The
// block list can also be moved to netlify.toml as proper redirect
// rules with header conditions if a long-term ban is needed.

// Anonymous scrapers that ignore robots.txt. Confirmed via UA log
// analysis on 2026-06-03: meta-webindexer accounted for 99.4% of
// traffic to /books/* and /people/*.
const BLOCK_PATTERNS: RegExp[] = [
  /meta-webindexer/i,        // Meta/Facebook web indexer (the June 2026 attacker)
  /meta-externalagent/i,     // Meta AI training crawler (blocked in robots.txt too)
  /meta-externalfetcher/i,   // Meta AI link-preview fetcher
];

export default async (request: Request, context: { ip?: string }) => {
  const ua = request.headers.get("user-agent") || "(no-ua)";
  const url = new URL(request.url);
  const ip = context.ip || "(unknown)";
  const ref = request.headers.get("referer") || "-";

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(ua)) {
      console.log(`UABLOCK | ${url.pathname} | ${ip} | ${ua}`);
      return new Response("Forbidden", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  console.log(`UALOG | ${url.pathname} | ${ip} | ${ref} | ${ua}`);

  // Pass through to origin (no return value = no response override)
};

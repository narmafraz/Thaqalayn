// Diagnostic edge function — logs User-Agent + path + IP for every request
// to high-value content paths (/books/*, /people/*). Used to identify the
// scrapers responsible for the June 2026 bandwidth incident.
//
// Output goes to Netlify Functions logs (Dashboard -> Functions -> Edge
// Functions -> log-ua). Format is pipe-delimited for easy grep/aggregation.
//
// REMOVE THIS FILE + the netlify.toml [[edge_functions]] block once the
// top consumers are identified — edge functions cost invocations against
// the free-tier quota (1M/month).
//
// Pass-through: this function returns nothing, so Netlify forwards the
// request to origin unchanged.

export default async (request: Request, context: { ip?: string }) => {
  const ua = request.headers.get("user-agent") || "(no-ua)";
  const url = new URL(request.url);
  const ip = context.ip || "(unknown)";
  const ref = request.headers.get("referer") || "-";

  console.log(`UALOG | ${url.pathname} | ${ip} | ${ref} | ${ua}`);

  // Pass through to origin (no return value = no response override)
};

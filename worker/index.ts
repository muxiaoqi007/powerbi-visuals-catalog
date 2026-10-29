type AssetFetcher = {
  fetch(request: Request | string | URL): Promise<Response>;
};

type Env = {
  ASSETS: AssetFetcher;
  CATALOG_URL: string;
};

const CACHE_SECONDS = 1800;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/catalog") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
      }
      return loadCatalog(url, env, request.method === "HEAD");
    }

    return env.ASSETS.fetch(request);
  },
};

async function loadCatalog(url: URL, env: Env, headOnly: boolean): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/catalog`, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return headOnly ? new Response(null, { headers: cached.headers }) : cached;

  let upstream: Response | null = null;
  try {
    upstream = await fetch(env.CATALOG_URL, {
      headers: { Accept: "application/json" },
      cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
    });
  } catch {
    upstream = null;
  }

  if (!upstream || !upstream.ok) {
    const fallback = await env.ASSETS.fetch(new URL("/data/catalog.json", url).toString());
    if (!fallback.ok) {
      return Response.json(
        { error: "catalog_unavailable", message: "目录数据暂时不可用，请稍后重试。" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return withHeaders(fallback, "fallback");
  }

  const response = new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=300, s-maxage=${CACHE_SECONDS}`,
      "X-Catalog-Source": "remote",
    },
  });

  if (!headOnly) {
    const copy = response.clone();
    await cache.put(cacheKey, copy);
  }
  return headOnly ? new Response(null, { headers: response.headers }) : response;
}

async function withHeaders(response: Response, source: string): Promise<Response> {
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Catalog-Source": source,
    },
  });
}

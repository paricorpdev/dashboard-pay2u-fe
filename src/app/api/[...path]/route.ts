import { NextRequest, NextResponse } from "next/server";

// Runtime API proxy.
//
// All browser requests to /api/* are forwarded here and relayed to the Go
// (Fiber) backend. Unlike a next.config.ts `rewrites()` entry, this reads
// BACKEND_URL at REQUEST time, so on Komodo you can point the dashboard at a
// different backend simply by changing the environment variable and
// restarting the container — no image rebuild required.
//
// Using a same-origin proxy also sidesteps CORS (the Go backend only
// whitelists port-less localhost origins).

const FORWARD_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "accept-language",
] as const;

async function proxy(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  // Rebuild the target URL preserving the query string.
  const target = new URL(`${backendUrl.replace(/\/$/, "")}/api/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit & { duplex?: string } = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  // Relay the body for non-GET/HEAD requests.
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = Buffer.from(await request.arrayBuffer());
  }

  try {
    const upstream = await fetch(target.toString(), init);
    const responseHeaders = new Headers(upstream.headers);
    // Don't forward hop-by-hop / encoding headers that break streaming.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upstream request failed";
    return NextResponse.json(
      {
        status: "error",
        status_code: 502,
        error: `Backend tidak dapat dijangkau (${backendUrl}): ${message}`,
      },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;

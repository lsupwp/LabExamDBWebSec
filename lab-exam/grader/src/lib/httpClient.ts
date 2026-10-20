import http from "http";
import type { IncomingHttpHeaders } from "http";

export type HttpResult = {
  status: number;
  headers: IncomingHttpHeaders;
  setCookie: string[];
  body: string;
};

/** Low-level HTTP so we can set Host: {user}.grade.local for Apache vhost_alias */
export function httpRequest(opts: {
  hostname: string;
  port?: number;
  hostHeader: string;
  path: string;
  method?: string;
  body?: string | Buffer;
  headers?: Record<string, string>;
  timeoutMs?: number;
}): Promise<HttpResult> {
  const { hostname, port = 80, hostHeader, path, method = "GET", body, headers = {}, timeoutMs = 12000 } =
    opts;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname,
        port,
        path,
        method,
        headers: {
          Host: hostHeader,
          Connection: "close",
          ...headers,
          ...(body
            ? { "Content-Length": Buffer.byteLength(body) }
            : {}),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = res.headers["set-cookie"];
          const setCookie = Array.isArray(raw) ? raw : raw ? [raw] : [];
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            setCookie,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("request timeout"));
    });
    if (body) req.write(body);
    req.end();
  });
}

import { httpRequest } from "@/lib/httpClient";

export type RuntimeCtx = {
  username: string;
  runnerHost: string;
  runnerPort?: number;
};

export class CookieJar {
  private map = new Map<string, string>();

  store(setCookie: string[]) {
    for (const line of setCookie) {
      const nv = line.split(";")[0];
      const eq = nv.indexOf("=");
      if (eq > 0) this.map.set(nv.slice(0, eq).trim(), nv.slice(eq + 1).trim());
    }
  }

  header(): string {
    return [...this.map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  get(name: string): string | undefined {
    return this.map.get(name);
  }

  clear() {
    this.map.clear();
  }
}

export function vhost(ctx: RuntimeCtx) {
  return `${ctx.username.trim().toLowerCase()}.grade.local`;
}

export async function req(
  ctx: RuntimeCtx,
  jar: CookieJar,
  pathName: string,
  init: { method?: string; body?: string | Buffer; contentType?: string } = {}
) {
  const headers: Record<string, string> = {};
  const cookie = jar.header();
  if (cookie) headers.Cookie = cookie;
  if (init.body) {
    headers["Content-Type"] = init.contentType || "application/x-www-form-urlencoded";
  }
  const res = await httpRequest({
    hostname: ctx.runnerHost,
    port: ctx.runnerPort || 80,
    hostHeader: vhost(ctx),
    path: pathName,
    method: init.method || "GET",
    body: init.body,
    headers,
  });
  jar.store(res.setCookie);
  return res;
}

export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

export function multipartUpload(
  fields: Record<string, string>,
  file: { field: string; filename: string; contentType: string; data: Buffer }
): { body: Buffer; contentType: string } {
  const boundary = `----ExamBound${Date.now()}`;
  const chunks: Buffer[] = [];
  for (const [k, v] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`)
    );
  }
  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`
    )
  );
  chunks.push(file.data);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

export async function followOnce(
  ctx: RuntimeCtx,
  jar: CookieJar,
  res: Awaited<ReturnType<typeof req>>
) {
  const loc = String(res.headers.location || "");
  if (!(res.status >= 300 && res.status < 400) || !loc) return res;
  let pathName = loc;
  try {
    if (/^https?:\/\//i.test(loc)) {
      pathName = new URL(loc).pathname + new URL(loc).search;
    }
  } catch {
    /* keep */
  }
  if (!pathName.startsWith("/")) pathName = "/" + pathName;
  return req(ctx, jar, pathName);
}

export function formBody(data: Record<string, string>): string {
  return new URLSearchParams(data).toString();
}

export function isAppOk(body: string): boolean {
  return !/Fatal error|mysqli_sql_exception|Access denied for user|Uncaught (Error|Exception)/i.test(
    body
  );
}

export function looksLikeLoginPage(status: number, body: string): boolean {
  return (
    status === 200 &&
    isAppOk(body) &&
    (/name=["']username["']/i.test(body) || /เข้าสู่ระบบ|password/i.test(body))
  );
}

export function loginSucceeded(
  res: { status: number; body: string; headers: { location?: string | string[] } },
  jar: CookieJar
): boolean {
  if (!isAppOk(res.body)) return false;
  const loc = String(res.headers.location || "");
  const sid = jar.get("PHPSESSID");
  if (!sid) return false;
  if (res.status >= 300 && res.status < 400) {
    return /repairs\.php/i.test(loc);
  }
  if (res.status === 200) {
    const onLoginForm = /name=["']username["']/i.test(res.body) && /password/i.test(res.body);
    const onRepairs = /ใบแจ้งซ่อม|repair/i.test(res.body);
    return onRepairs && !onLoginForm;
  }
  return false;
}

export function hasMarker(body: string, marker: string): boolean {
  return body.includes(marker);
}

export async function loginAs(ctx: RuntimeCtx, jar: CookieJar, user: string, pass: string) {
  return req(ctx, jar, "/login_process.php", {
    method: "POST",
    body: formBody({ username: user, password: pass }),
  });
}

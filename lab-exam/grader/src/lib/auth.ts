import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";
import { dbNameFor, ensureUserDatabase, generateDbPassword } from "./userDb";

export type UserRecord = {
  username: string;
  passwordHash: string;
  dbName: string;
  /** Generated MySQL password (not Grader login password) */
  dbPass: string;
  createdAt: string;
};

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const USERS_LOCK = path.join(DATA_DIR, "users.lock");
const SECRET = process.env.SESSION_SECRET || "labexam-dev-secret-change-me";
const COOKIE = "labexam_session";

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf8");
}

/** Exclusive lock so concurrent register/ensureDbPass cannot clobber users.json */
function withUsersLock<T>(fn: () => T): T {
  ensureStore();
  const start = Date.now();
  while (true) {
    try {
      const fd = fs.openSync(USERS_LOCK, "wx");
      try {
        return fn();
      } finally {
        fs.closeSync(fd);
        try {
          fs.unlinkSync(USERS_LOCK);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "EEXIST") {
        if (Date.now() - start > 15_000) throw err;
        const waitUntil = Date.now() + 15;
        while (Date.now() < waitUntil) {
          /* spin */
        }
        continue;
      }
      throw err;
    }
  }
}

function readUsers(): UserRecord[] {
  ensureStore();
  try {
    const raw = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as Partial<UserRecord>[];
    return raw.map((u) => ({
      username: String(u.username),
      passwordHash: String(u.passwordHash),
      dbName: u.dbName || dbNameFor(String(u.username)),
      dbPass: u.dbPass || "",
      createdAt: String(u.createdAt || ""),
    }));
  } catch {
    return [];
  }
}

function writeUsers(users: UserRecord[]) {
  ensureStore();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

/** Normalize for Apache VirtualDocumentRoot (Host is lowercased → path must match). */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  // lowercase only — runner Host `{user}.grade.local` is lowercased by Apache
  if (!/^[a-z][a-z0-9_]{2,31}$/.test(username)) {
    return "username: ขึ้นต้นด้วย a-z, 3–32 ตัว, a-z 0-9 _ เท่านั้น (ตัวเล็ก)";
  }
  const reserved = new Set(["root", "mysql", "admin", "webapp_user", "pma", "mariadb"]);
  if (reserved.has(username)) return "username นี้ใช้ไม่ได้";
  return null;
}

export function getUser(username: string): UserRecord | null {
  return readUsers().find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
}

/** Ensure user has dbPass; persist if generated for legacy rows */
export function ensureDbPass(username: string): string {
  return withUsersLock(() => {
    const users = readUsers();
    const idx = users.findIndex((u) => u.username.toLowerCase() === username.toLowerCase());
    if (idx < 0) return generateDbPassword();
    if (users[idx].dbPass) return users[idx].dbPass;
    users[idx].dbPass = generateDbPassword();
    writeUsers(users);
    return users[idx].dbPass;
  });
}

export function clearAllUsers(): void {
  withUsersLock(() => {
    writeUsers([]);
  });
}

export async function registerUser(
  username: string,
  password: string
): Promise<{ ok: true; dbName: string; username: string } | { ok: false; error: string }> {
  const normalized = normalizeUsername(username);
  const uErr = validateUsername(normalized);
  if (uErr) return { ok: false, error: uErr };
  if (password.length < 8) return { ok: false, error: "password อย่างน้อย 8 ตัว" };

  const dbName = dbNameFor(normalized);
  const dbPass = generateDbPassword();
  const db = await ensureUserDatabase(normalized);
  if (!db.ok) return { ok: false, error: db.detail };

  const passwordHash = await bcrypt.hash(password, 10);
  return withUsersLock(() => {
    const users = readUsers();
    if (users.some((u) => u.username.toLowerCase() === normalized)) {
      return { ok: false, error: "username นี้มีแล้ว" };
    }
    users.push({
      username: normalized,
      passwordHash,
      dbName,
      dbPass,
      createdAt: new Date().toISOString(),
    });
    writeUsers(users);
    return { ok: true, dbName, username: normalized };
  });
}

export async function verifyUser(username: string, password: string): Promise<UserRecord | null> {
  const user = getUser(username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createSessionToken(username: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const body = Buffer.from(JSON.stringify({ u: username, exp }), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expect = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      u: string;
      exp: number;
    };
    if (!data.u || data.exp < Date.now()) return null;
    return data.u;
  } catch {
    return null;
  }
}

export function sessionCookieName() {
  return COOKIE;
}

export function sessionCookieOptions(maxAgeSec = 7 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
    secure: false,
  };
}

export function getUsernameFromRequest(req: Request): string | null {
  const raw = req.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return readSessionToken(match?.[1]);
}

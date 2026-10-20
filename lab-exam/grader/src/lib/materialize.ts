import fs from "fs";
import path from "path";
import type { FileMap } from "./checks";

/**
 * Write submission into DATA_DIR/submissions/{username}/www preserving paths.
 * Handles zips with www/ prefix, flat files, or includes/ nesting.
 */
export function materializeApp(
  files: FileMap,
  username: string,
  dataDir: string
): { appRoot: string; detail: string } {
  // lowercase — Apache VirtualDocumentRoot lowercases Host `{user}.grade.local`
  const safeUser = username.trim().toLowerCase();
  const userRoot = path.join(dataDir, "submissions", safeUser);
  const appRoot = path.join(userRoot, "www");

  fs.rmSync(userRoot, { recursive: true, force: true });
  fs.mkdirSync(appRoot, { recursive: true });
  fs.mkdirSync(path.join(appRoot, "includes"), { recursive: true });
  const insecureDir = path.join(appRoot, "uploads_insecure");
  const secureDir = path.join(dataDir, "uploads_secure");
  fs.mkdirSync(insecureDir, { recursive: true });
  fs.mkdirSync(secureDir, { recursive: true });
  // www-data on runner must be able to move_uploaded_file here
  try {
    fs.chmodSync(insecureDir, 0o777);
    fs.chmodSync(secureDir, 0o777);
    fs.chmodSync(appRoot, 0o775);
  } catch {
    /* non-fatal on some FS */
  }

  let wrote = 0;
  for (const [rawKey, content] of Object.entries(files)) {
    // normalize separators + strip leading ./ and absolute /
    let key = rawKey.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
    // Windows "Compress folder" → websec-labexam-starter (2)/www/register.php
    key = unwrapStarterWrapper(key);
    const base = key.includes("/") ? key.slice(key.lastIndexOf("/") + 1) : key;
    const baseLower = base.toLowerCase();

    if (baseLower === "user.sql") {
      fs.writeFileSync(path.join(userRoot, "user.sql"), content, "utf8");
      continue;
    }
    if (baseLower === ".env") {
      fs.writeFileSync(path.join(appRoot, ".env"), content, "utf8");
      fs.writeFileSync(path.join(userRoot, ".env"), content, "utf8");
      wrote += 1;
      continue;
    }

    let rel = key;
    // strip common zip roots (once)
    rel = rel.replace(/^(www|html|public|app)\//i, "");
    // bare includes files
    if (
      !rel.includes("/") &&
      ["config.php", "auth_check.php", "layout.php"].includes(base)
    ) {
      rel = `includes/${base}`;
    }

    if (rel.includes("..")) continue;
    const dest = path.join(appRoot, rel);
    // refuse path escape outside appRoot
    if (!dest.startsWith(appRoot + path.sep) && dest !== appRoot) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, "utf8");
    wrote += 1;
  }

  return { appRoot, detail: `wrote ${wrote} files → ${appRoot}` };
}

/**
 * Flatten zips that wrap the project in an extra folder, e.g.
 *   websec-labexam-starter (2)/www/register.php  → www/register.php
 *   my-lab/.env                                  → .env
 */
function unwrapStarterWrapper(key: string): string {
  const parts = key.split("/").filter(Boolean);
  if (parts.length < 2) return key;

  // …/www/… → keep from www onward (drop parent folder names)
  const wwwIdx = parts.findIndex((p) => /^(www|html|public|app)$/i.test(p));
  if (wwwIdx > 0) {
    return parts.slice(wwwIdx).join("/");
  }

  // top-level project folder + known root file
  const top = parts[0];
  const rest = parts.slice(1).join("/");
  if (
    !/^(www|html|public|app)$/i.test(top) &&
    /^(user\.sql|\.env|compose\.ya?ml|db\.sql|dockerfile|readme.*)$/i.test(rest)
  ) {
    return rest;
  }

  return key;
}

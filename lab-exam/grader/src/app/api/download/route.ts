import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import { ensureDbPass, getUser, getUsernameFromRequest } from "@/lib/auth";
import { starterUserSql } from "@/lib/runUserSql";
import { readStudentPackFile, starterDbSql } from "@/lib/starterPack";
import { dbNameFor, starterEnv } from "@/lib/userDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function addDir(zip: AdmZip, dir: string, prefix: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "uploads_insecure") {
        zip.addFile(rel.replace(/\\/g, "/") + "/.gitkeep", Buffer.from(""));
        continue;
      }
      addDir(zip, full, rel);
    } else {
      zip.addLocalFile(full, prefix);
    }
  }
}

export async function GET(req: Request) {
  const username = getUsernameFromRequest(req);
  if (!username) {
    return NextResponse.json({ error: "ต้อง login ก่อนดาวน์โหลด" }, { status: 401 });
  }
  const user = getUser(username);
  if (!user) {
    return NextResponse.json({ error: "ต้อง login ก่อนดาวน์โหลด" }, { status: 401 });
  }
  const dbName = user.dbName || dbNameFor(username);
  const dbPass = ensureDbPass(username);

  const starter = process.env.STARTER_DIR || path.join(process.cwd(), "..", "php", "www");
  if (!fs.existsSync(starter)) {
    return NextResponse.json({ error: "starter missing" }, { status: 500 });
  }

  let composeYaml: string;
  let dockerfile: string;
  let readmeLocal: string;
  let dbSql: string;
  try {
    composeYaml = readStudentPackFile("compose.yaml");
    dockerfile = readStudentPackFile("Dockerfile");
    readmeLocal = readStudentPackFile("README-LOCAL.md");
    dbSql = starterDbSql(dbName);
  } catch (err) {
    return NextResponse.json(
      {
        error: "student pack missing",
        detail: err instanceof Error ? err.message : "pack error",
      },
      { status: 500 }
    );
  }

  const zip = new AdmZip();
  addDir(zip, starter, "www");
  zip.addFile(".env", Buffer.from(starterEnv(username, dbPass), "utf8"));
  zip.addFile("user.sql", Buffer.from(starterUserSql(username, dbName, dbPass), "utf8"));
  zip.addFile("db.sql", Buffer.from(dbSql, "utf8"));
  zip.addFile("compose.yaml", Buffer.from(composeYaml, "utf8"));
  zip.addFile("Dockerfile", Buffer.from(dockerfile, "utf8"));
  zip.addFile("README-LOCAL.md", Buffer.from(readmeLocal, "utf8"));
  zip.addFile("uploads_secure/.gitkeep", Buffer.from(""));

  const buf = zip.toBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="websec-labexam-starter.zip"',
    },
  });
}

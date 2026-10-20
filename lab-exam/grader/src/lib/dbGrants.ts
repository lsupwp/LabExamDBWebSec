import mysql from "mysql2/promise";
import { dbNameFor } from "./userDb";

export type GrantsCheck = {
  pass: boolean;
  detail: string;
  grants?: string;
};

export async function checkLeastPrivilegeUser(
  username: string,
  dbName = dbNameFor(username)
): Promise<GrantsCheck> {
  const host = process.env.DB_HOST || "db";
  const rootPass = process.env.DB_ROOT_PASSWORD || "RootPass1234";
  const safeUser = username.replace(/[^a-zA-Z0-9_]/g, "");
  if (safeUser !== username) {
    return { pass: false, detail: "username มีอักขระที่ไม่รองรับสำหรับ MySQL user" };
  }

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({
      host,
      user: "root",
      password: rootPass,
      connectTimeout: 5000,
    });

    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT User, Host FROM mysql.user WHERE User = ?",
      [username]
    );
    if (!rows.length) {
      return {
        pass: false,
        detail: `ยังไม่มี MySQL user ชื่อ '${username}' — ใส่ CREATE USER ใน user.sql`,
      };
    }

    const grantTexts: string[] = [];
    for (const r of rows) {
      const h = String(r.Host).replace(/[`']/g, "");
      const [g] = await conn.query<mysql.RowDataPacket[]>(
        `SHOW GRANTS FOR \`${username}\`@\`${h}\``
      );
      for (const row of g) {
        grantTexts.push(String(Object.values(row)[0]));
      }
    }

    const joined = grantTexts.join("\n");
    const hasDangerous =
      /\bALL PRIVILEGES\b/i.test(joined) ||
      /\bDROP\b/i.test(joined) ||
      /\bCREATE\b/i.test(joined) ||
      /\bALTER\b/i.test(joined) ||
      /\bGRANT OPTION\b/i.test(joined) ||
      /\bSUPER\b/i.test(joined);

    const classic = new RegExp(
      `GRANT\\s+SELECT\\s*,\\s*INSERT\\s*,\\s*UPDATE\\s*,\\s*DELETE\\s+ON\\s+(\`?${dbName}\`?\\.\\*)`,
      "i"
    ).test(joined);

    if (hasDangerous) {
      return {
        pass: false,
        detail: "สิทธิ์มากเกินไปตามหลัก Least Privilege",
        grants: joined,
      };
    }
    if (!classic) {
      return {
        pass: false,
        detail: `สิทธิ์ยังไม่ตรงฐานข้อมูล ${dbName} ตาม Least Privilege (กำหนดเองใน user.sql)`,
        grants: joined,
      };
    }
    return {
      pass: true,
      detail: `OK — สิทธิ์ของ '${username}' บน ${dbName} ผ่าน`,
      grants: joined,
    };
  } catch (err) {
    return {
      pass: false,
      detail: `ตรวจ grants ไม่ได้: ${err instanceof Error ? err.message : "db error"}`,
    };
  } finally {
    if (conn) await conn.end().catch(() => undefined);
  }
}

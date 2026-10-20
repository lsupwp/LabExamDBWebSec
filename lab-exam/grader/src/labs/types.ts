import type { CheckResult } from "@/lib/checks";
import type { CookieJar, RuntimeCtx } from "./shared/runtimeKit";

export type { RuntimeCtx };

export type RuntimeCase = {
  id: string;
  lab: string;
  title: string;
  how: string;
  expected: string;
  hint: string;
  /** Lower = earlier. Lab05 lockout should be last (e.g. 900). */
  order?: number;
  run: (ctx: RuntimeCtx, jar: CookieJar) => Promise<{ pass: boolean; detail?: string }>;
};

export type LabDefinition = {
  id: string;
  order: number;
  title: string;
  runtime: RuntimeCase[];
};

export type ChecklistMeta = {
  id: string;
  lab: string;
  title: string;
  how: string;
  expected: string;
  hint: string;
  files: string[];
};

export type GradeHookCtx = {
  username: string;
  dbName: string;
  dbPass: string;
  files: Record<string, string>;
};

export type GradeHook = {
  id: string;
  lab: string;
  title: string;
  how: string;
  expected: string;
  run: (ctx: GradeHookCtx) => Promise<CheckResult>;
};

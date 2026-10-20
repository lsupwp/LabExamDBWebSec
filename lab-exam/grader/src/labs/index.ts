import { lab01 } from "./lab01/lab";
import { lab03 } from "./lab03/lab";
import { lab04 } from "./lab04/lab";
import { lab05 } from "./lab05/lab";
import { lab06 } from "./lab06/lab";
import { legacyRuntimeCases } from "./legacyRuntime";
import type { ChecklistMeta, LabDefinition, RuntimeCase } from "./types";

/**
 * Register labs here to include them in grading + checklist.
 * Add a new lab: create labs/labNN/lab.ts → import → push into ALL_LABS.
 */
export const ALL_LABS: LabDefinition[] = [
  lab01,
  lab03,
  lab04,
  lab05,
  lab06,
  // Lab02, Lab07–12 live in legacyRuntimeCases (same scoring as before)
  {
    id: "Lab02",
    order: 2,
    title: "Form method",
    runtime: legacyRuntimeCases.filter((c) => c.lab === "Lab02"),
  },
  {
    id: "Lab07",
    order: 7,
    title: "Session / Login",
    runtime: legacyRuntimeCases.filter((c) => c.lab === "Lab07"),
  },
  {
    id: "Lab08",
    order: 8,
    title: "SQLi / Least Privilege",
    runtime: legacyRuntimeCases.filter((c) => c.lab === "Lab08"),
  },
  {
    id: "Lab09",
    order: 9,
    title: "Validation + Regex",
    runtime: legacyRuntimeCases.filter((c) => c.lab === "Lab09"),
  },
  {
    id: "Lab10",
    order: 10,
    title: "Ownership + XSS",
    runtime: legacyRuntimeCases.filter((c) => c.lab === "Lab10"),
  },
  {
    id: "Lab11",
    order: 11,
    title: "CSRF + Admin authz",
    runtime: legacyRuntimeCases.filter((c) => c.lab === "Lab11"),
  },
  {
    id: "Lab12",
    order: 12,
    title: "Upload / Download / Security log",
    runtime: legacyRuntimeCases.filter((c) => c.lab === "Lab12"),
  },
];

/** Flat runtime cases sorted by case.order then lab.order (Lab05 lockout last). */
export function allRuntimeCases(): RuntimeCase[] {
  const flat: RuntimeCase[] = [];
  const labs = [...ALL_LABS].sort((a, b) => a.order - b.order);
  for (const lab of labs) {
    for (const c of lab.runtime) {
      flat.push(c);
    }
  }
  return flat.sort((a, b) => {
    const ao = a.order ?? labOrder(a.lab) * 10;
    const bo = b.order ?? labOrder(b.lab) * 10;
    return ao - bo;
  });
}

function labOrder(labId: string): number {
  return ALL_LABS.find((l) => l.id === labId)?.order ?? 50;
}

export function checklistLabOrder(): string[] {
  return [...ALL_LABS]
    .sort((a, b) => a.order - b.order)
    .map((l) => l.id)
    .concat(["Runtime"]);
}

export function runtimeChecklistMeta(): ChecklistMeta[] {
  return allRuntimeCases().map((c) => ({
    id: c.id,
    lab: c.lab,
    title: c.title,
    how: c.how,
    expected: c.expected,
    hint: c.hint,
    files: [],
  }));
}

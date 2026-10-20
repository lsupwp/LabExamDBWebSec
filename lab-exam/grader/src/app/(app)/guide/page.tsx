import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

async function readDoc(name: string, fallback: string) {
  const docsDir = process.env.DOCS_DIR || path.join(process.cwd(), "..", "docs");
  try {
    return await readFile(path.join(docsDir, name), "utf8");
  } catch {
    return fallback;
  }
}

export default async function GuidePage() {
  const [fixGuide, checklist, examples] = await Promise.all([
    readDoc("FIX_GUIDE.md", "FIX_GUIDE.md not found"),
    readDoc("CHECKLIST.md", "CHECKLIST.md not found"),
    readDoc("RUNTIME_MESSAGES.md", "RUNTIME_MESSAGES.md not found"),
  ]);

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-4 lg:p-6">
      <div className="mx-auto max-w-4xl space-y-6 pb-10">
        <div>
          <h1 className="text-3xl font-bold">คู่มือสอบ</h1>
          <p className="mt-1 text-base-content/70">
            Checklist ละเอียด · Example response ที่ grader จับ · Fix guide ทีละ lab
          </p>
        </div>

        <section className="card bg-base-100 shadow-md">
          <div className="card-body gap-2">
            <h2 className="card-title text-xl">Checklist (ทำอะไรบ้าง)</h2>
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed overflow-x-auto">
              {checklist}
            </pre>
          </div>
        </section>

        <section className="card bg-base-100 shadow-md">
          <div className="card-body gap-2">
            <h2 className="card-title text-xl">Example response (ข้อความที่ต้องตรงเป๊ะ)</h2>
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed overflow-x-auto">
              {examples}
            </pre>
          </div>
        </section>

        <section className="card bg-base-100 shadow-md">
          <div className="card-body gap-2">
            <h2 className="card-title text-xl">Fix guide</h2>
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed overflow-x-auto">
              {fixGuide}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}

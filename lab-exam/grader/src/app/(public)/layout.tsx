export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-dvh overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-lg px-4 py-10">{children}</div>
    </main>
  );
}

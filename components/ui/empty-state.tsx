export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-md border border-dashed hairline p-8 text-center">
      <p className="font-medium">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

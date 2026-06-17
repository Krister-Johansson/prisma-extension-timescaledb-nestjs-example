export function PagePlaceholder({ name }: { name: string }) {
  return (
    <div className="flex min-h-90 flex-col items-center justify-center rounded-[14px] border border-dashed border-border bg-card px-6 text-center">
      <div className="text-sm font-semibold">{name}</div>
      <div className="mt-1 text-[12.5px] text-muted-foreground">
        Part of the app frame — this page's UI is implemented in a later PR.
      </div>
    </div>
  );
}

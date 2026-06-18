import { Skeleton } from '@/components/ui/skeleton';

export function TableManageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="m-3.5 h-7 rounded-md" />
        ))}
      </div>
    </div>
  );
}

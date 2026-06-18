import { Skeleton } from '@/components/ui/skeleton';

export function SensorDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-[132px] rounded-[14px]" />
      <Skeleton className="h-4 w-80" />
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

export function SensorConfigSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-[92px] rounded-[14px]" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-[120px] rounded-[12px]" />
    </div>
  );
}

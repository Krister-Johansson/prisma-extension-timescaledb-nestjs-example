import { TriangleAlert } from 'lucide-react';

export function QueryError({ message }: { message?: string }) {
  return (
    <div
      role="alert"
      className="flex min-h-90 flex-col items-center justify-center rounded-[14px] border border-[color-mix(in_srgb,var(--alert)_40%,var(--border))] bg-card px-6 text-center"
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-alert-bg">
        <TriangleAlert className="size-5 text-alert" />
      </div>
      <div className="text-sm font-semibold">Couldn&apos;t load data</div>
      <div className="mt-1 max-w-md text-[12.5px] text-muted-foreground">
        {message ?? 'The GraphQL request failed — is the API server running?'}
      </div>
    </div>
  );
}

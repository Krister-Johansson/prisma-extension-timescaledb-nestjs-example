export function SensorNotFound({ sensorId }: { sensorId: string }) {
  return (
    <div className="flex min-h-90 flex-col items-center justify-center rounded-[14px] border border-dashed border-border bg-card text-center">
      <div className="text-sm font-semibold">Sensor not found</div>
      <div className="mt-1 text-[12.5px] text-muted-foreground">
        No sensor matches “{sensorId}”.
      </div>
    </div>
  );
}

export function TableSensorEmpty() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="text-sm font-semibold">No sensors yet</div>
      <div className="mt-1 text-[12.5px] text-muted-foreground">
        Create a sensor from the Manage page to start monitoring.
      </div>
    </div>
  );
}

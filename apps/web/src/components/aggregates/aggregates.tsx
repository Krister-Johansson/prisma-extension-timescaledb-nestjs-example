import { AggregateCompareChart } from './aggregate-compare-chart';
import { AggregateTypeCards } from './aggregate-type-cards';
import { TableBuckets } from './table-buckets';

export function Aggregates() {
  return (
    <div className="flex flex-col gap-4">
      <AggregateTypeCards />
      <AggregateCompareChart />
      <TableBuckets />
    </div>
  );
}

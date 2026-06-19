import { useSubscription } from '@apollo/client/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { LiveReadingDocument } from '@/graphql/widget-data.generated';

/** The most recent pushed reading for a sensor. */
export interface LiveReading {
  value: number;
  time: number;
}

interface LiveContextValue {
  /** Bumps (at most once per debounce window) when new readings land, so
   * series widgets re-render and re-evaluate their bucket-snapped window. */
  tick: number;
  /** Latest pushed reading for a sensor, if one has arrived this session. */
  getReading: (sensorId: string) => LiveReading | undefined;
}

const LiveContext = createContext<LiveContextValue>({
  tick: 0,
  getReading: () => undefined,
});

export const useDashboardTick = () => useContext(LiveContext).tick;

/** The latest live value for one sensor (pushed from the subscription). The
 * context value changes on each tick, so consumers re-render and re-read the
 * latest value here without any query refetch. */
export function useLiveReading(sensorId?: string): LiveReading | undefined {
  const { getReading } = useContext(LiveContext);
  return sensorId ? getReading(sensorId) : undefined;
}

const TICK_DEBOUNCE_MS = 3000;

/**
 * One shared subscription to `readingIngested` for the whole dashboard. Each
 * reading is recorded into a per-sensor map immediately (so "current value"
 * widgets can show it), while a debounced `tick` coalesces the firehose into a
 * gentle re-render cadence — no per-widget socket, no refetch-on-every-reading.
 */
export function DashboardLive({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Lazy-init so the Map isn't reallocated on every render (useRef ignores the
  // arg after the first render anyway).
  const latest = useRef<Map<string, LiveReading> | null>(null);
  latest.current ??= new Map();

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  useSubscription(LiveReadingDocument, {
    onData: ({ data }) => {
      const r = data.data?.readingIngested;
      if (r) {
        latest.current?.set(r.sensorId, {
          value: r.value,
          time: new Date(r.time).getTime(),
        });
      }
      // Coalesce the firehose of readings into one bump per debounce window.
      if (pending.current) return;
      pending.current = setTimeout(() => {
        pending.current = null;
        setTick((t) => t + 1);
      }, TICK_DEBOUNCE_MS);
    },
  });

  const getReading = useCallback(
    (sensorId: string) => latest.current?.get(sensorId),
    [],
  );
  const value = useMemo<LiveContextValue>(
    () => ({ tick, getReading }),
    [tick, getReading],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

import { useSubscription } from '@apollo/client/react';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ReadingTickDocument } from '@/graphql/widget-data.generated';

/** A counter that bumps (at most every few seconds) whenever new readings land,
 * so widgets can refresh without each opening its own subscription. */
const TickContext = createContext(0);
export const useDashboardTick = () => useContext(TickContext);

const TICK_DEBOUNCE_MS = 3000;

export function DashboardLive({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  useSubscription(ReadingTickDocument, {
    onData: () => {
      // Coalesce the firehose of readings into one bump per debounce window.
      if (pending.current) return;
      pending.current = setTimeout(() => {
        pending.current = null;
        setTick((t) => t + 1);
      }, TICK_DEBOUNCE_MS);
    },
  });

  return <TickContext.Provider value={tick}>{children}</TickContext.Provider>;
}

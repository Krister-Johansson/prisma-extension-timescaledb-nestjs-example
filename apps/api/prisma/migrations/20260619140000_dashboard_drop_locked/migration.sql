-- Lock is a client-side view preference, not persisted state.
ALTER TABLE "Dashboard" DROP COLUMN "locked";

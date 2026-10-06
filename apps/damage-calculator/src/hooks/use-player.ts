import { useMemo, useSyncExternalStore } from "react";
import { PLAYER_STORAGE_KEY, readPlayerState } from "../../../../shared/player/core";

export function playerSnapshot(): string | null {
  try {
    return localStorage.getItem(PLAYER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function subscribePlayer(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === PLAYER_STORAGE_KEY || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function usePlayer() {
  const raw = useSyncExternalStore(subscribePlayer, playerSnapshot, () => null);
  // Reuse the shared storage reader so corrupted profiles follow Bestiary rules.
  return useMemo(() => readPlayerState({ getItem: () => raw }), [raw]);
}

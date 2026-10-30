export type LiveSignal = {
  domain: string;
  action: string;
  payload: Record<string, unknown>;
  club?: string | null;
  profile_id?: string | null;
};

type Listener = (signal: LiveSignal) => void;

const listeners = new Set<Listener>();

export function onLiveSignal(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitLiveSignal(signal: LiveSignal): void {
  for (const fn of listeners) fn(signal);
}

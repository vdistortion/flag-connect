export type ChatAction = 'typing' | 'upload_photo';

export interface ChatActionApi {
  sendChatAction?(chatId: number, action: ChatAction): Promise<unknown>;
}

export interface ChatActionOptions {
  schedule?: (fn: () => void, ms: number) => () => void;
  onError?: (error: unknown) => void;
}

/** Stops refreshing on completion/disposal; Telegram itself expires the last action. */
export function createChatActions(options: ChatActionOptions = {}) {
  const schedule =
    options.schedule ??
    ((fn: () => void, ms: number) => {
      const timer = setTimeout(fn, ms);
      timer.unref();
      return () => clearTimeout(timer);
    });
  const report = options.onError ?? ((error: unknown) => console.error('Chat action:', error));
  const active = new Set<() => void>();
  let disposed = false;

  async function run<T>(
    api: ChatActionApi | undefined,
    chatId: number,
    action: ChatAction,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (disposed || typeof api?.sendChatAction !== 'function') return operation();
    let stopped = false;
    let inFlight = false;
    let cancel: (() => void) | undefined;
    const stop = () => {
      stopped = true;
      cancel?.();
      active.delete(stop);
    };
    const indicate = () => {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        void Promise.resolve(api.sendChatAction!(chatId, action))
          .catch(report)
          .finally(() => {
            inFlight = false;
          });
      } catch (error) {
        inFlight = false;
        report(error);
      }
    };
    const refresh = () => {
      if (stopped) return;
      indicate();
      cancel = schedule(refresh, 4_000);
    };
    active.add(stop);
    indicate();
    cancel = schedule(refresh, 4_000);
    try {
      return await operation();
    } finally {
      stop();
    }
  }

  function dispose(): void {
    disposed = true;
    for (const stop of active) stop();
  }

  return { run, dispose };
}

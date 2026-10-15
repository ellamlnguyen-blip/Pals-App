type Pending = {
  signal: AbortSignal;
  resolve: () => void;
  reject: (error: Error) => void;
  abort: () => void;
};

export class PhotoAdmission {
  private active = 0;
  private readonly queue: Pending[] = [];
  private readonly activeLimit: number;
  private readonly pendingLimit: number;

  constructor(activeLimit = 2, pendingLimit = 16) {
    this.activeLimit = activeLimit;
    this.pendingLimit = pendingLimit;
  }

  async run<T>(signal: AbortSignal, task: () => Promise<T>): Promise<T> {
    if (signal.aborted) throw new Error("Photo request unavailable");
    if (this.active < this.activeLimit) {
      this.active++;
    } else {
      if (this.queue.length >= this.pendingLimit)
        throw new Error("Photo request busy");
      await new Promise<void>((resolve, reject) => {
        const pending: Pending = {
          signal,
          resolve,
          reject,
          abort: () => {
            const index = this.queue.indexOf(pending);
            if (index >= 0) this.queue.splice(index, 1);
            reject(new Error("Photo request unavailable"));
          },
        };
        signal.addEventListener("abort", pending.abort, { once: true });
        this.queue.push(pending);
      });
    }
    try {
      if (signal.aborted) throw new Error("Photo request unavailable");
      return await task();
    } finally {
      const next = this.queue.shift();
      if (next) {
        next.signal.removeEventListener("abort", next.abort);
        next.resolve();
      } else {
        this.active--;
      }
    }
  }
}

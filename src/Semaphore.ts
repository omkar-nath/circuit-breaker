class Semaphore {
  private permits: number;
  private queue: Function[];

  constructor(public readonly numberOfConcurrentReqs: number) {
    if (numberOfConcurrentReqs <= 0)
      throw new Error("Worker count must be positive");

    this.permits = numberOfConcurrentReqs;
    this.queue = [];
  }

  test(): boolean {
    if (this.permits > 0) {
      this.permits--;
      return true;
    }
    return false;
  }

  async acquire(timeout?: number): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeoutId = timeout
        ? setTimeout(() => {
            const error: Error = new Error(`Timed out after ${timeout}ms`);
            reject(error);
          }, timeout)
        : null;

      this.queue.push(() => {
        if (timeoutId) {
          clearTimeout(timeout);
        }

        this.permits--;
        resolve();
      });
    });
  }
  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    } else {
      this.permits++;
    }
  }
  available(): number {
    return this.permits;
  }
}

export default Semaphore;

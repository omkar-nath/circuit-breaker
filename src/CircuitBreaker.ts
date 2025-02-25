import { EventEmitter } from "node:events";
import { CircuitBreakerError } from "./Error";
import Semaphore from "./Semaphore";
import InMemoryCache from "./InMemoryCache"; // Assume this is your local InMemoryCache class

enum State {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  HALF_OPEN = "HALF-OPEN",
}

class CircuitBreaker extends EventEmitter {
  action: Function;
  options: CircuitBreakerParameters;
  state: State;
  private semaphore: Semaphore;
  private failureCount: number;
  private successCount: number;
  private totalCalls: number; // Track total calls to calculate failure rate
  private lastFailureTime: number | null;
  private cache: InMemoryCache;

  constructor(action: Function, options: CircuitBreakerParameters = {}) {
    super();
    this.action = action;
    this.options = {
      capacity: Number.isInteger(options.capacity)
        ? options.capacity
        : Number.MAX_SAFE_INTEGER,
      timeout: options.timeout || 1000,
      failureThresholdPercentage: options.failureThresholdPercentage || 50, // Default to 50%
      successThreshold: options.successThreshold || 2,
      halfOpenTimeout: options.halfOpenTimeout || 5000,
      cacheEnabled: options.cacheEnabled || false,
      cacheTTL: options.cacheTTL || 0,
      cacheKey: options.cacheKey,
    };

    this.state = State.CLOSED;
    this.semaphore = new Semaphore(this.options.capacity);
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
    this.lastFailureTime = null;
    this.cache = new InMemoryCache({});

    if (!action) {
      throw new CircuitBreakerError(
        "No action provided. Please provide something to execute",
      );
    }
  }

  close() {
    if (this.state !== State.CLOSED) {
      this.state = State.CLOSED;
      this.failureCount = 0;
      this.successCount = 0;
      this.totalCalls = 0;
      this.lastFailureTime = null;
      this.emit("closed");
    }
  }

  get closed() {
    return this.state === State.CLOSED;
  }

  open() {
    if (this.state !== State.OPEN) {
      this.state = State.OPEN;
      this.lastFailureTime = Date.now();
      this.emit("open");
      setTimeout(() => this.halfOpen(), this.options.halfOpenTimeout!);
    }
  }

  halfOpen() {
    if (this.state !== State.HALF_OPEN) {
      this.state = State.HALF_OPEN;
      this.emit("half-open");
    }
  }

  name() {
    return this.action.name;
  }

  status() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      failureRate: this.calculateFailureRate(),
      lastFailureTime: this.lastFailureTime,
    };
  }

  async call(context: typeof this.action, ...rest: unknown[]) {
    const args = rest.slice();

    this.emit("fire", args);

    if (this.options.cacheEnabled) {
      const cached = this.cache.get(this.options.cacheKey);
      if (cached) {
        this.emit("cacheHit");
        return cached;
      }
    }

    if (this.state === State.OPEN) {
      throw new CircuitBreakerError("CircuitBreaker is open");
    }

    if (this.state === State.HALF_OPEN && !this.semaphore.test()) {
      throw new CircuitBreakerError(
        "CircuitBreaker is half-open and at capacity",
      );
    }

    this.totalCalls++; // Increment total calls

    let timeout: ReturnType<typeof setTimeout>;
    let timeoutError = false;

    try {
      // Acquire the semaphore before executing the action
      await this.semaphore.acquire();

      const result = await new Promise(async (resolve, reject) => {
        if (this.options.timeout) {
          timeout = setTimeout(() => {
            timeoutError = true;
            this.semaphore.release();
            reject(new Error(`Timed out after ${this.options.timeout}ms`));
          }, this.options.timeout);
        }

        try {
          const actionResult = this.action.apply(context, args);
          const result = await (typeof actionResult.then === "function"
            ? actionResult
            : Promise.resolve(actionResult));

          if (!timeoutError) {
            clearTimeout(timeout);
            this.semaphore.release();
            this.recordSuccess();
            resolve(result);
            this.cache.set(
              this.options.cacheKey,
              result,
              this.options.cacheTTL > 0
                ? Date.now() + this.options.cacheTTL
                : 0,
            );
          }
        } catch (error) {
          if (!timeoutError) {
            clearTimeout(timeout);
            this.semaphore.release();
            this.recordFailure();
            reject(error);
          }
        }
      });

      return result;
    } catch (error) {
      this.emit("failure", error);
      throw error;
    }
  }

  fire<T extends any[]>(...args: T) {
    return this.call(this.action, ...args);
  }

  clearCache() {
    this.cache.flush();
    this.emit("cache-cleared");
  }

  private calculateFailureRate(): number {
    if (this.totalCalls === 0) return 0;
    return (this.failureCount / this.totalCalls) * 100;
  }

  private recordSuccess() {
    if (this.state === State.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold!) {
        this.close();
      }
    }
  }

  private recordFailure() {
    this.failureCount++;
    const failureRate = this.calculateFailureRate();
    if (failureRate >= this.options.failureThresholdPercentage!) {
      this.open();
    }
  }
}

export default CircuitBreaker;

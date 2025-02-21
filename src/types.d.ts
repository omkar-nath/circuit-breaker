type CircuitBreakerParameters = {
  timeout?: number;
  maxFailures?: number;
  errorThresholdPercentage?: number;
  successThreshold?: number;
  capacity: number;
  errorFilter: Function;
  cache?: boolean;
  cacheTTL?: number;
};

type CacheParameters = {
  maxEntries?: number;
};

type CacheValue = {
  expiresAt: number;
  value: any;
};

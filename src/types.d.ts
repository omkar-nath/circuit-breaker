interface CircuitBreakerParameters {
  capacity?: number;
  timeout?: number;
  failureThresholdPercentage?: number; // Failure threshold as a percentage
  successThreshold?: number;
  halfOpenTimeout?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
}
type CacheParameters = {
  maxEntries?: number;
};

type CacheValue = {
  expiresAt: number;
  value: any;
};

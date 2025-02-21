# circuit-breaker

Reverse engineered the codebase of Oppossum and re-wrote core functionality in typescript

# Circuit Breaker

A Typescript implementation of the **Circuit Breaker** pattern to handle failures gracefully and improve system resilience.

## Features

- Limits the number of concurrent requests using a **semaphore**.
- Automatically opens the circuit when failures exceed a **threshold**.
- Transitions to **half-open** state to test recovery.
- Supports **timeouts** for slow requests.
- Emits events for state transitions (`open`, `half-open`, `closed`).
- Includes an **in-memory cache** for storing results.

## Usage

### Basic Example

```javascript
import CircuitBreaker from "./CircuitBreaker";

async function unreliableService() {
  if (Math.random() < 0.5) {
    throw new Error("Service failure");
  }
  return "Success";
}

const breaker = new CircuitBreaker(unreliableService, {
  capacity: 5, // Max concurrent requests
  timeout: 1000, // Timeout for requests (ms)
  failureThresholdPercentage: 50, // Failure percentage to open circuit
  successThreshold: 2, // Required successes to close circuit
  halfOpenTimeout: 5000, // Time before switching to half-open
});

breaker.on("open", () => console.log("Circuit is OPEN"));
breaker.on("half-open", () => console.log("Circuit is HALF-OPEN"));
breaker.on("closed", () => console.log("Circuit is CLOSED"));

(async () => {
  try {
    const result = await breaker.fire();
    console.log("Result:", result);
  } catch (error) {
    console.error("Request failed:", error);
  }
})();
```

## Configuration Options

| Option                       | Default                   | Description                           |
| ---------------------------- | ------------------------- | ------------------------------------- |
| `capacity`                   | `Number.MAX_SAFE_INTEGER` | Max concurrent requests               |
| `timeout`                    | `1000`                    | Request timeout (ms)                  |
| `failureThresholdPercentage` | `50`                      | Failure rate (%) to open circuit      |
| `successThreshold`           | `2`                       | Required successes to close circuit   |
| `halfOpenTimeout`            | `5000`                    | Timeout before switching to half-open |

## API

### `fire(...args)`

Executes the wrapped function with the provided arguments.

### `close()`

Closes the circuit and resets failure counts.

### `open()`

Opens the circuit, preventing requests.

### `halfOpen()`

Transitions the circuit to **half-open** state.

### `status()`

Returns the current status:

```json
{
  "state": "CLOSED",
  "failureCount": 0,
  "successCount": 0,
  "totalCalls": 10,
  "failureRate": 10,
  "lastFailureTime": 1670000000000
}
```

### `clearCache()`

Clears the in-memory cache.

## Events

- `open` → Circuit **opens** due to failures.
- `half-open` → Circuit **transitions** to half-open.
- `closed` → Circuit **closes** after success.
- `failure` → A request **fails**.
- `fire` → A request **executes**.
- `cache-cleared` → Cache is **cleared**.

## License

MIT

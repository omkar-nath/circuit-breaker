import CircuitBreaker from "../CircuitBreaker";

describe("CircuitBreaker", () => {
  let circuitBreaker: CircuitBreaker;
  const mockAction = jest.fn();

  const OPEN_ERROR = "CircuitBreaker is open";

  beforeEach(() => {
    jest.useFakeTimers();
    mockAction.mockReset();
    circuitBreaker = new CircuitBreaker(mockAction, {
      capacity: 3,
      timeout: 100,
      failureThresholdPercentage: 50,
      successThreshold: 2,

      halfOpenTimeout: 500,
    });
  });

  test("should call the action when the circuit is closed", async () => {
    mockAction.mockResolvedValue("success");
    const result = await circuitBreaker.fire();
    expect(result).toBe("success");
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test("should open the circuit after failures exceed the threshold", async () => {
    mockAction.mockRejectedValue(new Error(OPEN_ERROR));
    await expect(circuitBreaker.fire()).rejects.toThrow(OPEN_ERROR);
    await expect(circuitBreaker.fire()).rejects.toThrow(OPEN_ERROR);
    expect(circuitBreaker.status().state).toBe("OPEN");
  });

  test("should transition to half-open after the halfOpenTimeout", async () => {
    mockAction.mockRejectedValue(new Error(OPEN_ERROR));
    await expect(circuitBreaker.fire()).rejects.toThrow(OPEN_ERROR);
    await expect(circuitBreaker.fire()).rejects.toThrow(OPEN_ERROR);
    expect(circuitBreaker.status().state).toBe("OPEN");

    jest.advanceTimersByTime(500);
    expect(circuitBreaker.status().state).toBe("HALF-OPEN");
  });

  test("should throw CircuitBreakerError when the circuit is half-open and at capacity", async () => {
    mockAction.mockRejectedValue(new Error(OPEN_ERROR));
    await expect(circuitBreaker.fire()).rejects.toThrow(OPEN_ERROR);

    expect(circuitBreaker.status().state).toBe("OPEN");

    jest.advanceTimersByTime(500); // Simulate the passage of time

    expect(circuitBreaker.status().state).toBe("HALF-OPEN");
    mockAction.mockResolvedValue("success");
    await circuitBreaker.fire();

    await circuitBreaker.fire();

    expect(circuitBreaker.status().state).toBe("CLOSED");
  });
});

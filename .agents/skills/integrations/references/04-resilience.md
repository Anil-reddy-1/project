# Phase 4: Resilience and Failure Handling

11. **Design timeout strategy per integration.** Timeouts are the first line of defense against external dependency failures:

    **Timeout budget pattern**:
    - Your API has an SLA (e.g., respond within 2 seconds). The external API call is one step in the request processing. Allocate a timeout budget:
      - Total API response time budget: 2000ms.
      - Database operations: ~50ms.
      - Application logic: ~50ms.
      - External API timeout budget: 2000 - 50 - 50 - 100 (buffer) = 1800ms.
    - If the external API exceeds its budget, fail the external call and return a meaningful response to the user (error, fallback, or degraded response).
    - **For multiple sequential external calls**: Divide the budget. If you call API A then API B, allocate 800ms to A and 800ms to B (with 400ms buffer). Or use a total timeout that cancels remaining calls if exceeded.
    - **For parallel external calls**: Use the maximum timeout of any single call (calls happen concurrently, total time = slowest call).

12. **Design retry strategy per integration.** Retries handle transient failures — but incorrect retries cause data corruption and amplify outages:

    **Retry policy design**:
    - **What to retry**:
      - Network errors (connection refused, connection reset, DNS resolution failure).
      - Timeout errors (the server did not respond in time).
      - HTTP 429 (rate limited) — retry after the `Retry-After` duration.
      - HTTP 500, 502, 503, 504 (server errors) — these are often transient.
    - **What NOT to retry**:
      - HTTP 400 (bad request) — your request is malformed. Fix the request, do not retry.
      - HTTP 401 (unauthorized) — your credentials are invalid. Refresh the token if applicable, but do not blindly retry.
      - HTTP 403 (forbidden) — you do not have permission. Retrying will not help.
      - HTTP 404 (not found) — the resource does not exist. Retrying will not help.
      - HTTP 409 (conflict) — the operation conflicts with current state. Handle the conflict, do not blindly retry.
      - HTTP 422 (unprocessable entity) — the request is semantically invalid. Fix the data.
    - **Maximum retry count**: 2-3 retries for synchronous (user-facing) calls. 5-10 retries for asynchronous (background) processing.
    - **Backoff strategy**: Exponential backoff with jitter.
      - Formula: `delay = min(base_delay × 2^attempt + random_jitter, max_delay)`.
      - Base delay: 500ms-1s. Max delay: 30-60 seconds.
      - Jitter: Random value between 0 and `base_delay`. Prevents thundering herd when multiple clients retry simultaneously.
    - **Respect Retry-After header**: When the external API returns `429` or `503` with a `Retry-After` header, use that value as the minimum delay before retrying. The external API is telling you exactly when to retry — ignoring it may result in further throttling or blocking.

    **Retry safety — the critical question**:
    - **Is the operation safe to retry?**
      - **GET requests**: Always safe (idempotent by definition).
      - **PUT requests**: Safe if the external API implements PUT as idempotent (same input → same result regardless of how many times called).
      - **DELETE requests**: Usually safe (deleting an already-deleted resource returns 404 or 204).
      - **POST requests**: **Not safe by default.** Retrying a POST that creates a resource may create duplicates. Use the external API's idempotency mechanism (step 14).
    - If the operation is not safe to retry and the external API does not support idempotency keys, do NOT auto-retry. Instead: log the failure, alert, and let a human or reconciliation process resolve it.

13. **Design circuit breaker for each external dependency.** A circuit breaker prevents your system from continuously calling an external API that is clearly down, which would: waste resources, add latency (waiting for timeouts), amplify load on the recovering external system, and degrade your system's performance:

    **Circuit breaker states**:
    - **Closed** (normal operation): Requests pass through to the external API. Track failure count. If failure count exceeds the threshold within the monitoring window, transition to Open.
    - **Open** (external API is down): Requests are immediately rejected without calling the external API. Return a fallback response or error. After a cooldown period, transition to Half-Open.
    - **Half-Open** (testing recovery): Allow a single request through to test if the external API has recovered. If successful, transition to Closed. If failed, transition back to Open.

    **Circuit breaker configuration per integration**:
    - **Failure threshold**: Number of failures to open the circuit. Example: 5 failures in 60 seconds. Set based on the external API's normal error rate — if the API has a baseline 0.1% error rate, 5 failures in 60 seconds at 100 requests/second is abnormal. At 1 request/second, 5 failures in 60 seconds is very significant.
    - **Failure criteria**: What counts as a failure? Timeouts, 5xx responses, connection errors. Do NOT count 4xx responses as failures (those are client errors, not external API failures).
    - **Cooldown period**: How long the circuit stays open before testing recovery. 30-60 seconds for most integrations. Shorter for critical integrations where you want to recover quickly.
    - **Half-open request count**: How many test requests to send in half-open state. 1-3 requests. If all succeed, close the circuit.

    **Fallback behavior when circuit is open**:
    - **Payment processing**: Cannot fall back. Return an error to the user: "Payment processing is temporarily unavailable. Please try again in a few minutes." Do not silently accept orders without payment.
    - **Shipping rate calculation**: Fall back to cached rates (if available and recent), flat-rate estimate, or display "shipping calculated at checkout." Inform the user that rates are estimated.
    - **Email sending**: Queue the email for later delivery. The user's action succeeds; the email is sent when the service recovers.
    - **Address validation**: Skip validation and accept the address as-is (with a flag for later validation). Or use cached validation results.
    - **Analytics/CRM sync**: Queue for later. No user impact.
    - Define the fallback for each integration in the catalog and ensure stakeholders accept the degraded behavior.

    **Implementation**: Use a library (Resilience4j for Java, Polly for .NET, `gobreaker` for Go, `opossum` for Node.js). Do not build custom circuit breakers — the edge cases (concurrent requests during state transitions, half-open race conditions) are subtle.

14. **Design idempotency for external write operations.** When retrying external API calls (or when the response is ambiguous — timeout does not mean failure), you must prevent duplicate effects:

    **External API idempotency key**:
    - Many APIs support an idempotency key header (Stripe: `Idempotency-Key`, Adyen: custom header, etc.). Send a unique key with each write request. If you retry the request with the same key, the API returns the original response without re-executing the operation.
    - **Generate idempotency keys deterministically**: Derive from the operation's natural identity. For a payment on order `ord_123`, use `payment:ord_123:attempt_1`. This ensures the same operation always produces the same key, even across application restarts.
    - **Store idempotency keys**: Track which keys have been used and their outcomes. If the application crashes between sending the request and processing the response, it can re-send the request with the same key and get the same result.

    **When the external API does not support idempotency**:
    - **Check-before-write**: Before creating a resource, query the external API to check if it already exists (by a natural key or external ID). Only create if it does not exist.
    - **Unique constraints on external ID**: Use your database's unique constraint on the external ID to prevent recording duplicate external operations: `UNIQUE (provider, external_id)`. If a retry produces the same external ID, the database insert fails (safely).
    - **Record-keeping with status tracking**: Track the external operation's status in your database:
      1. Before calling the external API, create a record with `status: 'pending'`.
      2. Call the external API.
      3. On success, update the record with `status: 'completed'` and the external response.
      4. On failure, update with `status: 'failed'` and error details.
      5. On timeout (ambiguous), update with `status: 'unknown'` and trigger a reconciliation check.
    - **Reconciliation**: For operations where timeout leaves the outcome unknown, implement a reconciliation process that queries the external API to determine the actual outcome and updates the local record accordingly. Run reconciliation periodically or immediately after an ambiguous result.

15. **Design bulkhead isolation.** Prevent one failing external dependency from consuming all resources and cascading into failures of other integrations:

    **Bulkhead patterns**:
    - **Separate thread pools / connection pools per external dependency**: The Stripe adapter uses a thread pool of 10 threads. The SendGrid adapter uses a separate thread pool of 5 threads. If Stripe is slow and all 10 Stripe threads are waiting on timeouts, the SendGrid pool is unaffected, and email sending continues normally.
    - **Separate HTTP client instances per external dependency**: Each integration adapter creates its own HTTP client with its own connection pool, timeout configuration, and circuit breaker. A hung connection to Stripe does not exhaust connections available for SendGrid.
    - **Async processing isolation**: Each integration's background worker/consumer runs independently. If the Stripe webhook processor is stuck, it does not affect the SendGrid email sender or the Shippo shipping processor.

# Phase 5: Rate Limit Management

16. **Design client-side rate limit compliance.** External APIs enforce rate limits. Exceeding them results in 429 responses, temporary blocks, or account suspension. Your integration must respect these limits proactively:

    **Rate limit tracking**:
    - **Parse rate limit headers**: Most APIs return rate limit information in response headers:
      ```
      X-RateLimit-Limit: 100        (requests allowed per window)
      X-RateLimit-Remaining: 42     (requests remaining in current window)
      X-RateLimit-Reset: 1705312200 (Unix timestamp when window resets)
      ```
    - Track these values per external API. When `Remaining` approaches 0, slow down requests proactively rather than hitting the limit and receiving 429s.

    **Client-side throttling**:
    - Implement a rate limiter in the integration adapter that enforces the external API's limits locally:
      - **Token bucket**: Refill tokens at the rate of the API's limit. Each request consumes a token. If no tokens are available, queue the request until a token is available. Allows short bursts while respecting the average rate.
      - **Sliding window**: Track the number of requests in the current window. Reject or queue requests that would exceed the limit.
    - Set the client-side limit slightly below the actual API limit (90% of the published limit) to provide a safety margin for concurrent requests and clock skew.
    - For background/async operations: spread requests evenly across the rate limit window rather than bursting all at once. If the limit is 100 requests/minute, send approximately 1-2 requests/second rather than 100 in the first second.

    **Handling 429 responses**:
    - **Respect Retry-After**: If the 429 response includes a `Retry-After` header (seconds or HTTP date), wait that duration before retrying.
    - **If no Retry-After**: Use exponential backoff starting at 1-5 seconds.
    - **Alert on repeated 429s**: If the integration is consistently hitting rate limits, it indicates: the rate limit is too low for the workload (request a higher limit from the provider), the integration is making unnecessary calls (optimize — cache, batch, reduce polling frequency), or a bug is causing excessive calls.

    **Rate limit strategies for high-volume integrations**:
    - **Request batching**: If the API supports batch endpoints (send 100 records in one request instead of 100 individual requests), use them.
    - **Caching**: Cache external API responses that are reusable (shipping rates for the same origin/destination, validation results, reference data). See caching skill for design.
    - **Request deduplication**: Before calling the external API, check if the same request was recently made (by hashing the request parameters and checking a cache). Avoid duplicate calls for the same data within a short window.
    - **Priority queue**: If rate limits are tight, prioritize user-facing requests over background operations. Process user-facing requests immediately and queue background requests for rate-limited processing.
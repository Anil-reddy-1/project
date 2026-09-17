# Phase 3: API Client Design

8. **Design the HTTP client configuration.** Every external API call goes through an HTTP client. Configure it deliberately:

   **Connection management**:
   - **Connection pooling** (mandatory): Reuse HTTP connections across requests to avoid TCP/TLS handshake overhead per call. Configure per external host:
     - Maximum connections per host: 10-50 (depends on expected concurrency and external API's connection limits).
     - Connection idle timeout: 30-60 seconds.
     - Connection TTL: 5-10 minutes (recycle connections to handle DNS changes).
   - **DNS caching**: HTTP clients cache DNS resolution. Set DNS TTL to 60 seconds to handle external API failovers and load balancer changes. Some external APIs use short DNS TTLs for traffic management — respect them.

   **Timeout configuration** (the most critical client configuration):
   - **Connection timeout**: Maximum time to establish a TCP connection. Set to 3-5 seconds. If the external server is unreachable, fail fast.
   - **TLS handshake timeout**: Maximum time for the TLS handshake after TCP connection. Set to 3-5 seconds. Included in connection timeout in most HTTP clients.
   - **Request timeout (read timeout)**: Maximum time to receive the complete response after sending the request. Set based on the external API's expected response time:
     - Fast APIs (payment authorization, address validation): 5-10 seconds.
     - Medium APIs (shipping rate calculation, search): 10-30 seconds.
     - Slow APIs (report generation, bulk operations): 30-120 seconds.
     - **Never use no timeout (infinite wait).** This is the single most common integration mistake. A hung external API without a timeout will exhaust your thread pool and cascade into a full system outage.
   - **Total request timeout**: Maximum time for the entire request lifecycle including retries. Set to: `(individual_timeout × max_retries) + total_backoff_time + buffer`. Example: individual timeout 10s, 3 retries with exponential backoff = ~40s total. The user should not wait more than this.

   **Request configuration**:
   - **User-Agent header**: Set a descriptive User-Agent: `MyApp/1.0 (support@example.com)`. Some APIs reject requests without a User-Agent. It helps the provider identify your integration for support and debugging.
   - **Accept and Content-Type headers**: Set explicitly. Do not rely on defaults.
   - **Compression**: Enable `Accept-Encoding: gzip` to reduce response payload size and transfer time. Most external APIs support gzip.
   - **Keep-Alive**: Enable by default (HTTP/1.1 default). Reuses connections, reduces latency.
   - **HTTP/2**: Use when the external API supports it. Multiplexes requests over a single connection, reducing connection overhead.

9. **Design request and response logging.** Log every external API interaction for debugging, auditing, and performance monitoring:

   **What to log**:
   - Request: method, URL (with path but without sensitive query parameters), request headers (without `Authorization` header value), request body (with sensitive fields redacted), timestamp, correlation ID.
   - Response: status code, response headers (relevant ones: `X-RateLimit-*`, `Retry-After`, `X-Request-Id`), response body (with sensitive fields redacted, truncated if very large), response time in milliseconds.
   - Error: if the request failed (timeout, connection refused, TLS error), log the error type, message, and whether it will be retried.

   **What NOT to log**:
   - API keys, tokens, passwords, or authentication credentials (mask the `Authorization` header).
   - Full credit card numbers, SSNs, or other highly sensitive data in request/response bodies. Apply field-level redaction.
   - Full response bodies for large responses (truncate to first 1KB and log the total size).

   **Log level**:
   - Successful requests: INFO (or DEBUG if the call volume is very high and INFO logs become too noisy).
   - Client errors (4xx): WARN (these may indicate a bug in your integration or invalid data).
   - Server errors (5xx) and timeouts: ERROR (these require attention — the external system is having problems).
   - Retries: WARN (including retry attempt number and reason).

   **Structured logging format**:
   ```json
   {
     "level": "INFO",
     "message": "External API call",
     "integration": "stripe",
     "operation": "create_payment_intent",
     "method": "POST",
     "url": "https://api.stripe.com/v1/payment_intents",
     "status": 200,
     "duration_ms": 342,
     "correlation_id": "req_xyz789",
     "external_request_id": "req_stripe_abc123",
     "retry_attempt": 0
   }
   ```

10. **Design external ID correlation.** Your system must track the relationship between internal entities and their external counterparts:

    **Store external IDs explicitly**:
    ```sql
    CREATE TABLE payment_records (
        id                UUID PRIMARY KEY,
        order_id          UUID NOT NULL REFERENCES orders(id),
        provider          VARCHAR(50) NOT NULL,  -- 'stripe', 'adyen'
        external_id       VARCHAR(255) NOT NULL,  -- Stripe payment intent ID
        external_status   VARCHAR(50),            -- External system's status
        internal_status   VARCHAR(50) NOT NULL,   -- Our mapped status
        amount_cents      INTEGER NOT NULL,
        currency          VARCHAR(3) NOT NULL,
        raw_response      JSONB,                  -- Full external response (redacted)
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (provider, external_id)
    );
    ```

    - **Map external IDs to internal IDs**: Every external entity (Stripe payment intent, SendGrid message, Shippo shipment) must be linked to the internal entity it relates to.
    - **Store the raw response** (redacted): This is invaluable for debugging when the external API's behavior doesn't match expectations. Store in a JSONB column with sensitive fields removed.
    - **Track external status separately from internal status**: The external system may have different status values and transitions than your system. Map them, but preserve both for debugging.
    - **Unique constraint on (provider, external_id)**: Prevents duplicate processing of the same external event.

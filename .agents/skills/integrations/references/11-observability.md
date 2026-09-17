# Phase 11: Integration Observability

27. **Design integration-specific monitoring.** Each external integration must be monitored independently. General application monitoring does not provide sufficient visibility into integration health:

    **Per-integration metrics**:
    - **Availability**: Is the external API responding? (Derived from error rate and timeout rate.)
    - **Latency**: p50, p95, p99 response time per endpoint per integration. Track trends — a gradually increasing p99 indicates degradation.
    - **Error rate**: Percentage of requests resulting in errors, broken down by:
      - Client errors (4xx) — may indicate bugs in your integration or invalid data.
      - Server errors (5xx) — indicates external API problems.
      - Timeouts — indicates external API slowness or network issues.
      - Connection errors — indicates network problems or external API unreachability.
    - **Throughput**: Requests per second per integration. Track against the external API's rate limits.
    - **Rate limit utilization**: Current usage vs. rate limit (from `X-RateLimit-Remaining` headers). Alert when utilization exceeds 80%.
    - **Circuit breaker state**: Is the circuit open, closed, or half-open? Alert on circuit open — it means the external API is considered down.
    - **Retry rate**: Percentage of requests that required retries. High retry rates indicate instability.
    - **Webhook metrics**: Webhooks received per second, signature verification failures, processing latency, processing errors, DLQ depth.

    **Health check per integration**:
    - Implement a periodic health check for each critical integration: make a lightweight API call (GET to a health or status endpoint, or a no-op read operation) and verify success.
    - Expose integration health in your application's health check endpoint:
      ```json
      {
        "status": "healthy",
        "integrations": {
          "stripe": { "status": "healthy", "latency_ms": 145 },
          "sendgrid": { "status": "degraded", "latency_ms": 2300, "error_rate": 0.05 },
          "shippo": { "status": "unhealthy", "last_error": "Connection refused" }
        }
      }
      ```
    - Do not fail the application's overall health check if a non-critical integration is unhealthy (this would take your application offline because SendGrid is slow). Fail only if a critical integration is unhealthy and no fallback is available.

28. **Design integration dashboards.** Build and maintain:

    **Dashboard 1: Integration Health Overview**
    - Per-integration: status (healthy/degraded/unhealthy), error rate, latency p95, throughput, circuit breaker state.
    - Aggregate: total external API calls per minute, total error rate, total timeout rate.
    - Webhook: inbound webhook rate, processing lag, DLQ depth.

    **Dashboard 2: Per-Integration Detail** (one per critical integration)
    - Request rate over time.
    - Latency percentiles over time (p50, p95, p99).
    - Error rate by error type (4xx, 5xx, timeout, connection error).
    - Rate limit utilization over time.
    - Retry rate over time.
    - Circuit breaker state over time (open/closed transitions).
    - Cost (if paid API): API calls and estimated cost per day/month.

    **Dashboard 3: Webhook Processing**
    - Inbound webhooks per provider per minute.
    - Signature verification failure rate (should be ~0 — non-zero indicates attacks or misconfiguration).
    - Processing latency (time from receipt to processing completion).
    - Processing error rate.
    - DLQ depth per provider.
    - Duplicate webhook rate (webhooks deduplicated by event ID).

29. **Design integration alerting.**

    **Critical (page — requires immediate response)**:
    - Circuit breaker opened for a critical-path integration (payment, identity verification) for > 2 minutes.
    - Error rate for a critical integration exceeds 50% for > 5 minutes.
    - Webhook processing completely stopped (no webhooks processed for > 10 minutes when traffic is expected).
    - Webhook DLQ depth growing for > 15 minutes.
    - Authentication failure for an integration (expired API key, revoked OAuth token) — all requests are failing with 401.

    **Warning (ticket — investigate within business hours)**:
    - Error rate for any integration exceeds 5% for > 15 minutes.
    - Latency p95 for a critical integration exceeds 2x normal for > 10 minutes.
    - Rate limit utilization exceeds 80% for any integration.
    - Circuit breaker opened for a non-critical integration.
    - Webhook signature verification failures detected (potential attack or misconfiguration).
    - External API returning unexpected response format (contract test failure).
    - Reconciliation job found data discrepancies between local and external system.

    Every alert must have a linked runbook.
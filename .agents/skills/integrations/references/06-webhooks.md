# Phase 6: Webhook Handling

17. **Design inbound webhook processing.** Receiving webhooks from external systems is a critical integration pattern. Webhook processing must be reliable, secure, and idempotent:

    **Webhook endpoint design**:
    ```
    POST /api/webhooks/{provider}
    ```
    - Separate endpoint per provider: `/api/webhooks/stripe`, `/api/webhooks/sendgrid`, `/api/webhooks/shippo`. This allows provider-specific security validation and processing logic.
    - The endpoint must return quickly (< 5 seconds, ideally < 1 second). Most providers consider a webhook delivery failed if they don't receive a 2xx response within 5-30 seconds and will retry.

    **Webhook processing architecture** — the "receive, store, process" pattern (recommended):
    1. **Receive**: Webhook endpoint receives the raw request body and headers.
    2. **Verify**: Validate the webhook signature (step 18). If invalid, return 401 and log the attempt.
    3. **Store**: Write the raw webhook payload to a durable store (database table or message queue) with `status: 'pending'`. Return 200 immediately to the provider.
    4. **Process**: A background worker reads pending webhooks and processes them (updates internal state, triggers workflows). On success, mark as `status: 'processed'`. On failure, mark as `status: 'failed'` with error details and retry later.

    **Why this pattern**:
    - Returning 200 quickly prevents the provider from retrying (which would create duplicate processing if your endpoint is slow).
    - If processing fails, the webhook is safely stored and can be retried from your persistent store, without depending on the provider's retry mechanism.
    - Processing is decoupled from the HTTP request lifecycle — long-running processing does not hold open connections.

    **Webhook storage table**:
    ```sql
    CREATE TABLE inbound_webhooks (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider        VARCHAR(50) NOT NULL,
        event_type      VARCHAR(100) NOT NULL,
        external_id     VARCHAR(255),         -- Provider's event ID (for deduplication)
        payload         JSONB NOT NULL,
        headers         JSONB,
        status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, processing, processed, failed
        attempts        INTEGER NOT NULL DEFAULT 0,
        last_error      TEXT,
        received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        processed_at    TIMESTAMPTZ,
        UNIQUE (provider, external_id)       -- Deduplication
    );

    CREATE INDEX idx_webhooks_pending ON inbound_webhooks(status, received_at)
        WHERE status IN ('pending', 'failed');
    ```

18. **Design webhook signature verification.** Never process a webhook without verifying it came from the claimed provider. Without verification, an attacker can send fake webhooks to your endpoint and manipulate your system's state:

    **Stripe** — HMAC-SHA256 of the payload:
    ```
    Stripe-Signature: t=1705312200,v1=signature_hash
    ```
    - Compute `HMAC-SHA256(timestamp + "." + raw_payload, webhook_secret)`.
    - Compare to the `v1` signature using constant-time comparison.
    - Verify the timestamp is within tolerance (± 5 minutes) to prevent replay attacks.
    - Use Stripe's SDK `constructEvent()` function which handles all of this.

    **General HMAC verification pattern**:
    - Most providers follow a similar pattern: HMAC-SHA256 of the raw body with a shared secret, signature in a header.
    - **Critical**: Use the raw request body bytes for signature computation, not a parsed/reserialized version. JSON parsing and reserialization may change key order or whitespace, which changes the hash. Read the raw body, verify the signature, then parse the JSON.
    - **Constant-time comparison**: Use a constant-time comparison function (e.g., `crypto.timingSafeEqual` in Node.js, `hmac.compare_digest` in Python) to prevent timing attacks on the signature.

    **Webhook secret management**:
    - Store webhook secrets in a secrets manager (not in code or environment variables).
    - Rotate webhook secrets periodically. Most providers support multiple active secrets during rotation (old and new secret both valid).

19. **Design webhook idempotency.** Webhook providers retry failed deliveries, and network issues can cause duplicate deliveries. Your webhook processor must be idempotent:

    - **Deduplication by provider event ID**: Most providers include a unique event ID in the webhook payload (`event.id` in Stripe, `messageId` in SendGrid). Use the unique constraint `(provider, external_id)` to detect and skip duplicates.
    - **Processing idempotency**: Even if deduplication by event ID misses a duplicate (race condition between two concurrent deliveries), the processing logic itself must be idempotent. Use the same idempotency strategies as message consumers (see messaging skill, step 14): idempotency key store, upsert operations, version checking.
    - **Out-of-order webhooks**: Webhooks may arrive out of order (e.g., `payment.succeeded` arrives before `payment.created`). Design processing to handle this: check the event timestamp, check the entity's current state, and process only if the event represents a forward state transition. If the event is out of order, either process it conditionally or store it and process when the prerequisite event arrives.

20. **Design webhook failure handling and reconciliation.** Webhooks can be lost (provider outage, your endpoint was down, signature verification bug). Design for missed webhooks:

    **Provider retry monitoring**:
    - Most providers retry failed webhook deliveries with exponential backoff (Stripe: up to 3 days of retries). Monitor your webhook endpoint's availability to minimize missed deliveries.
    - If your endpoint was down for an extended period, check the provider's webhook event log (most providers offer one) to identify missed events.

    **Polling-based reconciliation** (critical for important integrations):
    - In addition to webhooks, periodically poll the external API to verify that your local state matches the external state:
      - Example: Every 15 minutes, query Stripe for recent payment intents and compare their status to your local payment records. If any are out of sync, process the missed updates.
      - This catches: missed webhooks, out-of-order webhooks that were not processed, and data corruption.
    - Run reconciliation less frequently than webhooks (every 15-60 minutes) to avoid excessive API calls.
    - Alert when reconciliation finds discrepancies — it indicates webhook processing problems.

    **Dead-letter processing for failed webhooks**:
    - Webhooks that fail processing after all retries go to the `failed` status in the webhook table.
    - Alert on failed webhooks. Investigate the root cause (bug in processing logic, external data format change, data integrity issue).
    - After fixing the root cause, replay failed webhooks from the stored payloads.
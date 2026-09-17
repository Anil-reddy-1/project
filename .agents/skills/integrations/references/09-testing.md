# Phase 9: Testing Integrations

24. **Design the integration testing strategy.** Testing external integrations is challenging because external APIs are not under your control. Layer your tests:

    **Layer 1: Unit tests with mocks (fast, reliable, run on every commit)**:
    - Mock the HTTP client or the integration interface (step 6) to return predefined responses.
    - Test: data mapping (internal model ↔ external model), error handling (mock 4xx, 5xx, timeout responses), retry logic (mock transient failures followed by success), circuit breaker behavior (mock consecutive failures), idempotency logic (mock duplicate webhook delivery), rate limit handling (mock 429 responses).
    - **Mock the interface, not the HTTP layer**: If using the ACL pattern (step 6), mock the `PaymentGateway` interface, not the HTTP client. This tests the business logic's integration with the adapter interface, not the adapter's HTTP implementation.
    - **Adapter unit tests**: Separately test each adapter by mocking the HTTP client. Verify: correct URL construction, correct request body serialization, correct header setting, correct response deserialization, correct error mapping.

    **Layer 2: Integration tests with sandbox (slower, run in CI, catch real API issues)**:
    - Use the external API's sandbox/test environment (Stripe test mode, SendGrid sandbox, PayPal sandbox) to test actual API communication.
    - Test: authentication works, request format is accepted, response format matches expectations, webhook delivery and processing.
    - **Sandbox limitations**: Sandboxes may not perfectly replicate production behavior (different rate limits, missing features, different error scenarios). Document known sandbox limitations and compensate with unit tests for scenarios the sandbox cannot test.
    - **Test data management**: Use test-specific data that does not interfere with other developers or CI runs. Many APIs provide test-specific identifiers (Stripe test card numbers, sandbox-specific accounts).
    - **Network dependency**: These tests depend on the external API being available. Handle test failures due to external API outage gracefully — mark as flaky/retry, do not block the entire CI pipeline for an external API outage.

    **Layer 3: Contract tests (catch external API changes)**:
    - Record the expected request/response format for each external API interaction (using tools like Pact, WireMock recordings, or custom schema definitions).
    - Periodically run contract verification against the real sandbox API to detect if the API's behavior has changed from what you expect.
    - **This catches**: Field renames, type changes, new required fields, deprecated endpoints, and behavior changes that would break your integration.
    - Run contract tests nightly or weekly, not on every commit (to avoid flakiness from external API instability).

    **Layer 4: End-to-end tests in staging (catch integration flow issues)**:
    - Test complete business flows that involve external integrations in a staging environment:
      - Place an order → payment processed via Stripe (test mode) → confirmation email sent via SendGrid (sandbox) → shipping label created via Shippo (test mode).
    - Verify the end-to-end data flow: internal records are created, external IDs are recorded, webhooks are processed, and the final state is correct.
    - Run as part of the deployment pipeline before production deployment.

    **Test doubles for local development**:
    - Provide mock/stub implementations of integration interfaces for local development: `MockPaymentGateway` that always returns success, `ConsoleEmailService` that prints emails to the console.
    - Local development should not require access to external API sandboxes — this adds network dependency and potential cost.
    - Use environment-based adapter selection: `PAYMENT_ADAPTER=mock` in development, `PAYMENT_ADAPTER=stripe` in staging/production.

25. **Design integration simulation for failure testing.** Proactively test failure scenarios:

    - **Chaos testing**: Inject failures into the integration layer:
      - Simulate external API timeout (add artificial delay).
      - Simulate external API returning 500 errors.
      - Simulate rate limiting (return 429 after N requests).
      - Simulate circuit breaker opening (disable the external API endpoint).
    - **Verify**: The application handles each failure scenario gracefully — returns meaningful error to the user (or fallback), retries appropriately, circuit breaker engages and disengages correctly, no data corruption, no duplicate operations.
    - **Tools**: Use a proxy (Toxiproxy, Envoy fault injection) between your application and the external API to inject failures. Or use feature flags to force the adapter into error states.
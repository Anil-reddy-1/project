# Phase 2: Integration Architecture Design

5. **Design the integration architecture pattern.** Select the pattern for each integration based on its characteristics:

   **Pattern 1: Synchronous API call (request-response)** — for real-time operations:
   - Your service calls the external API and waits for the response before continuing.
   - **When to use**: The calling operation cannot proceed without the external API's response (payment authorization, identity verification, real-time pricing, address validation). The external API is fast (< 1-2 seconds p95) and reliable.
   - **Risks**: Your service's latency includes the external API's latency. Your service's availability is limited by the external API's availability. A slow external API blocks your threads/connections.
   - **Mitigations**: Timeouts, circuit breakers, fallbacks, bulkhead isolation (Phase 4).
   - **Implementation**: HTTP client call within the request handler, with timeout and error handling. Return a meaningful response to the user if the external call fails.

   **Pattern 2: Asynchronous fire-and-forget** — for non-blocking operations:
   - Your service queues the external API call for background processing. The user-facing request completes immediately without waiting for the external call.
   - **When to use**: The external operation is not needed for the immediate response (sending notifications, syncing data to CRM, triggering analytics events, generating reports).
   - **Implementation**: Publish a message to a queue (SQS, RabbitMQ) or event stream (Kafka). A background worker consumes the message and calls the external API. Retry on failure.
   - **Advantages**: User-facing latency is unaffected by external API performance. External API downtime does not impact your user experience. Retries are automatic.
   - **Design**: Use the transactional outbox pattern if the external call must happen reliably after a database write (see messaging skill, step 15).

   **Pattern 3: Webhook consumption (inbound events)** — for receiving state changes:
   - The external system calls your API endpoint when events occur (payment completed, shipment status changed, user updated in IdP).
   - **When to use**: The external system pushes notifications about state changes that your system needs to react to. Polling the external API would be inefficient.
   - **Design**: Covered in detail in Phase 6.

   **Pattern 4: Polling** — when webhooks are not available:
   - Your service periodically calls the external API to check for changes.
   - **When to use**: The external API does not support webhooks, or webhook delivery is unreliable and polling provides a more reliable source of truth.
   - **Design**: A scheduled job (cron, Kubernetes CronJob, CloudWatch Events) that calls the external API, compares results with local state, and processes changes. Track the last poll timestamp or cursor to avoid reprocessing.
   - **Frequency**: Balance between freshness (poll every 30 seconds for near-real-time) and API quota consumption (poll every 15 minutes for rate-limited APIs). Respect the external API's rate limits.
   - **Combine with webhooks**: Use webhooks for real-time notification and polling as a reconciliation mechanism. The poller catches any events missed by webhooks.

   **Pattern 5: Batch/bulk exchange** — for large data volumes:
   - Exchange large datasets with the external system via file transfer or bulk API.
   - **When to use**: Large data synchronization (bulk customer import to CRM, daily report export, batch payment file processing), when per-record API calls would exceed rate limits or be too slow.
   - **Implementation**: Generate a file (CSV, JSON Lines, Parquet), upload to a shared location (S3 signed URL, SFTP), or call a bulk API endpoint. Process the external system's bulk response file.
   - **Design considerations**: Chunking (break large files into manageable chunks), progress tracking, error reporting (per-record success/failure), and idempotency (re-uploading the same batch should not create duplicates).

   **Pattern 6: Event-driven integration** — for decoupled data flow:
   - Your system publishes internal domain events. An integration adapter subscribes to these events and translates them into external API calls.
   - **When to use**: When the external system integration should be decoupled from the core business logic. Multiple external systems need to react to the same internal events (order placed → Stripe payment + SendGrid email + Shippo shipping).
   - **Implementation**: Internal event bus (Kafka, SQS) → integration adapter service → external API call. The adapter handles authentication, data mapping, retries, and error handling for the specific external system.
   - **Advantages**: Core business logic is unaware of external integrations. Adding/removing/replacing external integrations does not modify core services. Each integration can have its own retry and error handling policy.

   For each integration in the catalog (step 2), assign the pattern and justify it.

6. **Design the integration abstraction layer.** Never scatter external API calls directly throughout your application code. Create an abstraction layer that isolates external dependencies:

   **Anti-Corruption Layer (ACL)** — the primary integration design pattern:
   - An ACL is a boundary layer that translates between your internal domain model and the external system's model. It prevents the external system's concepts, naming, and data structures from "corrupting" your internal architecture.
   - **Structure**:
     ```
     Your Service
       └── Integration Layer (ACL)
             ├── PaymentGateway (interface/port)
             │     ├── StripePaymentGateway (adapter)
             │     └── MockPaymentGateway (test adapter)
             ├── EmailService (interface/port)
             │     ├── SendGridEmailService (adapter)
             │     └── ConsoleEmailService (dev adapter)
             └── ShippingProvider (interface/port)
                   ├── ShippoShippingProvider (adapter)
                   └── FlatRateShippingProvider (fallback)
     ```
   - **Interface/port**: Defines operations in your domain's language (`processPayment(order, amount)`, `sendOrderConfirmation(order, customer)`). Your core business logic calls these interfaces.
   - **Adapter**: Implements the interface using the specific external API. Handles: authentication, request construction, data mapping (internal model → external model and back), HTTP communication, error translation (external errors → internal error types), and logging.
   - **Benefits**:
     - **Vendor replaceability**: Switching from Stripe to Adyen requires writing a new adapter, not rewriting business logic.
     - **Testability**: Mock/stub the interface in tests without calling the real external API.
     - **Isolation**: External API changes (field renames, schema changes) are contained in the adapter, not scattered across your codebase.
     - **Consistent error handling**: The adapter translates vendor-specific errors into your domain's error types.

   **Adapter implementation rules**:
   - Each adapter owns its own HTTP client configuration, authentication, and serialization logic.
   - Adapters must never expose external API DTOs (data transfer objects) to the rest of the application. Map to internal domain objects.
   - Adapters must never throw external-API-specific exceptions to the rest of the application. Translate to domain-specific exceptions (`PaymentDeclinedException`, `ExternalServiceUnavailableException`).
   - Adapters must log all external API interactions with correlation IDs (step 27).
   - Adapters must handle all retry and circuit breaker logic internally (step 12-13).

7. **Design data mapping between internal and external models.** The external API's data model will not match your internal model. Design explicit mapping:

   **Mapping principles**:
   - **Map at the adapter boundary**: All mapping happens in the integration adapter, never in business logic.
   - **Map explicitly, not implicitly**: Write explicit mapping functions (`toStripePaymentIntent(internalOrder)`, `fromStripePaymentIntent(stripeResponse)`). Do not rely on automatic serialization that maps fields by name — external fields will have different names, different types, different semantics.
   - **Handle missing and extra fields**: External APIs return fields you don't need (ignore them). External APIs may not return fields you expect (handle gracefully with defaults or errors). Your adapter must be resilient to the external response having more or fewer fields than expected.
   - **Validate external data**: Never trust data from external systems. Validate types, ranges, and required fields in the adapter before passing to business logic. An external API returning `null` for a required field should be caught at the adapter boundary, not cause a NullPointerException deep in business logic.
   - **Normalize external data**: Convert external data to your internal conventions:
     - Currency: External API uses `"usd"`, your system uses `"USD"`. Normalize.
     - Dates: External API uses `"01/15/2024"`, your system uses ISO 8601 `"2024-01-15T00:00:00Z"`. Convert.
     - Money: External API uses `"14.99"` (string), your system uses `1499` (integer cents). Convert.
     - Status: External API uses `"paid"`, your system uses `"payment_completed"`. Map to internal enum.
     - IDs: Store the external system's ID alongside your internal ID for correlation: `{ internal_id: "ord_123", stripe_payment_id: "pi_abc123" }`.

   **Mapping error handling**:
   - If mapping fails (unexpected data format, missing required field, invalid value), log the raw external response (with sensitive fields redacted), return a clear error, and do not proceed with corrupt data.

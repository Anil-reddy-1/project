# Phase 16: Integration Architecture Output and Deliverables

36. **Produce integration architecture deliverables.** At the conclusion of every integration design engagement, produce:

    - **Integration architecture summary**: A concise document stating the integration landscape, external dependencies, integration patterns, and key design decisions.
    - **Integration catalog**: The complete table from step 2 with all integration touchpoints, directions, patterns, criticality, and frequency.
    - **Integration architecture diagram**: Visual showing all external systems, data flows, integration patterns (sync/async/webhook), and internal components involved. Include trust boundaries.
    - **Anti-corruption layer design**: Interface definitions (ports) and adapter structure for each external system. Class/module organization in the codebase.
    - **Data mapping specification**: Field-level mapping between internal domain models and each external API's data model.
    - **Resilience design**: Per-integration timeout, retry policy, circuit breaker configuration, fallback behavior, and bulkhead isolation. Document in a table:

      | Integration | Timeout | Retries | Circuit Breaker | Fallback |
      |---|---|---|---|---|
      | Stripe | 5s | 3 (exponential) | Open after 5 failures/60s | Return error to user |
      | SendGrid | 10s | 5 (exponential) | Open after 10 failures/60s | Queue for retry |
      | Shippo | 10s | 3 (exponential) | Open after 5 failures/60s | Cached rates / flat rate |

    - **Webhook processing design**: Webhook endpoint design, signature verification method per provider, storage schema, processing pipeline, idempotency mechanism, and DLQ handling.
    - **Authentication design**: Auth method per integration, credential storage location, token refresh mechanism, and rotation schedule.
    - **Data synchronization design** (if applicable): Sync direction, sync mechanism, conflict resolution strategy, and reconciliation schedule.
    - **Testing strategy**: Test layers (unit/sandbox/contract/e2e), test double approach for local development, and sandbox configuration.
    - **Observability specification**: Per-integration metrics, dashboards, alerting thresholds, health check design, and runbooks.
    - **Cost estimate**: Per-integration API cost estimate at current and projected volume, total integration cost, and optimization strategies.
    - **Compliance documentation**: Data shared with each external system, DPA status, data residency, and deletion procedures.
    - **Vendor evaluation and replaceability assessment**: Per-integration lock-in level, alternative vendors evaluated, and migration complexity estimate.
    - **ADRs for integration decisions**: For each significant decision (vendor selection, integration pattern, sync direction, fallback strategy), a decision record with context, decision, alternatives considered, and consequences.
    - **Open questions**: Areas requiring vendor clarification, stakeholder input on fallback behavior, compliance review, or cost budget approval.
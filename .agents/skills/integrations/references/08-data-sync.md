# Phase 8: Data Synchronization

22. **Design data synchronization patterns.** When your system must keep data in sync with an external system:

    **One-way sync (your system → external)**:
    - Your system is the source of truth. Changes in your system are pushed to the external system.
    - **Event-driven push**: Internal domain events trigger external API updates. Example: Customer record updated → event published → integration adapter calls CRM API to update the customer.
    - **Batch sync**: Periodically export changed records and push to the external system. Use a `last_synced_at` timestamp or change tracking to identify records that changed since the last sync.
    - **Conflict**: No conflict — your system is authoritative. If the external update fails, retry. If the external system has a different value (due to manual editing in the external system), your next sync will overwrite it (decide if this is acceptable or if external edits should be preserved).

    **One-way sync (external → your system)**:
    - The external system is the source of truth. Changes in the external system are pulled or pushed to your system.
    - **Webhook-driven**: The external system sends webhooks when data changes. Your system processes the webhook and updates local state.
    - **Polling**: Your system periodically polls the external API for changes (using a `since` parameter, cursor, or last-modified timestamp).
    - **Conflict**: No conflict — the external system is authoritative.

    **Two-way sync (bidirectional)**:
    - Both systems can modify the data. Changes in either system must be propagated to the other.
    - **This is the most complex synchronization pattern.** Avoid it if possible. If you must implement it:
    - **Conflict detection**: When syncing a change from system A to system B, check if system B has also changed the record since the last sync. Use timestamps, version numbers, or change tokens.
    - **Conflict resolution strategy** (define explicitly):
      - **Last-write-wins**: The most recent change (by timestamp) wins. Simple, but can lose data if timestamps are inaccurate or clocks are skewed.
      - **Source-of-truth wins**: Designate one system as authoritative for each field or record. Example: CRM is authoritative for customer name and email; your system is authoritative for account status and billing.
      - **Merge**: Merge non-conflicting field changes from both systems. Only flag true conflicts (both systems changed the same field) for manual resolution.
      - **Manual resolution**: Flag conflicts for human review. Store both versions until resolved.
    - **Sync state tracking**: Maintain a sync log that records: what was synced, when, direction, outcome (success, conflict, error). This is essential for debugging sync issues.

    **Sync table design**:
    ```sql
    CREATE TABLE sync_records (
        id              UUID PRIMARY KEY,
        entity_type     VARCHAR(50) NOT NULL,
        internal_id     UUID NOT NULL,
        external_system VARCHAR(50) NOT NULL,
        external_id     VARCHAR(255),
        sync_direction  VARCHAR(20) NOT NULL,  -- inbound, outbound
        sync_status     VARCHAR(20) NOT NULL,  -- pending, synced, conflict, error
        last_synced_at  TIMESTAMPTZ,
        last_error      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (entity_type, internal_id, external_system)
    );
    ```

23. **Design sync error handling.** Synchronization failures are inevitable. Design for them:

    - **Transient errors**: Network failures, rate limits, external API temporary errors. Retry with backoff.
    - **Data validation errors**: The external API rejects the data (invalid field, missing required field). Log the error with the offending data, alert, and skip the record (do not block the entire sync). Fix the data and resync the failed record.
    - **Mapping errors**: The external API's schema changed (new required field, field type change). Alert immediately — this requires code changes.
    - **Partial sync failures**: In batch sync, some records succeed and some fail. Track per-record status. Retry only failed records.
    - **Sync lag monitoring**: Track the time between a change in the source system and its propagation to the target system. Alert when sync lag exceeds the defined SLA (e.g., customer data should sync to CRM within 5 minutes).
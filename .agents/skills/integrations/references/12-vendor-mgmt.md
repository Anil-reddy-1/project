# Phase 12: Vendor Management and Migration

30. **Design for vendor replaceability.** External vendors change pricing, deprecate APIs, degrade in quality, or go out of business. Design every integration to be replaceable:

    **Abstraction layer** (step 6): The ACL/adapter pattern is the primary mechanism. If you can swap the adapter without changing business logic, you can swap the vendor.

    **Vendor lock-in assessment per integration**:
    - **Low lock-in**: The vendor provides a commodity service (email, SMS, address validation) with many alternatives that offer equivalent APIs. Switching cost: write a new adapter (days to weeks).
    - **Medium lock-in**: The vendor provides specialized services with some unique features. Data stored in the vendor's system needs migration. Switching cost: new adapter + data migration (weeks to months).
    - **High lock-in**: The vendor's proprietary data format, workflow, or ecosystem is deeply embedded. Significant business logic depends on vendor-specific features. Switching cost: major refactoring (months).

    **Minimize lock-in**:
    - Do not use vendor-specific features that have no equivalent in alternative vendors unless the feature provides significant business value.
    - Store the canonical version of data in your database, not only in the vendor's system. If the vendor is your only copy of customer data, you are locked in.
    - Use standard protocols when possible (SMTP for email, standard OAuth for auth, standard shipping API formats) rather than proprietary APIs.
    - Document the vendor-specific assumptions in each adapter for easy identification during migration.

31. **Design vendor migration procedures.** When migrating from one vendor to another:

    **Migration strategy**:
    1. **Build the new adapter**: Implement the new vendor's adapter behind the same interface.
    2. **Test in sandbox**: Validate the new adapter against the new vendor's sandbox.
    3. **Shadow traffic**: Route a copy of production requests to the new vendor (in addition to the existing vendor). Compare results. Do not act on the new vendor's results — only validate them.
    4. **Gradual rollover**: Route a percentage of traffic to the new vendor (feature flag or weighted routing). Monitor error rates, latency, and data accuracy. Gradually increase the percentage.
    5. **Full cutover**: Route all traffic to the new vendor. Keep the old vendor's adapter in the codebase for quick rollback.
    6. **Decommission**: After a confidence period (2-4 weeks), remove the old adapter and cancel the old vendor's account.

    **Data migration**: If the old vendor holds data (CRM records, payment methods, stored files), migrate data before or during the cutover:
    - Export from the old vendor (API or bulk export).
    - Transform to the new vendor's format.
    - Import to the new vendor (API or bulk import).
    - Verify data integrity (record counts, spot-check comparisons).

    **Historical data**: Decide whether historical records (past payments, past emails) reference the old vendor's IDs. These records will remain in your database — the old vendor's adapter may need to remain for read-only access to historical data.
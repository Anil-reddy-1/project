# Phase 13: Cost Management for Paid APIs

32. **Design API cost tracking and optimization.** Many external APIs charge per request, per transaction, or per data volume:

    **Cost tracking**:
    - Track API call volume per integration per day/month: `SELECT provider, date_trunc('month', created_at), count(*) FROM external_api_calls GROUP BY 1, 2`.
    - Calculate estimated cost based on the provider's pricing model. Include in the integration dashboard.
    - Alert when projected monthly cost exceeds budget thresholds (80%, 100% of budget).
    - Track cost per customer/tenant for SaaS applications where integration costs scale with tenant usage.

    **Cost optimization strategies**:
    - **Caching**: Cache responses from paid APIs when freshness is not critical (address validation results, exchange rates, shipping rates). One cached API call replacing 100 repeated calls is a 99% cost reduction.
    - **Batching**: Use batch endpoints when available (send 100 records in one API call instead of 100 individual calls). Many APIs offer batch endpoints at reduced per-record pricing.
    - **Deduplication**: Before making an external API call, check if the same request was recently made (hash the request parameters, check a short-lived cache). Avoid duplicate calls for the same data within a short window.
    - **Right-sizing**: Use the lowest-cost tier/plan that meets your requirements. Review usage quarterly and adjust.
    - **Volume negotiation**: For high-volume integrations, negotiate volume discounts with the provider.
    - **Alternative providers**: Periodically evaluate alternative providers for cost comparison. The cheapest provider today may not be the cheapest next year.

    **Cost anomaly detection**:
    - Alert on sudden spikes in API call volume (may indicate a bug causing excessive calls, a retry loop, or a DOS amplification through your integration).
    - Alert on unexpected cost increases (provider price change, plan change, or usage growth exceeding projections).
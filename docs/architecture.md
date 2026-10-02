# Architecture and tradeoffs

## Current boundaries
`Dataset -> aggregate -> Overview` is independent of `train sessions -> fit -> recommend -> RecommendationLab`. `evaluate` consumes frozen train state and held-out app sets, then creates an immutable JSON artifact for the evaluation screen. Core modules do not import React, browser storage or network APIs. Browser and CLI use the same core code.

Events contain numeric IDs, synthetic user/app IDs, day indices, minutes and function indices. No real identifiers, financial balances or transactions. Raw events are generated in memory rather than transferred from a server. Persisted local state contains only three bounded model-control weights.

## Complexity
With E events, U users, A apps and D dimensions, fitting is O(E + A²U) using visitor sets. Ranking is O(AH + KA D), where H is a user's used-app count and K requested results. A=8 and D=5 here; this representation deliberately favors inspectability rather than claiming large-scale serving.

## Why these choices
- Binary co-usage similarity is interpretable and cheap on a small catalogue; it loses intensity and sequence information.
- Recency decay captures current habits without introducing a learned sequence model; 28 days is a fixed design choice, not a fitted optimum.
- Greedy diversity penalizes redundant categories and exposes its rank score; it can trade a little relevance for variety.
- A chronological freeze matches future prediction and prevents cross-user leakage; a single split cannot establish stability across seasons.
- Node native tests reduce framework overhead. Playwright checks visible browser behavior on production assets, including captions, font requests, CSV, keyboard, filters and exclusions.
- No history paths or client-side router are needed for three workspace views, so direct static creation does not depend on rewrite configuration.

## Production extension boundaries
1. Ingestion validates a versioned event schema, consent purpose, IDs, timestamp limits and duplication before durable storage.
2. A batch job materializes daily/app/cohort aggregates. Explicit UTC boundaries and event-time watermarks handle late arrivals.
3. Separate offline fitting creates versioned train artifacts and feature snapshots. A sparse representation replaces set overlap as the catalogue grows.
4. A serving API applies availability/eligibility rules, gets the correct user state, ranks, and emits impression IDs with model/version/contribution history.
5. Evaluation replays frozen features, checks exposure bias, uses multiple temporal folds and follows with an appropriately randomized online experiment.

These are design considerations, not components implemented or benchmarked in this demo. The existing high-throughput event platform repository can demonstrate the separate backend ingestion problem without pretending this static project contains that infrastructure.

## Failure handling
Optional localStorage is guarded. Corrupt stored weights are discarded. Evaluation report errors expose retry. No-event analytics returns zero values and null retention. No eligible recommendation renders an empty state. Dialogs use native focus trapping and Escape; fonts are self-hosted; no external runtime requests are required.

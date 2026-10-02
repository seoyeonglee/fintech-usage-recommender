# Model card

## Intended use
A demonstration of product analytics and explainable app-usage ranking on synthetic data. Fictional app identities and capabilities are fixed in catalog.ts. No investment, credit, insurance or bank-product suitability decisions.

## Dataset and evaluation
320 synthetic users across four cohorts, eight apps, five function dimensions and 84 days ending 2026-09-30. The generator creates heterogeneous start days, preference vectors, latent app availability, repeated use, weekend effects, and 20 users who arrive after the train cutoff. Seed 2401. The same known capability relationships used by the generator are visible to the ranker; favorable content metrics are expected and cannot demonstrate real-world generalization.

Train events have day < 70. Test events have day >= 70. Global freeze prevents another user's future co-usage leaking into the model. Relevance means at least one test-period session for an app; repeated apps are eligible. The novel-app switch is an interactive feature and is not the offline benchmark's candidate policy.

Precision@3: relevant returned items / 3, including missing slots as misses. Recall@3: relevant returned items / all held-out relevant apps. NDCG@3 uses binary relevance and log2(rank+1) discount. Coverage is distinct recommended apps across all evaluated users / 8. Three baselines share train data and user cohort. No hyperparameter tuning uses this test set. Bootstrap intervals use 300 seeded user resamples; they are sampling uncertainty conditional on this generator, not market uncertainty. No statistical significance test of model differences is claimed.

## Ranking and explanations
Content uses a 28-day e-folding recency decay and log1p(session minutes) to aggregate five function dimensions. Cold-start content uses declared preferences. Collaborative scoring averages item-to-item binary visitor cosine similarities using log1p(decayed session count), excluding candidate self-affinity. Popularity counts unique train visitors. Contributions use normalized 55/30/15 weights and sum exactly to the suitability score; this is not a probability. The greedy diversity rank score subtracts 0.12 × maximum similarity to previously selected items. Therefore raw suitability need not monotonically decrease with displayed rank. Explanations reflect the largest weighted contribution, and a zero-evidence result explicitly states its default order.

## Limitations and risks
No actual registration data, verified demographics, economics, eligibility or app quality. Cohort labels represent simulated behavior, not protected attributes. Small catalogue and known latent relationships make the task unusually easy. A production system needs representative consented data, input contracts and deduplication, item eligibility/availability, logged impressions to correct exposure bias, time-based revalidation, fairness slices, and randomized product evaluation. Offline relevance metrics cannot establish conversion, satisfaction, revenue or causality.

## Performance interpretation
Timing is Node warm-process recommend(k=3) for 320 users × 10 passes after warmup. It excludes network, browser rendering, concurrent traffic and cold-start fit. Environment and sample counts are in evaluation.json. It is neither a load test nor a service SLA.

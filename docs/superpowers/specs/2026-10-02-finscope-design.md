# FinScope: fintech usage intelligence

## Approved brief
Build a public, recruiter-facing fintech app usage comparison and recommendation demo. The user approved the in-chat design on 2026-10-02 and explicitly requested implementation, live deployment, and screenshots in GitHub. Publishing this new repository is authorized. Render destination: the My Workspace discussed with the approved design.

## Experience
Korean-first, responsive analytics workspace with three views: usage overview, recommendation lab, and evaluation. Cream canvas, forest-green navigation, readable charts and accessible controls. No login. Every number in the overview is calculated from deterministic synthetic sessions, not a hardcoded dashboard.

## Data and engine
Eight fictional fintech apps with five capability dimensions; 320 synthetic users in four cohorts; 84 days ending 2026-09-30. Seed 2401. No bank connections, actual financial product data, or external AI APIs. Recommendations combine cosine content similarity, item-to-item co-usage similarity, and train-only popularity, followed by a diversity reranker. Explanations expose normalized weighted contributions. Cold-start uses declared interests and population statistics. Allow live weight changes, profile selection, and excluding previously used apps.

## Analytics
Period and cohort filters affect every KPI, chart, and comparison table. Show active users, sessions, minutes, sessions per user and first-observed D7 retention with matured-user denominator. Comparison supports two or three apps. Empty filters display a useful empty state. CSV export reflects the current filters.

## Evaluation and evidence
Global chronological split: first 70 days train, last 14 days holdout. No holdout events can alter fitted popularity or item similarities. Compare popularity, content-only and hybrid models at K=3 with Precision, Recall, NDCG and catalogue coverage; report cohort and cold-start slices. Ground truth is any app with a held-out session, including previously used apps; explicitly distinguish this from novel-app discovery. Report seeded bootstrap NDCG confidence intervals and warm-process local latency without representing them as production SLAs or business uplift. Commit reproducible JSON, dataset fingerprint, tests, CI, screenshots and tradeoffs.

## Deployment and cost
React + TypeScript + Vite single static application. Recommendation and aggregation run in the browser. Render Static Site, no server/database/API/key/domain purchase. Use onrender.com. Build with npm ci and npm run build; publish dist. Static hosting counts against existing workspace bandwidth/build allowances; confirm available safeguards or report a deployment blocker rather than claim zero future metering.

## Acceptance
Typecheck, engine/analytics tests, reproducible evaluation and production build pass. Browser checks cover filters, navigation, recommendation changes, exclusion, export and mobile overflow. Public root and report return 200 if deployment is authorized within the free constraint. README begins with demo and screenshot, then explains architecture, model, measured evaluation, run commands, limitations and the distinction from the audit repository.

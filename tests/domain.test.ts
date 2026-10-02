import test from "node:test";
import assert from "node:assert/strict";
import { generateDataset } from "../src/domain/dataset.js";
import { apps } from "../src/domain/catalog.js";
import { aggregate } from "../src/domain/analytics.js";
import { fit, recommend, normalizeWeights } from "../src/domain/recommender.js";
import { rankingMetrics } from "../src/domain/metrics.js";
import type { Session } from "../src/domain/types.js";

test("seeded generation is reproducible and different seeds change sessions", () => {
  const a = generateDataset(2401),
    b = generateDataset(2401),
    c = generateDataset(2402);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.sessions, c.sessions);
  assert.equal(a.users.length, 320);
  assert.equal(apps.length, 8);
  assert.ok(a.sessions.length > 10000);
  assert.ok(a.sessions.every((s) => s.day >= 0 && s.day < 84 && s.minutes > 0));
});
test("generation preserves referential integrity and finite declared preferences", () => {
  const d = generateDataset(2401);
  const ids = new Set(d.users.map((u) => u.id));
  assert.ok(
    d.sessions.every(
      (s) => ids.has(s.userId) && apps.some((a) => a.id === s.appId),
    ),
  );
  assert.ok(
    d.users.every((u) =>
      u.interests.every((n) => Number.isFinite(n) && n >= 0),
    ),
  );
});
test("cohort and period filters affect counts and every daily bucket", () => {
  const d = generateDataset(2401);
  const filter = { days: 7, cohort: "global" };
  const a = aggregate(d.sessions, d.users, filter);
  const ids = new Set(
    d.users.filter((u) => u.cohort === "global").map((u) => u.id),
  );
  const expected = d.sessions.filter((s) => s.day >= 77 && ids.has(s.userId));
  assert.equal(a.totalSessions, expected.length);
  assert.equal(a.activeUsers, new Set(expected.map((s) => s.userId)).size);
  assert.equal(a.daily.length, 7);
  assert.equal(
    a.daily.reduce((n, s) => n + s.sessions, 0),
    expected.length,
  );
});
test("empty analytics returns zero KPIs and complete chart buckets without NaN", () => {
  const a = aggregate([], [], { days: 28, cohort: "all" });
  assert.equal(a.activeUsers, 0);
  assert.equal(a.minutes, 0);
  assert.equal(a.daily.length, 28);
  assert.ok(
    a.apps.every(
      (app) => app.sessionsPerUser === 0 && app.d7Retention === null,
    ),
  );
});
test("D7 denominator includes matured first observations, excludes immature users", () => {
  const s: Session[] = [
    { id: 1, userId: "a", appId: "flow", day: 50, minutes: 2, feature: 0 },
    { id: 2, userId: "a", appId: "flow", day: 57, minutes: 2, feature: 0 },
    { id: 3, userId: "b", appId: "flow", day: 51, minutes: 2, feature: 0 },
    { id: 4, userId: "c", appId: "flow", day: 81, minutes: 2, feature: 0 },
  ];
  const users = ["a", "b", "c"].map((id) => ({
    id,
    label: id,
    cohort: "professional",
    interests: [1, 0, 0, 0, 0],
  }));
  const a = aggregate(s, users, { days: 84, cohort: "all" }).apps.find(
    (a) => a.app.id === "flow",
  )!;
  assert.equal(a.retentionEligible, 2);
  assert.equal(a.d7Retention, 0.5);
});
test("ranking metrics match a hand-calculated list", () => {
  const m = rankingMetrics(["a", "x", "b"], new Set(["a", "b", "c"]), 3);
  assert.equal(m.precision, 2 / 3);
  assert.equal(m.recall, 2 / 3);
  assert.ok(
    Math.abs(
      m.ndcg -
        (1 + 1 / Math.log2(4)) / (1 + 1 / Math.log2(3) + 1 / Math.log2(4)),
    ) < 1e-12,
  );
});
test("short ranking counts missing slots as misses and empty ground truth scores zero", () => {
  assert.equal(rankingMetrics(["a"], new Set(["a"]), 3).precision, 1 / 3);
  assert.deepEqual(rankingMetrics([], new Set(), 3), {
    precision: 0,
    recall: 0,
    ndcg: 0,
  });
});
test("invalid weights are safe and zero weights use a content fallback", () => {
  assert.deepEqual(
    normalizeWeights({ content: 0, collaborative: 0, popularity: 0 }),
    { content: 1, collaborative: 0, popularity: 0 },
  );
  const w = normalizeWeights({
    content: NaN,
    collaborative: -2,
    popularity: 3,
  });
  assert.deepEqual(w, { content: 0, collaborative: 0, popularity: 1 });
});
test("large finite weights retain a unit sum without overflow", () => {
  const w = normalizeWeights({
    content: 1e308,
    collaborative: 1e308,
    popularity: 1e308,
  });
  assert.ok(Math.abs(w.content + w.collaborative + w.popularity - 1) < 1e-12);
  assert.equal(w.content, 1 / 3);
});
test("popularity-only explanations never claim interest evidence", () => {
  const d = generateDataset(2401),
    m = fit(d.sessions.filter((s) => s.day < 70));
  const r = recommend(m, d.users[0], {
    weights: { content: 0, collaborative: 0, popularity: 1 },
  });
  assert.ok(
    r.every(
      (r) => r.reason.includes("고유 이용자") && !r.reason.includes("성향"),
    ),
  );
});
test("zero evidence reports an explicit default order instead of a fabricated preference", () => {
  const d = generateDataset(2401);
  const r = recommend(
    fit([]),
    { ...d.users[0], id: "new", interests: [0, 0, 0, 0, 0] },
    { weights: { content: 1, collaborative: 0, popularity: 0 } },
  );
  assert.ok(r.every((r) => r.score === 0 && r.reason.includes("신호가 없어")));
});
test("exclusions never leak into recommendations; ranking is deterministic and unique", () => {
  const d = generateDataset(2401),
    model = fit(d.sessions.filter((s) => s.day < 70));
  const opts = {
    k: 3,
    weights: { content: 0.55, collaborative: 0.3, popularity: 0.15 },
    excludeIds: ["flow", "mint"],
  };
  const r = recommend(model, d.users[0], opts);
  assert.equal(r.length, 3);
  assert.equal(new Set(r.map((r) => r.app.id)).size, 3);
  assert.ok(r.every((r) => !opts.excludeIds.includes(r.app.id)));
  assert.deepEqual(r, recommend(model, d.users[0], opts));
});
test("weighted explanation components add to score and are finite", () => {
  const d = generateDataset(2401),
    m = fit(d.sessions.filter((s) => s.day < 70));
  for (const r of recommend(m, d.users[0], { k: 8 })) {
    assert.ok(
      Math.abs(
        r.score - Object.values(r.contributions).reduce((n, x) => n + x, 0),
      ) < 1e-10,
    );
    assert.ok(Number.isFinite(r.score) && r.score >= 0 && r.score <= 1);
  }
});
test("cold-start uses interests and is stable when no events are available", () => {
  const d = generateDataset(2401),
    m = fit([]);
  const a = recommend(
    m,
    { ...d.users[0], id: "new", interests: [0, 0, 0, 1, 0] },
    { k: 3, weights: { content: 1, collaborative: 0, popularity: 0 } },
  );
  const b = recommend(
    m,
    { ...d.users[0], id: "new", interests: [1, 0, 0, 0, 0] },
    { k: 3, weights: { content: 1, collaborative: 0, popularity: 0 } },
  );
  assert.notEqual(a[0].app.id, b[0].app.id);
  assert.ok(a.every((r) => r.coldStart));
});
test("excluding all apps yields an empty result", () => {
  const d = generateDataset(2401);
  assert.deepEqual(
    recommend(fit([]), d.users[0], { excludeIds: apps.map((a) => a.id) }),
    [],
  );
});
test("append-only future sessions cannot alter a model fitted before cutoff", () => {
  const d = generateDataset(2401),
    train = d.sessions.filter((s) => s.day < 70);
  const altered = {
    ...d,
    sessions: [
      ...train,
      ...d.sessions
        .filter((s) => s.day >= 70)
        .map((s) => ({ ...s, appId: "atlas" })),
    ],
  };
  assert.deepEqual(
    recommend(fit(train), d.users[5], { k: 3 }),
    recommend(fit(altered.sessions.filter((s) => s.day < 70)), d.users[5], {
      k: 3,
    }),
  );
});

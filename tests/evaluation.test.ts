import test from "node:test";
import assert from "node:assert/strict";
import { generateDataset } from "../src/domain/dataset.js";
import { evaluate } from "../src/domain/evaluation.js";
test("evaluation holds out final 14 days and preserves a frozen train-only fit", () => {
  const d = generateDataset(2401),
    r = evaluate(d);
  assert.equal(r.split.trainLastDay, 69);
  assert.equal(r.split.testFirstDay, 70);
  assert.equal(
    r.split.trainEvents,
    d.sessions.filter((s) => s.day < 70).length,
  );
  assert.equal(
    r.split.testEvents,
    d.sessions.filter((s) => s.day >= 70).length,
  );
  assert.equal(r.usersEvaluated, 320);
  assert.equal(r.coldStartUsers, 20);
  assert.ok(
    r.models.every(
      (m) => m.ndcg >= 0 && m.ndcg <= 1 && m.coverage > 0 && m.coverage <= 1,
    ),
  );
});
test("evaluation is reproducible and never relabels business uplift from synthetic ranking metrics", () => {
  const d = generateDataset(2401),
    r = evaluate(d);
  assert.deepEqual(r, evaluate(d));
  assert.equal(r.dataKind, "synthetic");
  assert.ok(r.models.every((m) => m.ci95[0] <= m.ndcg && m.ci95[1] >= m.ndcg));
  assert.equal(r.cohorts.length, 4);
  assert.ok(r.limitations.includes("No claim of real-world business uplift."));
});

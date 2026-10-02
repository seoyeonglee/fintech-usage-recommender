import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { cpus, platform, arch } from "node:os";
import { generateDataset } from "../src/domain/dataset.js";
import { evaluate } from "../src/domain/evaluation.js";
import { fit, recommend } from "../src/domain/recommender.js";
const dataset = generateDataset(2401),
  train = dataset.sessions.filter((s) => s.day < 70);
const t0 = performance.now(),
  model = fit(train),
  fitMs = performance.now() - t0;
for (const u of dataset.users) recommend(model, u, { k: 3 }); // unmeasured JIT warmup
const samples: number[] = [];
for (let run = 0; run < 10; run++)
  for (const u of dataset.users) {
    const start = performance.now();
    recommend(model, u, { k: 3 });
    samples.push(performance.now() - start);
  }
samples.sort((a, b) => a - b);
const report = {
  ...evaluate(dataset),
  dataset: {
    fingerprint: createHash("sha256")
      .update(JSON.stringify(dataset))
      .digest("hex"),
    users: dataset.users.length,
    apps: 8,
    days: 84,
    sessions: dataset.sessions.length,
  },
  benchmark: {
    fitMs,
    medianMs: samples[Math.floor(samples.length * 0.5)],
    p95Ms: samples[Math.floor(samples.length * 0.95)],
    samples: samples.length,
    environment: `${platform()}/${arch()}, Node ${process.version}, ${cpus()[0]?.model ?? "unknown CPU"}`,
    method:
      "Single-process warm Node timing of recommend(k=3), 320 users × 10 passes. No network, concurrent load or rendering; not a production SLA.",
  },
};
mkdirSync("public/reports", { recursive: true });
writeFileSync(
  "public/reports/evaluation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      sessions: dataset.sessions.length,
      train: train.length,
      models: report.models,
      benchmark: report.benchmark,
    },
    null,
    2,
  ),
);

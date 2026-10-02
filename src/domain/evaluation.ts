import {
  apps,
  cohorts,
  dayLabel,
  DEFAULT_WEIGHTS,
  TRAIN_DAYS,
} from "./catalog.js";
import { seededRandom } from "./dataset.js";
import { rankingMetrics } from "./metrics.js";
import { fit, recommend } from "./recommender.js";
import type { Dataset, RankingMetrics, Weights } from "./types.js";
export interface ModelResult extends RankingMetrics {
  name: string;
  id: string;
  coverage: number;
  ci95: [number, number];
}
export interface EvaluationReport {
  schemaVersion: 1;
  dataKind: "synthetic";
  seed: number;
  usersEvaluated: number;
  coldStartUsers: number;
  k: number;
  split: {
    trainLastDay: number;
    testFirstDay: number;
    trainEnd: string;
    testStart: string;
    testEnd: string;
    trainEvents: number;
    testEvents: number;
  };
  models: ModelResult[];
  cohorts: {
    id: string;
    name: string;
    n: number;
    ndcg: number;
    baselineNdcg: number;
  }[];
  coldStart: { n: number; hybrid: RankingMetrics; popularity: RankingMetrics };
  limitations: string[];
}
const average = (rows: RankingMetrics[]): RankingMetrics => ({
  precision: rows.reduce((n, r) => n + r.precision, 0) / (rows.length || 1),
  recall: rows.reduce((n, r) => n + r.recall, 0) / (rows.length || 1),
  ndcg: rows.reduce((n, r) => n + r.ndcg, 0) / (rows.length || 1),
});
function bootstrap(values: number[]): [number, number] {
  if (!values.length) return [0, 0];
  const random = seededRandom(7251),
    means: number[] = [];
  for (let b = 0; b < 300; b++) {
    let sum = 0;
    for (let i = 0; i < values.length; i++)
      sum += values[Math.floor(random() * values.length)];
    means.push(sum / values.length);
  }
  means.sort((a, b) => a - b);
  return [means[7], means[292]];
}
export function evaluate(dataset: Dataset): EvaluationReport {
  const train = dataset.sessions.filter((s) => s.day < TRAIN_DAYS),
    test = dataset.sessions.filter((s) => s.day >= TRAIN_DAYS),
    model = fit(train);
  const groundTruth = new Map<string, Set<string>>();
  for (const s of test) {
    if (!groundTruth.has(s.userId)) groundTruth.set(s.userId, new Set());
    groundTruth.get(s.userId)!.add(s.appId);
  }
  const users = dataset.users.filter((u) => groundTruth.has(u.id)),
    k = 3;
  const configs: {
    id: string;
    name: string;
    weights: Weights;
    diversity: number;
  }[] = [
    {
      id: "popularity",
      name: "Popularity",
      weights: { content: 0, collaborative: 0, popularity: 1 },
      diversity: 0,
    },
    {
      id: "content",
      name: "Content only",
      weights: { content: 1, collaborative: 0, popularity: 0 },
      diversity: 0,
    },
    {
      id: "hybrid",
      name: "Hybrid + diversity",
      weights: DEFAULT_WEIGHTS,
      diversity: 0.12,
    },
  ];
  const perUser: Record<string, Map<string, RankingMetrics>> = {};
  const models = configs.map((config) => {
    const used = new Set<string>(),
      metrics: RankingMetrics[] = [];
    perUser[config.id] = new Map();
    for (const user of users) {
      const r = recommend(model, user, {
        k,
        weights: config.weights,
        diversity: config.diversity,
      });
      r.forEach((x) => used.add(x.app.id));
      const m = rankingMetrics(
        r.map((r) => r.app.id),
        groundTruth.get(user.id)!,
        k,
      );
      metrics.push(m);
      perUser[config.id].set(user.id, m);
    }
    return {
      ...average(metrics),
      id: config.id,
      name: config.name,
      coverage: used.size / apps.length,
      ci95: bootstrap(metrics.map((m) => m.ndcg)),
    };
  });
  const cold = users.filter((u) => !model.userApps[u.id]);
  return {
    schemaVersion: 1,
    dataKind: "synthetic",
    seed: dataset.seed,
    usersEvaluated: users.length,
    coldStartUsers: cold.length,
    k,
    split: {
      trainLastDay: 69,
      testFirstDay: 70,
      trainEnd: dayLabel(69),
      testStart: dayLabel(70),
      testEnd: dataset.endDate,
      trainEvents: train.length,
      testEvents: test.length,
    },
    models,
    cohorts: Object.entries(cohorts).map(([id, c]) => {
      const members = users.filter((u) => u.cohort === id);
      return {
        id,
        name: c.name,
        n: members.length,
        ndcg: average(members.map((u) => perUser.hybrid.get(u.id)!)).ndcg,
        baselineNdcg: average(members.map((u) => perUser.popularity.get(u.id)!))
          .ndcg,
      };
    }),
    coldStart: {
      n: cold.length,
      hybrid: average(cold.map((u) => perUser.hybrid.get(u.id)!)),
      popularity: average(cold.map((u) => perUser.popularity.get(u.id)!)),
    },
    limitations: [
      "Synthetic behavioral distribution; not a representative financial market sample.",
      "No claim of real-world business uplift.",
      "Repeated-app relevance is allowed; this is not a novel-app-discovery benchmark.",
      "Weights were fixed before evaluation; this holdout is not used for tuning.",
      "D7 retention measures first-observed sessions, not verified registration.",
    ],
  };
}

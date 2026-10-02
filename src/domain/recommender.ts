import { apps, DEFAULT_WEIGHTS, featureLabels } from "./catalog.js";
import type {
  Model,
  RecommendOptions,
  Recommendation,
  Session,
  User,
  Vector,
  Weights,
} from "./types.js";
export function cosine(a: Vector, b: Vector): number {
  const dot = a.reduce((n, x, i) => n + x * (b[i] ?? 0), 0),
    norm = Math.sqrt(
      a.reduce((n, x) => n + x * x, 0) * b.reduce((n, x) => n + x * x, 0),
    );
  return norm ? Math.min(1, Math.max(0, dot / norm)) : 0;
}
export function normalizeWeights(w: Weights): Weights {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const max = Math.max(
    safe(w.content),
    safe(w.collaborative),
    safe(w.popularity),
  );
  if (!max) return { content: 1, collaborative: 0, popularity: 0 };
  const a = safe(w.content) / max,
    b = safe(w.collaborative) / max,
    c = safe(w.popularity) / max,
    sum = a + b + c;
  return { content: a / sum, collaborative: b / sum, popularity: c / sum };
}
export function fit(events: Session[]): Model {
  const cutoffDay = events.reduce((n, s) => Math.max(n, s.day), -1);
  const userApps: Model["userApps"] = {},
    userVectors: Model["userVectors"] = {},
    popularity: Model["popularity"] = {},
    similarity: Model["similarity"] = {};
  const visitors: Record<string, Set<string>> = Object.fromEntries(
    apps.map((a) => [a.id, new Set<string>()]),
  );
  for (const s of events) {
    if (!visitors[s.appId]) continue;
    const decay = Math.exp(-(cutoffDay - s.day) / 28);
    userApps[s.userId] ??= {};
    userApps[s.userId][s.appId] = (userApps[s.userId][s.appId] ?? 0) + decay;
    userVectors[s.userId] ??= Array(5).fill(0);
    userVectors[s.userId][s.feature] += decay * Math.log1p(s.minutes);
    visitors[s.appId].add(s.userId);
  }
  const max = Math.max(1, ...Object.values(visitors).map((s) => s.size));
  for (const a of apps) {
    popularity[a.id] = visitors[a.id].size / max;
    similarity[a.id] = {};
    for (const b of apps) {
      let overlap = 0;
      for (const u of visitors[a.id]) if (visitors[b.id].has(u)) overlap++;
      const denominator = Math.sqrt(visitors[a.id].size * visitors[b.id].size);
      similarity[a.id][b.id] = denominator ? overlap / denominator : 0;
    }
  }
  return {
    cutoffDay,
    popularity,
    similarity,
    userApps,
    userVectors,
    eventCount: events.length,
  };
}
export function recommend(
  model: Model,
  user: User,
  options: RecommendOptions = {},
): Recommendation[] {
  const weights = normalizeWeights(options.weights ?? DEFAULT_WEIGHTS),
    history = model.userApps[user.id] ?? {},
    coldStart = Object.keys(history).length === 0;
  const vector = coldStart ? user.interests : model.userVectors[user.id];
  const excluded = new Set(options.excludeIds ?? []);
  const candidates = apps
    .filter((a) => !excluded.has(a.id))
    .map((app) => {
      const entries = Object.entries(history).filter(([id]) => id !== app.id);
      const denominator = entries.reduce(
        (n, [, count]) => n + Math.log1p(count),
        0,
      );
      const collaborative = denominator
        ? entries.reduce(
            (n, [id, count]) =>
              n + Math.log1p(count) * (model.similarity[id]?.[app.id] ?? 0),
            0,
          ) / denominator
        : 0;
      const raw = {
        content: cosine(vector, app.features),
        collaborative,
        popularity: model.popularity[app.id] ?? 0,
      };
      const contributions = {
        content: raw.content * weights.content,
        collaborative: raw.collaborative * weights.collaborative,
        popularity: raw.popularity * weights.popularity,
      };
      const score = Object.values(contributions).reduce((n, x) => n + x, 0);
      const match = vector.map((x, j) => x * app.features[j]);
      const strongest = match.indexOf(Math.max(...match));
      const dominant = (Object.keys(contributions) as (keyof Weights)[]).sort(
        (a, b) => contributions[b] - contributions[a],
      )[0];
      const reason =
        score <= 0
          ? "구분할 추천 신호가 없어 기본 순서로 표시합니다."
          : dominant === "popularity"
            ? "학습 구간의 앱별 고유 이용자 수를 기준으로 추천했어요."
            : dominant === "collaborative"
              ? "기존 이용 앱과의 공동 이용 패턴을 기준으로 추천했어요."
              : `${coldStart ? "선택한 관심사" : "관측된 이용 패턴"}에서 ${featureLabels[strongest]} 신호가 가장 크게 반영됐어요.`;
      return {
        app,
        score,
        selectionScore: score,
        contributions,
        raw,
        weights,
        coldStart,
        reason,
      };
    });
  const selected: Recommendation[] = [],
    diversity = Math.min(0.5, Math.max(0, options.diversity ?? 0.12));
  const k = Math.max(0, Math.min(apps.length, Math.floor(options.k ?? 3)));
  while (selected.length < k && candidates.length) {
    for (const r of candidates)
      r.selectionScore =
        r.score -
        diversity *
          Math.max(
            0,
            ...selected.map((s) => cosine(r.app.features, s.app.features)),
          );
    candidates.sort(
      (a, b) =>
        b.selectionScore - a.selectionScore ||
        b.score - a.score ||
        a.app.id.localeCompare(b.app.id),
    );
    selected.push(candidates.shift()!);
  }
  return selected;
}

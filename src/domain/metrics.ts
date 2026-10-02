import type { RankingMetrics } from "./types.js";
export function rankingMetrics(
  ranking: string[],
  relevant: Set<string>,
  k: number,
): RankingMetrics {
  if (k <= 0 || !relevant.size) return { precision: 0, recall: 0, ndcg: 0 };
  const top = [...new Set(ranking)].slice(0, k);
  let hits = 0,
    dcg = 0;
  for (let i = 0; i < top.length; i++)
    if (relevant.has(top[i])) {
      hits++;
      dcg += 1 / Math.log2(i + 2);
    }
  let ideal = 0;
  for (let i = 0; i < Math.min(k, relevant.size); i++)
    ideal += 1 / Math.log2(i + 2);
  return {
    precision: hits / k,
    recall: hits / relevant.size,
    ndcg: ideal ? dcg / ideal : 0,
  };
}

import { apps, cohorts, TOTAL_DAYS } from "./catalog.js";
import type { Cohort, Dataset } from "./types.js";
export function seededRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), 1 | t);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function choose(weights: number[], random: () => number): number {
  let r = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}
export function generateDataset(seed = 2401): Dataset {
  const random = seededRandom(seed),
    keys = Object.keys(cohorts) as Cohort[];
  const users = Array.from({ length: 320 }, (_, i) => {
    const cohort = keys[i % 4];
    return {
      id: `u${String(i + 1).padStart(3, "0")}`,
      label: `${cohorts[cohort].name} ${String(i + 1).padStart(3, "0")}`,
      cohort,
      interests: cohorts[cohort].interests.map((x) =>
        Math.max(0.02, x * (0.55 + random() * 0.9)),
      ),
    };
  });
  const latent = users.map((user, i) => {
    const weights = apps.map(
      (app) =>
        0.02 +
        Math.pow(
          app.features.reduce((n, x, j) => n + x * user.interests[j], 0),
          3,
        ),
    );
    const pool: number[] = [];
    for (let n = 0; n < 5; n++) {
      const next = choose(
        weights.map((w, j) => (pool.includes(j) ? 0 : w)),
        random,
      );
      pool.push(next);
    }
    return {
      pool,
      start: i >= 300 ? 73 : Math.floor(random() * 61),
      frequency: 0.45 + random() * 0.35,
    };
  });
  const sessions: Dataset["sessions"] = [];
  let id = 1;
  for (let day = 0; day < TOTAL_DAYS; day++)
    for (let i = 0; i < users.length; i++) {
      const user = users[i],
        l = latent[i];
      if (day < l.start) continue;
      const weekend =
        new Date(Date.UTC(2026, 6, 9 + day)).getUTCDay() % 6 === 0;
      const p = l.frequency * (weekend ? 0.88 : 1) * (1 + 0.0018 * day);
      if (random() > p) continue;
      const available = l.pool.slice(0, day >= 71 ? 5 : day >= 42 ? 4 : 3);
      const affinity = available.map((j) =>
        Math.pow(
          apps[j].features.reduce((n, x, f) => n + x * user.interests[f], 0),
          2,
        ),
      );
      const repeats = random() < 0.35 ? 2 : 1;
      for (let r = 0; r < repeats; r++) {
        const app = apps[available[choose(affinity, random)]];
        const feature = choose(
          app.features.map((x, j) => 0.02 + x * user.interests[j]),
          random,
        );
        const minutes =
          Math.round((1.5 + random() * 6.5 + (feature >= 3 ? 3 : 0)) * 10) / 10;
        sessions.push({
          id: id++,
          userId: user.id,
          appId: app.id,
          day,
          minutes,
          feature,
        });
      }
    }
  return {
    seed,
    startDate: "2026-07-09",
    endDate: "2026-09-30",
    days: TOTAL_DAYS,
    users,
    sessions,
  };
}

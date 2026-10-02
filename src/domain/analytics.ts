import { apps, TOTAL_DAYS } from "./catalog.js";
import type { Analytics, Filter, Session, User } from "./types.js";
export function aggregate(
  sessions: Session[],
  users: User[],
  filter: Filter,
): Analytics {
  const days = Math.max(1, Math.min(TOTAL_DAYS, Math.floor(filter.days) || 28)),
    start = TOTAL_DAYS - days;
  const selected = new Set(
    users
      .filter((u) => filter.cohort === "all" || u.cohort === filter.cohort)
      .map((u) => u.id),
  );
  const cohortSessions = sessions.filter(
    (s) => selected.has(s.userId) && s.day >= 0 && s.day < TOTAL_DAYS,
  );
  const filtered = cohortSessions.filter((s) => s.day >= start);
  const activeUsers = new Set(filtered.map((s) => s.userId)).size;
  const previous =
    start >= days
      ? cohortSessions.filter((s) => s.day >= start - days && s.day < start)
      : null;
  const daily = Array.from({ length: days }, (_, i) => ({
    day: start + i,
    activeUsers: 0,
    sessions: 0,
    byApp: Object.fromEntries(apps.map((a) => [a.id, 0])),
  }));
  const dayUsers = new Map<number, Set<string>>(),
    appDayUsers = new Map<string, Set<string>>();
  for (const s of filtered) {
    const bucket = daily[s.day - start];
    bucket.sessions++;
    if (!dayUsers.has(s.day)) dayUsers.set(s.day, new Set());
    dayUsers.get(s.day)!.add(s.userId);
    const key = `${s.day}:${s.appId}`;
    if (!appDayUsers.has(key)) appDayUsers.set(key, new Set());
    appDayUsers.get(key)!.add(s.userId);
  }
  for (const bucket of daily) {
    bucket.activeUsers = dayUsers.get(bucket.day)?.size ?? 0;
    for (const app of apps)
      bucket.byApp[app.id] =
        appDayUsers.get(`${bucket.day}:${app.id}`)?.size ?? 0;
  }
  const rows = apps
    .map((app) => {
      const all = cohortSessions.filter((s) => s.appId === app.id),
        current = all.filter((s) => s.day >= start),
        active = new Set(current.map((s) => s.userId)).size;
      const userDays = new Map<string, Set<number>>();
      for (const s of all) {
        if (!userDays.has(s.userId)) userDays.set(s.userId, new Set());
        userDays.get(s.userId)!.add(s.day);
      }
      let eligible = 0,
        returned = 0;
      for (const daysSeen of userDays.values()) {
        const first = Math.min(...daysSeen);
        if (first >= start && first + 7 < TOTAL_DAYS) {
          eligible++;
          if (daysSeen.has(first + 7)) returned++;
        }
      }
      return {
        app,
        activeUsers: active,
        sessions: current.length,
        minutes: current.reduce((n, s) => n + s.minutes, 0),
        sessionsPerUser: active ? current.length / active : 0,
        d7Retention: eligible ? returned / eligible : null,
        retentionEligible: eligible,
      };
    })
    .sort(
      (a, b) =>
        b.activeUsers - a.activeUsers || a.app.id.localeCompare(b.app.id),
    );
  return {
    activeUsers,
    totalSessions: filtered.length,
    minutes: filtered.reduce((n, s) => n + s.minutes, 0),
    sessionsPerUser: activeUsers ? filtered.length / activeUsers : 0,
    previousActive: previous
      ? new Set(previous.map((s) => s.userId)).size
      : null,
    previousSessions: previous?.length ?? null,
    daily,
    apps: rows,
    filtered,
  };
}

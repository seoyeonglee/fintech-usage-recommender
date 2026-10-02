export type Vector = number[];
export type Cohort = "professional" | "planner" | "shopper" | "global";
export interface AppInfo {
  id: string;
  name: string;
  tagline: string;
  category: string;
  color: string;
  letter: string;
  features: Vector;
}
export interface User {
  id: string;
  label: string;
  cohort: string;
  interests: Vector;
}
export interface Session {
  id: number;
  userId: string;
  appId: string;
  day: number;
  minutes: number;
  feature: number;
}
export interface Dataset {
  seed: number;
  startDate: string;
  endDate: string;
  days: number;
  users: User[];
  sessions: Session[];
}
export interface Weights {
  content: number;
  collaborative: number;
  popularity: number;
}
export interface Model {
  cutoffDay: number;
  popularity: Record<string, number>;
  similarity: Record<string, Record<string, number>>;
  userApps: Record<string, Record<string, number>>;
  userVectors: Record<string, Vector>;
  eventCount: number;
}
export interface Recommendation {
  app: AppInfo;
  score: number;
  selectionScore: number;
  contributions: Weights;
  raw: Weights;
  weights: Weights;
  coldStart: boolean;
  reason: string;
}
export interface RecommendOptions {
  k?: number;
  weights?: Weights;
  excludeIds?: string[];
  diversity?: number;
}
export interface Filter {
  days: number;
  cohort: string;
}
export interface AppAnalytics {
  app: AppInfo;
  activeUsers: number;
  sessions: number;
  minutes: number;
  sessionsPerUser: number;
  d7Retention: number | null;
  retentionEligible: number;
}
export interface Daily {
  day: number;
  activeUsers: number;
  sessions: number;
  byApp: Record<string, number>;
}
export interface Analytics {
  activeUsers: number;
  totalSessions: number;
  minutes: number;
  sessionsPerUser: number;
  previousActive: number | null;
  previousSessions: number | null;
  daily: Daily[];
  apps: AppAnalytics[];
  filtered: Session[];
}
export interface RankingMetrics {
  precision: number;
  recall: number;
  ndcg: number;
}

import type { AppInfo, Cohort } from "./types.js";
export const featureLabels = ["결제", "송금", "저축", "예산관리", "자산조회"];
export const cohorts: Record<
  Cohort,
  { name: string; description: string; interests: number[] }
> = {
  professional: {
    name: "직장인",
    description: "일상 결제와 빠른 송금",
    interests: [0.8, 1, 0.45, 0.35, 0.3],
  },
  planner: {
    name: "자산관리형",
    description: "저축 목표와 자산 가시성",
    interests: [0.2, 0.35, 1, 0.85, 1],
  },
  shopper: {
    name: "소비관리형",
    description: "결제 습관과 지출 관리",
    interests: [1, 0.25, 0.25, 1, 0.3],
  },
  global: {
    name: "글로벌 이용자",
    description: "해외 결제와 송금",
    interests: [0.6, 1, 0.2, 0.2, 0.65],
  },
};
export const apps: AppInfo[] = [
  {
    id: "flow",
    name: "Flow Pay",
    tagline: "일상의 결제, 더 간결하게",
    category: "결제 · 송금",
    color: "#2c806d",
    letter: "F",
    features: [1, 0.8, 0.15, 0.2, 0.15],
  },
  {
    id: "mint",
    name: "Mint Bank",
    tagline: "목표를 향한 저축 루틴",
    category: "송금 · 저축",
    color: "#669b75",
    letter: "M",
    features: [0.4, 0.85, 1, 0.25, 0.4],
  },
  {
    id: "pocket",
    name: "Pocket",
    tagline: "지출을 이해하는 새로운 방법",
    category: "예산 · 결제",
    color: "#d89966",
    letter: "P",
    features: [0.65, 0.2, 0.2, 1, 0.35],
  },
  {
    id: "atlas",
    name: "Atlas",
    tagline: "흩어진 자산을 한눈에",
    category: "자산 · 예산",
    color: "#6378ae",
    letter: "A",
    features: [0.1, 0.2, 0.7, 0.6, 1],
  },
  {
    id: "remit",
    name: "Remit Go",
    tagline: "국경을 넘는 일상 송금",
    category: "해외송금",
    color: "#9084b0",
    letter: "R",
    features: [0.5, 1, 0.1, 0.1, 0.75],
  },
  {
    id: "bloom",
    name: "Bloom",
    tagline: "작은 저축이 만드는 변화",
    category: "저축 · 예산",
    color: "#91a05b",
    letter: "B",
    features: [0.1, 0.3, 1, 0.8, 0.55],
  },
  {
    id: "loop",
    name: "Loop",
    tagline: "소비 패턴에 맞춘 결제",
    category: "결제 · 예산",
    color: "#bb7180",
    letter: "L",
    features: [1, 0.25, 0.1, 0.8, 0.2],
  },
  {
    id: "vista",
    name: "Vista",
    tagline: "자산과 송금의 연결",
    category: "자산 · 송금",
    color: "#588c9c",
    letter: "V",
    features: [0.2, 0.9, 0.4, 0.3, 1],
  },
];
export const DEFAULT_WEIGHTS = {
  content: 0.55,
  collaborative: 0.3,
  popularity: 0.15,
};
export const DATA_SEED = 2401;
export const TOTAL_DAYS = 84;
export const TRAIN_DAYS = 70;
export function dayLabel(day: number, short = false): string {
  const d = new Date(Date.UTC(2026, 6, 9 + day));
  return short
    ? `${d.getUTCMonth() + 1}.${String(d.getUTCDate()).padStart(2, "0")}`
    : d.toISOString().slice(0, 10);
}

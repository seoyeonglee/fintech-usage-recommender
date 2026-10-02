import { useMemo, useState } from "react";
import { aggregate } from "./domain/analytics.js";
import { cohorts, TRAIN_DAYS } from "./domain/catalog.js";
import { generateDataset } from "./domain/dataset.js";
import { fit } from "./domain/recommender.js";
import { Icon, type IconName } from "./components/Icons.js";
import { Overview } from "./components/Overview.js";
import { RecommendationLab } from "./components/RecommendationLab.js";
import { Evaluation } from "./components/Evaluation.js";
type View = "overview" | "recommendation" | "evaluation";
const nav: { id: View; label: string; icon: IconName }[] = [
  { id: "overview", label: "사용량 비교", icon: "chart" },
  { id: "recommendation", label: "추천 실험실", icon: "spark" },
  { id: "evaluation", label: "엔진 평가", icon: "flask" },
];
const headings: Record<
  View,
  { eyebrow: string; title: string; subtitle: string }
> = {
  overview: {
    eyebrow: "USAGE INTELLIGENCE",
    title: "핀테크 이용 인사이트",
    subtitle: "앱별 사용 흐름을 비교하고, 데이터로 다음 경험을 추천합니다.",
  },
  recommendation: {
    eyebrow: "RECOMMENDATION LAB",
    title: "이용 패턴을, 더 나은 선택으로",
    subtitle: "행동 · 공동 이용 · 인기도 신호로 설명 가능한 추천을 실험하세요.",
  },
  evaluation: {
    eyebrow: "ENGINE EVALUATION",
    title: "좋은 추천에는, 근거가 필요하니까",
    subtitle: "시간순 평가와 재현 가능한 측정 결과로 엔진을 살펴보세요.",
  },
};
export default function App() {
  const dataset = useMemo(() => generateDataset(2401), []),
    model = useMemo(
      () => fit(dataset.sessions.filter((s) => s.day < TRAIN_DAYS)),
      [dataset],
    );
  const [view, setView] = useState<View>("overview"),
    [days, setDays] = useState(28),
    [cohort, setCohort] = useState("all");
  const analytics = useMemo(
    () => aggregate(dataset.sessions, dataset.users, { days, cohort }),
    [dataset, days, cohort],
  );
  function changeView(v: View) {
    setView(v);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function exportCsv() {
    const rows = [
      [
        "app",
        "category",
        "period_days",
        "cohort",
        "active_users",
        "sessions",
        "minutes",
        "sessions_per_user",
        "d7_retention",
        "d7_eligible",
      ],
      ...analytics.apps.map((r) => [
        r.app.name,
        r.app.category,
        days,
        cohort,
        r.activeUsers,
        r.sessions,
        r.minutes.toFixed(1),
        r.sessionsPerUser.toFixed(3),
        r.d7Retention === null ? "" : r.d7Retention.toFixed(6),
        r.retentionEligible,
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `finscope-${cohort}-${days}days.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const heading = headings[view];
  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        본문으로 이동
      </a>
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            changeView("overview");
          }}
          aria-label="FinScope 홈"
        >
          <span className="brand-mark">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path
                d="M6 25V7h20M6 16h16"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="25" cy="24" r="4" fill="currentColor" />
            </svg>
          </span>
          <span>
            FinScope<span className="brand-period">.</span>
          </span>
        </a>
        <div className="workspace-label">ANALYTICS WORKSPACE</div>
        <nav aria-label="메인 메뉴">
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-item active" : "nav-item"}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => changeView(item.id)}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {view === item.id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="sidebar-card-icon">
            <Icon name="layers" size={24} />
          </span>
          <h3>
            작은 데이터에서
            <br />큰 인사이트로.
          </h3>
          <p>
            320명의 이용자,
            <br />
            8개의 앱, 84일의 기록.
          </p>
          <button onClick={() => changeView("evaluation")}>
            평가 결과 보기
            <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="status-dot" />
          <div>
            <b>Demo environment</b>
            <small>합성 데이터 · 외부 연결 없음</small>
          </div>
          <a
            href="https://github.com/seoyeonglee/fintech-usage-recommender"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub 저장소"
          >
            <Icon name="external" size={17} />
          </a>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Icon name="grid" size={16} />
            <span>Workspace</span>
            <span className="slash">/</span>
            <b>Fintech intelligence</b>
          </div>
          <div className="topbar-right">
            <span className="synthetic-chip">
              <i />
              SYNTHETIC DATA
            </span>
            <span className="top-avatar">FS</span>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{heading.eyebrow}</div>
              <h1>{heading.title}</h1>
              <p>{heading.subtitle}</p>
            </div>
            {view === "overview" ? (
              <button className="secondary-button" onClick={exportCsv}>
                <Icon name="download" size={16} />
                CSV 내보내기
              </button>
            ) : view === "evaluation" ? (
              <a
                className="secondary-button"
                href="/reports/evaluation.json"
                download="finscope-evaluation.json"
              >
                <Icon name="download" size={16} />
                평가 JSON
              </a>
            ) : (
              <a
                className="secondary-button"
                href="https://github.com/seoyeonglee/fintech-usage-recommender/blob/main/src/domain/recommender.ts"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="external" size={16} />
                엔진 코드
              </a>
            )}
          </div>
          {view === "overview" && (
            <div className="filter-bar">
              <div className="filter-left">
                <div className="filter-control">
                  <Icon name="clock" size={15} />
                  <label htmlFor="period">기간</label>
                  <select
                    id="period"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  >
                    <option value={7}>최근 7일</option>
                    <option value={28}>최근 28일</option>
                    <option value={84}>전체 84일</option>
                  </select>
                </div>
                <div className="filter-control">
                  <Icon name="users" size={16} />
                  <label htmlFor="cohort">사용자군</label>
                  <select
                    id="cohort"
                    value={cohort}
                    onChange={(e) => setCohort(e.target.value)}
                  >
                    <option value="all">전체 이용자</option>
                    {Object.entries(cohorts).map(([id, c]) => (
                      <option key={id} value={id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <span className="date-range">2026.07.09 — 2026.09.30 데이터</span>
            </div>
          )}
          {view === "overview" ? (
            <Overview
              analytics={analytics}
              dataset={dataset}
              onRecommend={() => changeView("recommendation")}
            />
          ) : view === "recommendation" ? (
            <RecommendationLab dataset={dataset} model={model} />
          ) : (
            <Evaluation />
          )}
          <footer className="page-footer">
            <span>
              <b>FinScope</b> · Fintech usage intelligence
            </span>
            <span>가상 앱 · 합성 이용 데이터 · 금융상품 추천 아님</span>
            <span>Engineering portfolio / 2026</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

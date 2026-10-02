import { useEffect, useRef, useState } from "react";
import { cohorts, featureLabels } from "../domain/catalog.js";
import type { Analytics, AppInfo, Dataset } from "../domain/types.js";
import { TrendChart, Donut } from "./Charts.js";
import { Icon } from "./Icons.js";
import { AppMark, Kpi, number, percent, SectionTitle } from "./UI.js";
function AppDetail({ app, onClose }: { app: AppInfo; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="app-dialog"
      onClose={onClose}
      aria-labelledby="dialog-title"
    >
      <button
        className="icon-button dialog-close"
        onClick={() => ref.current?.close()}
        aria-label="상세 보기 닫기"
      >
        <Icon name="close" />
      </button>
      <AppMark app={app} large />
      <div className="eyebrow">FICTIONAL APP PROFILE</div>
      <h2 id="dialog-title">{app.name}</h2>
      <p>{app.tagline}</p>
      <div className="feature-list">
        {featureLabels.map((label, i) => (
          <div key={label}>
            <span>{label}</span>
            <div className="bar-track">
              <div
                style={{
                  width: `${app.features[i] * 100}%`,
                  background: app.color,
                }}
              />
            </div>
            <b>{(app.features[i] * 100).toFixed(0)}</b>
          </div>
        ))}
      </div>
      <p className="fine-print">
        점수는 합성 앱의 기능 벡터입니다. 실제 금융상품의 품질이나 혜택을
        평가하지 않습니다.
      </p>
    </dialog>
  );
}
export function Overview({
  analytics,
  dataset,
  onRecommend,
}: {
  analytics: Analytics;
  dataset: Dataset;
  onRecommend: () => void;
}) {
  const [metric, setMetric] = useState<"activeUsers" | "sessions">(
      "activeUsers",
    ),
    [compare, setCompare] = useState(["flow", "mint", "pocket"]),
    [detail, setDetail] = useState<AppInfo | null>(null);
  const active = new Set(analytics.filtered.map((s) => s.userId));
  const colors = ["#286b55", "#9eae75", "#dca67a", "#9b93b5"];
  const parts = Object.entries(cohorts).map(([id, c], i) => ({
    name: c.name,
    value: dataset.users.filter((u) => u.cohort === id && active.has(u.id))
      .length,
    color: colors[i],
  }));
  const change = (current: number, previous: number | null) =>
    previous === null || !previous
      ? null
      : ((current - previous) / previous) * 100;
  function toggle(id: string) {
    setCompare((current) =>
      current.includes(id)
        ? current.length > 2
          ? current.filter((x) => x !== id)
          : current
        : current.length < 3
          ? [...current, id]
          : [...current.slice(1), id],
    );
  }
  return (
    <>
      <div className="metrics-grid">
        <Kpi
          label="활성 이용자"
          value={number(analytics.activeUsers)}
          unit="명"
          icon="users"
          change={change(analytics.activeUsers, analytics.previousActive)}
          note="선택한 기간의 고유 이용자"
          highlight
          testId="active-users"
        />
        <Kpi
          label="앱 이용 세션"
          value={number(analytics.totalSessions)}
          unit="건"
          icon="layers"
          change={change(analytics.totalSessions, analytics.previousSessions)}
          note="선택한 기간의 전체 세션"
        />
        <Kpi
          label="누적 이용 시간"
          value={number(analytics.minutes / 60, 1)}
          unit="시간"
          icon="clock"
          note="모든 앱의 세션 시간 합계"
        />
        <Kpi
          label="1인당 이용 빈도"
          value={number(analytics.sessionsPerUser, 1)}
          unit="회"
          icon="chart"
          note="세션 수 ÷ 활성 이용자"
        />
      </div>
      <div className="overview-charts">
        <section className="panel trend-panel">
          <SectionTitle title="사용량의 흐름">
            <div className="segmented">
              <button
                aria-pressed={metric === "activeUsers"}
                className={metric === "activeUsers" ? "selected" : ""}
                onClick={() => setMetric("activeUsers")}
              >
                활성 사용자
              </button>
              <button
                aria-pressed={metric === "sessions"}
                className={metric === "sessions" ? "selected" : ""}
                onClick={() => setMetric("sessions")}
              >
                세션
              </button>
            </div>
          </SectionTitle>
          <div className="chart-legend">
            <i className="dot green" />
            일별 {metric === "activeUsers" ? "고유 이용자" : "이용 세션"}
            <span>{analytics.daily.length}일 관측</span>
          </div>
          <TrendChart daily={analytics.daily} metric={metric} />
          <div className="chart-foot">
            <Icon name="layers" size={14} />
            <span>
              동일한 사용자의 여러 앱 이용은 일별 고유 이용자에 한 번만
              집계됩니다.
            </span>
          </div>
        </section>
        <section className="panel cohort-panel">
          <SectionTitle title="이용자 구성" />
          <div className="cohort-body">
            <Donut parts={parts} total={analytics.activeUsers} />
            <div className="cohort-legend">
              {parts.map((p) => (
                <div key={p.name}>
                  <i style={{ background: p.color }} />
                  <span>{p.name}</span>
                  <b>
                    {number(p.value)}
                    <small>명</small>
                  </b>
                </div>
              ))}
            </div>
          </div>
          <div className="small-caption">
            선택한 기간 · 사용자군의 활성 이용자
          </div>
        </section>
      </div>
      <section className="comparison-section">
        <SectionTitle
          eyebrow="SIDE BY SIDE"
          title="어떤 앱을 더 자주 사용할까?"
        >
          <span className="muted">2–3개 앱을 선택해 비교하세요</span>
        </SectionTitle>
        <div className="compare-cards">
          {compare.map((id) => {
            const row = analytics.apps.find((r) => r.app.id === id)!;
            return (
              <article key={id} className="compare-card">
                <div className="compare-card-header">
                  <AppMark app={row.app} />
                  <div>
                    <h3>{row.app.name}</h3>
                    <span>{row.app.category}</span>
                  </div>
                  <span className="check-ring">
                    <Icon name="check" size={12} />
                  </span>
                </div>
                <div className="compare-values">
                  <div>
                    <b>{number(row.activeUsers)}</b>
                    <span>활성 이용자</span>
                  </div>
                  <div>
                    <b>
                      {number(row.sessionsPerUser, 1)}
                      <small>회</small>
                    </b>
                    <span>1인당 세션</span>
                  </div>
                  <div>
                    <b>{percent(row.d7Retention, 0)}</b>
                    <span>D7 재방문</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="panel app-table-panel">
        <SectionTitle title="앱별 이용 현황">
          <span className="chip">8 APPS</span>
        </SectionTitle>
        <div className="table-scroll">
          <table className="app-table">
            <thead>
              <tr>
                <th>비교</th>
                <th>애플리케이션</th>
                <th>활성 이용자</th>
                <th>세션 수</th>
                <th>1인당 세션</th>
                <th title="선택 기간에 처음 관측되고 7일이 경과한 이용자 중 정확히 7일 뒤 재방문한 비율">
                  D7 재방문율 ⓘ
                </th>
                <th>이용 점유율</th>
              </tr>
            </thead>
            <tbody>
              {analytics.apps.map((row) => (
                <tr
                  key={row.app.id}
                  className={compare.includes(row.app.id) ? "compared" : ""}
                >
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${row.app.name} 비교 선택`}
                      checked={compare.includes(row.app.id)}
                      onChange={() => toggle(row.app.id)}
                    />
                  </td>
                  <td>
                    <button
                      className="app-name-button"
                      aria-label={`${row.app.name} 상세 보기`}
                      onClick={() => setDetail(row.app)}
                    >
                      <AppMark app={row.app} />
                      <span>
                        <b>{row.app.name}</b>
                        <small>{row.app.category}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    {number(row.activeUsers)}
                    <small>명</small>
                  </td>
                  <td>{number(row.sessions)}</td>
                  <td>
                    {number(row.sessionsPerUser, 1)}
                    <small>회</small>
                  </td>
                  <td title={`성숙 코호트 ${row.retentionEligible}명`}>
                    {percent(row.d7Retention)}
                    <small className="retention-n">
                      n={row.retentionEligible}
                    </small>
                  </td>
                  <td>
                    <div className="share-cell">
                      <div className="bar-track">
                        <div
                          style={{
                            width: `${analytics.totalSessions ? (row.sessions / analytics.totalSessions) * 100 : 0}%`,
                            background: row.app.color,
                          }}
                        />
                      </div>
                      <span>
                        {percent(
                          analytics.totalSessions
                            ? row.sessions / analytics.totalSessions
                            : 0,
                          0,
                        )}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-note">
          D7은 가입일 대신 앱의 첫 관측일 기준입니다. 7일 관측 기간이 확보된
          이용자만 분모에 포함합니다.
        </div>
      </section>
      <div className="next-banner">
        <div className="banner-icon">
          <Icon name="spark" size={26} />
        </div>
        <div>
          <h3>이용 패턴을 다음 경험으로 연결하세요.</h3>
          <p>
            추천 가중치를 조정하고, 사용자마다 달라지는 추천 근거를 확인하세요.
          </p>
        </div>
        <button className="primary-button" onClick={onRecommend}>
          추천 실험실 열기
          <Icon name="arrow" size={17} />
        </button>
      </div>
      {detail && <AppDetail app={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

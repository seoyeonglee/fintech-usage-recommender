import { useEffect, useState } from "react";
import type { EvaluationReport } from "../domain/evaluation.js";
import { Icon } from "./Icons.js";
import { Kpi, number, percent, SectionTitle } from "./UI.js";
interface Report extends EvaluationReport {
  dataset: {
    fingerprint: string;
    users: number;
    apps: number;
    days: number;
    sessions: number;
  };
  benchmark: {
    fitMs: number;
    medianMs: number;
    p95Ms: number;
    samples: number;
    environment: string;
    method: string;
  };
}
export function Evaluation() {
  const [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch("/reports/evaluation.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((r) => {
        if (r.schemaVersion !== 1 || !r.models?.length)
          throw Error("Invalid report");
        setReport(r);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [retry]);
  if (error)
    return (
      <section className="panel empty-state">
        <h2>평가 보고서를 불러오지 못했어요.</h2>
        <p>연결 상태를 확인하고 다시 시도해주세요.</p>
        <button
          className="primary-button"
          onClick={() => setRetry((r) => r + 1)}
        >
          다시 불러오기
        </button>
      </section>
    );
  if (!report)
    return (
      <div className="panel loading" role="status">
        측정된 평가 결과를 불러오는 중…
      </div>
    );
  const hybrid = report.models.find((m) => m.id === "hybrid")!,
    baseline = report.models.find((m) => m.id === "popularity")!;
  return (
    <>
      <div className="evaluation-intro">
        <div>
          <div className="eyebrow">MEASURED, NOT ASSUMED</div>
          <h2>추천을 숫자로 검증하다</h2>
          <p>
            시간순 홀드아웃으로 평가하고, 인기순 추천과 같은 조건에서
            비교합니다.
          </p>
        </div>
        <div className="verified">
          <Icon name="check" size={18} />
          재현 가능한 평가 · seed {report.seed}
        </div>
      </div>
      <div className="metrics-grid">
        <Kpi
          label="Hybrid NDCG@3"
          value={hybrid.ndcg.toFixed(3)}
          icon="chart"
          note="상위 추천의 관련성과 순서"
          highlight
          testId="eval-ndcg"
        />
        <Kpi
          label="Precision@3"
          value={percent(hybrid.precision)}
          icon="check"
          note="상위 3개 중 실제 이용한 앱 비율"
        />
        <Kpi
          label="Catalogue coverage"
          value={percent(hybrid.coverage, 0)}
          icon="grid"
          note="전체 이용자 추천에 등장한 앱 비율"
        />
        <Kpi
          label="인기순 대비 NDCG 차이"
          value={`+${((hybrid.ndcg - baseline.ndcg) * 100).toFixed(1)}`}
          unit="%p"
          icon="spark"
          note="합성 데이터 · 사업 성과와 별개"
        />
      </div>
      <section className="panel split-panel">
        <SectionTitle title="미래 데이터를 미리 보지 않습니다">
          <span className="chip">CHRONOLOGICAL SPLIT</span>
        </SectionTitle>
        <div className="split-track">
          <div>
            <span>01 / TRAIN</span>
            <b>
              70<small>days</small>
            </b>
            <p>7.09 — 9.16</p>
            <strong>{number(report.split.trainEvents)} 세션</strong>
          </div>
          <div className="holdout">
            <span>02 / HOLDOUT</span>
            <b>
              14<small>days</small>
            </b>
            <p>9.17 — 9.30</p>
            <strong>{number(report.split.testEvents)} 세션</strong>
          </div>
          <div className="split-eval">
            <Icon name="flask" size={26} />
            <span>03 / EVALUATE</span>
            <b>
              {report.usersEvaluated}
              <small>users</small>
            </b>
            <p>인기순 · 콘텐츠 · 하이브리드</p>
          </div>
        </div>
        <p className="fine-print">
          모든 모델에 동일한 학습 이벤트와 평가 이용자를 사용합니다. 홀드아웃
          기간에 이용한 앱을 정답으로 보고, 재이용 앱도 포함합니다.
        </p>
      </section>
      <div className="evaluation-grid">
        <section className="panel">
          <SectionTitle title="추천 품질 비교">
            <span className="muted">NDCG@3 · 95% bootstrap CI</span>
          </SectionTitle>
          <div className="quality-bars">
            {report.models.map((m) => (
              <div key={m.id}>
                <div>
                  <b>{m.name}</b>
                  <strong>{m.ndcg.toFixed(3)}</strong>
                </div>
                <div className="quality-track">
                  <div
                    className={m.id === "hybrid" ? "hybrid-fill" : ""}
                    style={{ width: `${m.ndcg * 100}%` }}
                  />
                  <span
                    className="ci-line"
                    style={{
                      left: `${m.ci95[0] * 100}%`,
                      width: `${(m.ci95[1] - m.ci95[0]) * 100}%`,
                    }}
                  />
                </div>
                <small>
                  {m.ci95[0].toFixed(3)} – {m.ci95[1].toFixed(3)}
                </small>
              </div>
            ))}
          </div>
          <div className="table-scroll">
            <table className="model-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>P@3</th>
                  <th>R@3</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {report.models.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.precision.toFixed(3)}</td>
                    <td>{m.recall.toFixed(3)}</td>
                    <td>{percent(m.coverage, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <SectionTitle title="사용자군별 성능" />
          <div className="cohort-eval">
            {report.cohorts.map((c) => (
              <div key={c.id}>
                <div>
                  <span>
                    {c.name}
                    <small>n={c.n}</small>
                  </span>
                  <b>{c.ndcg.toFixed(3)}</b>
                </div>
                <div className="bar-track">
                  <div style={{ width: `${c.ndcg * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="cold-start-note">
            <Icon name="users" size={22} />
            <div>
              <b>처음 온 이용자도 추천받을 수 있어요.</b>
              <p>
                학습 이력이 없는 {report.coldStart.n}명 · 관심사 기반 fallback
              </p>
              <div>
                <span>
                  Hybrid NDCG{" "}
                  <strong>{report.coldStart.hybrid.ndcg.toFixed(3)}</strong>
                </span>
                <span>
                  Popularity{" "}
                  <strong>{report.coldStart.popularity.ndcg.toFixed(3)}</strong>
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
      <section className="panel evidence-panel">
        <SectionTitle title="검증 가능한 엔지니어링 기록">
          <a
            className="text-button"
            href="https://github.com/seoyeonglee/fintech-usage-recommender/tree/main/tests"
            target="_blank"
            rel="noreferrer"
          >
            테스트 코드
            <Icon name="external" size={14} />
          </a>
        </SectionTitle>
        <div className="evidence-grid">
          <div>
            <span>DATA FINGERPRINT</span>
            <b>{report.dataset.fingerprint.slice(0, 16)}…</b>
            <p>
              {number(report.dataset.sessions)} 세션 · {report.dataset.users}명
              · {report.dataset.apps}개 앱
            </p>
          </div>
          <div>
            <span>LOCAL WARM LATENCY / P95</span>
            <b>
              {report.benchmark.p95Ms.toFixed(3)}
              <small>ms</small>
            </b>
            <p>
              {number(report.benchmark.samples)}회 측정 · 네트워크·렌더링 제외
            </p>
          </div>
          <div>
            <span>REPRODUCE</span>
            <code>
              npm test
              <br />
              npm run evaluate
            </code>
            <p>데이터·학습·평가의 동일한 실행 경로</p>
          </div>
        </div>
        <p className="fine-print">
          로컬 Node 프로세스의 warm 실행 측정이며 서비스 응답시간이나 운영 SLA가
          아닙니다. 합성 데이터는 시장 대표성을 보장하지 않으며, 추천 품질
          개선은 전환율·매출 개선을 뜻하지 않습니다.
        </p>
      </section>
    </>
  );
}

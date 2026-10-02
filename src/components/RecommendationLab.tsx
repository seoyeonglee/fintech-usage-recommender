import { useEffect, useMemo, useState } from "react";
import {
  apps,
  cohorts,
  DEFAULT_WEIGHTS,
  featureLabels,
  TRAIN_DAYS,
} from "../domain/catalog.js";
import { normalizeWeights, recommend } from "../domain/recommender.js";
import type { Dataset, Model, Weights } from "../domain/types.js";
import { AppMark, number, percent, SectionTitle } from "./UI.js";
import { Icon } from "./Icons.js";
const labels: Record<keyof Weights, string> = {
  content: "행동·관심사",
  collaborative: "앱 공동 이용",
  popularity: "인기도",
};
function load() {
  try {
    const stored = JSON.parse(
      localStorage.getItem("finscope-settings-v1") ?? "null",
    );
    if (
      stored &&
      ["content", "collaborative", "popularity"].every(
        (k) => Number.isFinite(stored[k]) && stored[k] >= 0 && stored[k] <= 100,
      )
    )
      return stored as Weights;
  } catch {
    /* Storage is optional. */
  }
  return { content: 55, collaborative: 30, popularity: 15 };
}
export function RecommendationLab({
  dataset,
  model,
}: {
  dataset: Dataset;
  model: Model;
}) {
  const [userId, setUserId] = useState("u021"),
    [weights, setWeights] = useState<Weights>(load),
    [unseen, setUnseen] = useState(false),
    [interests, setInterests] = useState([0.3, 0.3, 0.5, 0.9, 0.6]);
  useEffect(() => {
    try {
      localStorage.setItem("finscope-settings-v1", JSON.stringify(weights));
    } catch {
      /* Private browsing can disable storage. */
    }
  }, [weights]);
  const user =
    userId === "new"
      ? { id: "new", label: "신규 이용자", cohort: "planner", interests }
      : dataset.users.find((u) => u.id === userId)!;
  const seen = Object.keys(model.userApps[user.id] ?? {}),
    normalized = normalizeWeights(weights);
  const results = useMemo(
    () =>
      recommend(model, user, { weights, k: 3, excludeIds: unseen ? seen : [] }),
    [model, user, weights, unseen],
  );
  const vector = model.userVectors[user.id] ?? user.interests,
    max = Math.max(...vector, 0.001);
  const history = dataset.sessions.filter(
    (s) => s.userId === user.id && s.day < TRAIN_DAYS,
  );
  function reset() {
    setUserId("u021");
    setWeights({
      content: DEFAULT_WEIGHTS.content * 100,
      collaborative: DEFAULT_WEIGHTS.collaborative * 100,
      popularity: DEFAULT_WEIGHTS.popularity * 100,
    });
    setUnseen(false);
    setInterests([0.3, 0.3, 0.5, 0.9, 0.6]);
  }
  return (
    <div className="lab-grid">
      <aside className="lab-controls">
        <section className="panel">
          <SectionTitle
            eyebrow="01 / USER PROFILE"
            title="누구에게 추천할까요?"
          />
          <label className="field-label" htmlFor="profile">
            이용자 프로필
          </label>
          <select
            id="profile"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="new">신규 이용자 · 관심사 입력</option>
            {dataset.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
          <div className="profile-card">
            <span className="avatar">
              {userId === "new" ? "N" : user.label.slice(-3)}
            </span>
            <div>
              <b>{user.label}</b>
              <span>
                {userId === "new"
                  ? "신규 이용자 · 관심사 기반 추천"
                  : cohorts[user.cohort as keyof typeof cohorts].description}
              </span>
            </div>
          </div>
          <div className="profile-stats">
            <div>
              <b>{number(history.length)}</b>
              <span>학습 세션</span>
            </div>
            <div>
              <b>{seen.length}</b>
              <span>이용한 앱</span>
            </div>
            <div>
              <b>{userId === "new" || !history.length ? "Cold" : "Warm"}</b>
              <span>시작 상태</span>
            </div>
          </div>
          <div className="field-label">
            {userId === "new" ? "관심사 설정" : "관측된 기능 이용 성향"}
          </div>
          <div className="interest-bars">
            {featureLabels.map((label, i) => (
              <div key={label}>
                <label htmlFor={`interest-${i}`}>{label}</label>
                {userId === "new" ? (
                  <input
                    id={`interest-${i}`}
                    type="range"
                    min="0"
                    max="100"
                    value={interests[i] * 100}
                    onChange={(e) =>
                      setInterests((current) =>
                        current.map((v, j) =>
                          j === i ? Number(e.target.value) / 100 : v,
                        ),
                      )
                    }
                  />
                ) : (
                  <div className="bar-track">
                    <div style={{ width: `${(vector[i] / max) * 100}%` }} />
                  </div>
                )}
                <span>
                  {Math.round(
                    userId === "new"
                      ? interests[i] * 100
                      : (vector[i] / max) * 100,
                  )}
                </span>
              </div>
            ))}
          </div>
          <div
            className="seen-apps"
            data-testid="seen-apps"
            data-ids={JSON.stringify(seen)}
          >
            {seen.map((id) => {
              const app = apps.find((a) => a.id === id)!;
              return (
                <span key={id}>
                  <i style={{ background: app.color }} />
                  {app.name}
                </span>
              );
            })}
          </div>
        </section>
        <section className="panel weight-panel">
          <SectionTitle
            eyebrow="02 / LIVE TUNING"
            title="추천의 기준을 바꿔보세요"
          />
          {(Object.keys(labels) as (keyof Weights)[]).map((key) => (
            <div className="weight-control" key={key}>
              <label htmlFor={`weight-${key}`}>
                <span>{labels[key]}</span>
                <b>{percent(normalized[key], 0)}</b>
              </label>
              <input
                id={`weight-${key}`}
                aria-label={
                  key === "popularity"
                    ? "인기도 가중치"
                    : `${labels[key]} 가중치`
                }
                type="range"
                min="0"
                max="100"
                step="1"
                value={weights[key]}
                onChange={(e) =>
                  setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))
                }
              />
            </div>
          ))}
          <p className="fine-print">
            가중치 합계는 자동 정규화합니다. 모두 0이면 행동·관심사 기준을
            사용합니다.
          </p>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={unseen}
              onChange={(e) => setUnseen(e.target.checked)}
            />{" "}
            <span>미사용 앱만 추천</span>
          </label>
          <button className="text-button reset-button" onClick={reset}>
            <Icon name="refresh" size={15} />
            설정 초기화
          </button>
        </section>
      </aside>
      <div className="lab-results">
        <div className="results-heading">
          <div className="eyebrow">PERSONALIZED DISCOVERY</div>
          <h2>나에게 맞는 다음 앱</h2>
          <p>세 가지 신호를 결합하고, 비슷한 앱의 중복을 줄여 추천합니다.</p>
          <span className="live-chip">
            <i />
            가중치 변경 즉시 재계산
          </span>
        </div>
        {results.length ? (
          results.map((r, i) => (
            <article
              className="recommendation-card"
              key={r.app.id}
              data-recommendation-id={r.app.id}
            >
              <div className="rec-top">
                <span className="rank">0{i + 1}</span>
                <AppMark app={r.app} large />
                <div className="rec-app">
                  <h3>{r.app.name}</h3>
                  <span>{r.app.tagline}</span>
                  <small>{r.app.category}</small>
                </div>
                <div className="rec-score">
                  <b data-testid="recommendation-score">
                    {(r.score * 100).toFixed(1)}
                  </b>
                  <span>적합도 점수 / 100</span>
                  <small>순위 점수 {(r.selectionScore * 100).toFixed(1)}</small>
                </div>
              </div>
              <div className="rec-reason">
                <Icon name="spark" size={17} />
                {r.reason}
                {r.coldStart && <span className="chip">Cold start</span>}
              </div>
              <div className="explanation-header">
                <span>SCORE BREAKDOWN</span>
                <b>점수가 만들어진 이유</b>
              </div>
              <div className="score-stack">
                {(Object.keys(labels) as (keyof Weights)[]).map((key) => (
                  <div
                    key={key}
                    className={`segment-${key}`}
                    style={{
                      width: `${r.score ? (r.contributions[key] / r.score) * 100 : 0}%`,
                    }}
                    title={`${labels[key]} 기여도 ${(r.contributions[key] * 100).toFixed(1)}점`}
                  />
                ))}
              </div>
              <div className="contribution-grid">
                {(Object.keys(labels) as (keyof Weights)[]).map((key) => (
                  <div key={key}>
                    <span>
                      <i className={`segment-${key}`} />
                      {labels[key]}
                    </span>
                    <b>
                      {(r.contributions[key] * 100).toFixed(1)}
                      <small>점</small>
                    </b>
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          <section className="panel empty-state">
            <Icon name="spark" size={35} />
            <h3>조건에 맞는 앱이 없어요.</h3>
            <p>미사용 앱 조건을 해제하거나 다른 이용자를 선택해보세요.</p>
          </section>
        )}
        <div className="model-note">
          <Icon name="shield" size={20} />
          <div>
            <b>설명 가능한 추천, 재현 가능한 결과</b>
            <p>
              학습 구간은 7.09–9.16입니다. 9.17–9.30 이벤트는 평가에만
              사용합니다. 표시 점수는 추천 신호의 합이며 확률이 아닙니다.
              순위에는 다양성 패널티 0.12도 적용합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

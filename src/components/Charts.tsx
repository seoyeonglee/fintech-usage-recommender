import { useState } from "react";
import { dayLabel } from "../domain/catalog.js";
import type { Daily } from "../domain/types.js";
export function TrendChart({
  daily,
  metric,
}: {
  daily: Daily[];
  metric: "activeUsers" | "sessions";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760,
    H = 252,
    L = 38,
    R = 20,
    T = 18,
    B = 35;
  const max = Math.max(20, ...daily.map((d) => d[metric])),
    ceiling = Math.ceil(max / 50) * 50;
  const x = (i: number) => L + (i * (W - L - R)) / (daily.length - 1 || 1),
    y = (v: number) => H - B - (v / ceiling) * (H - T - B);
  const points = daily.map((d, i) => `${x(i)},${y(d[metric])}`).join(" ");
  const area = `M${L},${H - B} L${points.replaceAll(" ", " L")} L${x(daily.length - 1)},${H - B} Z`;
  const current = hover === null ? null : daily[hover];
  return (
    <div className="trend-wrap">
      <svg
        className="trend"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${dayLabel(daily[0]?.day ?? 0)}부터 일별 ${metric === "activeUsers" ? "활성 사용자" : "세션"} 추이`}
      >
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a8065" stopOpacity=".17" />
            <stop offset="100%" stopColor="#2a8065" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {Array.from({ length: 5 }, (_, i) => {
          const value = (ceiling * i) / 4;
          return (
            <g key={i}>
              <line
                x1={L}
                y1={y(value)}
                x2={W - R}
                y2={y(value)}
                stroke="#e8ebe4"
                strokeDasharray="3 4"
              />
              <text x={L - 10} y={y(value) + 4} textAnchor="end">
                {value}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#area)" />
        <polyline
          points={points}
          fill="none"
          stroke="#247459"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {[
          0,
          Math.floor((daily.length - 1) / 3),
          Math.floor(((daily.length - 1) * 2) / 3),
          daily.length - 1,
        ].map((i, n) => (
          <text
            key={n}
            x={x(i)}
            y={H - 6}
            textAnchor={n === 0 ? "start" : n === 3 ? "end" : "middle"}
          >
            {dayLabel(daily[i].day, true)}
          </text>
        ))}
        {daily.map((d, i) => (
          <rect
            data-chart-point
            key={d.day}
            x={x(i) - 10}
            y={T}
            width={20}
            height={H - T - B}
            fill="transparent"
            tabIndex={0}
            aria-label={`${dayLabel(d.day)}: ${d[metric]}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          />
        ))}
        {hover !== null && (
          <g pointerEvents="none">
            <line
              x1={x(hover)}
              y1={T}
              x2={x(hover)}
              y2={H - B}
              stroke="#2b795c"
              strokeDasharray="4 4"
            />
            <circle
              cx={x(hover)}
              cy={y(daily[hover][metric])}
              r="5"
              fill="#247459"
              stroke="white"
              strokeWidth="3"
            />
          </g>
        )}
      </svg>
      {current && (
        <div className="chart-tooltip">
          {dayLabel(current.day, true)} ·{" "}
          <b>{current[metric].toLocaleString("ko-KR")}</b>{" "}
          {metric === "activeUsers" ? "명" : "건"}
        </div>
      )}
    </div>
  );
}
export function Donut({
  parts,
  total,
}: {
  parts: { name: string; value: number; color: string }[];
  total: number;
}) {
  let offset = 0;
  const circumference = 2 * Math.PI * 62;
  return (
    <div className="donut">
      <svg
        viewBox="0 0 160 160"
        role="img"
        aria-label={`이용자 구성: ${parts.map((p) => `${p.name} ${p.value}명`).join(", ")}`}
      >
        <circle
          cx="80"
          cy="80"
          r="62"
          fill="none"
          stroke="#eef0e9"
          strokeWidth="18"
        />
        {parts.map((p) => {
          const share = total ? p.value / total : 0,
            start = offset;
          offset += share;
          return (
            <circle
              key={p.name}
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke={p.color}
              strokeWidth="18"
              strokeDasharray={`${Math.max(0, share * circumference - 3)} ${circumference}`}
              strokeDashoffset={-start * circumference}
              transform="rotate(-90 80 80)"
            />
          );
        })}
      </svg>
      <div className="donut-center">
        <b>{total.toLocaleString("ko-KR")}</b>
        <span>활성 이용자</span>
      </div>
    </div>
  );
}

import type { AppInfo } from "../domain/types.js";
import { Icon, type IconName } from "./Icons.js";
export const number = (n: number, d = 0) =>
  n.toLocaleString("ko-KR", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
export const percent = (n: number | null, d = 1) =>
  n === null ? "—" : `${(n * 100).toFixed(d)}%`;
export function AppMark({
  app,
  large = false,
}: {
  app: AppInfo;
  large?: boolean;
}) {
  return (
    <span
      className={`app-mark ${large ? "large" : ""}`}
      style={{ background: app.color }}
    >
      {app.letter}
    </span>
  );
}
export function Kpi({
  label,
  value,
  unit,
  icon,
  change,
  note,
  highlight = false,
  testId,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: IconName;
  change?: number | null;
  note?: string;
  highlight?: boolean;
  testId?: string;
}) {
  return (
    <article className={`kpi ${highlight ? "kpi-highlight" : ""}`}>
      <div className="kpi-top">
        <span>{label}</span>
        <Icon name={icon} size={18} />
      </div>
      <div className="kpi-value" data-testid={testId}>
        {value}
        <span>{unit}</span>
      </div>
      <div className="kpi-note">
        {change !== undefined && change !== null ? (
          <>
            <span className={change >= 0 ? "delta" : "delta negative"}>
              {change >= 0 ? "↗" : "↘"} {Math.abs(change).toFixed(1)}%
            </span>
            <span>직전 동일 기간 대비</span>
          </>
        ) : (
          <span>{note}</span>
        )}
      </div>
    </article>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

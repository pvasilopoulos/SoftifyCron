import type { SparkDay } from "@/lib/sparkline";

export function Sparkline({
  days,
  title = "Last 7 days",
}: {
  days?: SparkDay[] | null;
  title?: string;
}) {
  if (!days?.length) return null;
  return (
    <span className="spark" title={title} aria-label={title}>
      {days.map((day, index) => {
        const total = day.ok + day.bad;
        const cls = total === 0 ? "spark-empty" : day.bad > 0 ? "spark-bad" : "spark-ok";
        return <span key={index} className={`spark-bar ${cls}`} />;
      })}
    </span>
  );
}

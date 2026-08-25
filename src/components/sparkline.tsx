import { emptySpark, type SparkDay } from "@/lib/sparkline";

export function Sparkline({
  days,
  title = "Last 7 days",
}: {
  days?: SparkDay[] | null;
  title?: string;
}) {
  const series = days?.length ? days : emptySpark(7);
  const fails = series.reduce((sum, day) => sum + day.bad, 0);
  const oks = series.reduce((sum, day) => sum + day.ok, 0);
  return (
    <span className="spark" title={`${title}: ${oks} ok, ${fails} failed`} aria-label={title}>
      {series.map((day, index) => {
        const total = day.ok + day.bad;
        const cls = total === 0 ? "spark-empty" : day.bad > 0 ? "spark-bad" : "spark-ok";
        return <span key={index} className={`spark-bar ${cls}`} />;
      })}
    </span>
  );
}

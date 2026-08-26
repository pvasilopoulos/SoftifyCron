"use client";

import { useMemo, useState } from "react";
import { extractColumnSeries, seriesExtent } from "@/lib/grid-series";

export function GridSeriesChart({
  runs,
  columns,
}: {
  runs: Array<{ startedAt: string; responseBody: string | null }>;
  columns: string[];
}) {
  const [column, setColumn] = useState(columns[0] ?? "");
  const points = useMemo(() => extractColumnSeries(runs, column), [runs, column]);
  const extent = seriesExtent(points);

  if (columns.length === 0) return null;

  const width = 320;
  const height = 88;
  const path = points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((point.value - extent.min) / (extent.max - extent.min)) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-dim">Column over time</p>
          <p className="text-sm text-ink-dim">{points.length} numeric samples from stored runs</p>
        </div>
        <label className="block min-w-40">
          <span className="sr-only">Column</span>
          <select className="field" value={column} onChange={(event) => setColumn(event.target.value)}>
            {columns.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      {points.length < 2 ? (
        <p className="mt-4 text-sm text-ink-dim">Need at least two numeric samples in this column.</p>
      ) : (
        <svg className="mt-4 w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${column} sparkline`}>
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-gold" />
        </svg>
      )}
    </section>
  );
}

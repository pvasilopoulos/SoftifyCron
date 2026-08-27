import { PortalShell } from "@/components/portal-shell";
import { requirePortalAccess } from "@/lib/portal-access";
import { listPortalJobs } from "@/lib/portal";
import { monthlyOpsRows } from "@/lib/monthly-report";
import { reportMonthRange } from "@/lib/report";

export const metadata = { title: "Monthly report" };
export const dynamic = "force-dynamic";

export default async function PortalReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const access = await requirePortalAccess();
  const { month } = await searchParams;
  const jobs = await listPortalJobs(access.tenant.id, access.groupIds);
  const { rows, key } = await monthlyOpsRows(access.tenant.id, {
    month,
    jobIds: jobs.map((job) => job.id),
  });
  const { start } = reportMonthRange(month);
  const prev = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const title = access.client?.name ?? access.tenant.name;
  const logoUrl = access.client?.logoUrl || access.tenant.statusLogoUrl;
  const totals = rows.reduce(
    (acc, row) => ({
      runs: acc.runs + row.runs,
      failed: acc.failed + row.failed,
      incidents: acc.incidents + row.incidents,
      openMinutes: acc.openMinutes + row.openMinutes,
    }),
    { runs: 0, failed: 0, incidents: 0, openMinutes: 0 },
  );

  return (
    <PortalShell title="Monthly report" kicker={title} logoUrl={logoUrl}>
      <p className="text-sm text-ink-dim">{key} · {rows.length} jobs</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a className="btn btn-gold" href={`/api/portal/report?month=${key}&format=csv`}>
          Download CSV
        </a>
        <a className="btn btn-ghost" href={`/api/portal/report?month=${key}&format=pdf`}>
          Download PDF
        </a>
        <a className="btn btn-ghost" href={`/portal/report?month=${prevKey}`}>
          Previous month
        </a>
      </div>
      <div className="mt-6 overflow-x-auto card p-4">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Type</th>
              <th>Runs</th>
              <th>Failed</th>
              <th>Incidents</th>
              <th>Open minutes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.job}>
                <td>{row.job}</td>
                <td>{row.type}</td>
                <td>{row.runs}</td>
                <td>{row.failed}</td>
                <td>{row.incidents}</td>
                <td>{Math.round(row.openMinutes)}</td>
              </tr>
            ))}
            <tr>
              <td>Total</td>
              <td></td>
              <td>{totals.runs}</td>
              <td>{totals.failed}</td>
              <td>{totals.incidents}</td>
              <td>{Math.round(totals.openMinutes)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}

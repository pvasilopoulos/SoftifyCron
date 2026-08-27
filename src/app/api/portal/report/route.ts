import { NextResponse } from "next/server";
import { loadPortalAccess } from "@/lib/portal-access";
import { jsonError } from "@/lib/http";
import { monthlyOpsRows } from "@/lib/monthly-report";
import { monthlyOpsCsv, monthlyOpsPdf } from "@/lib/report";
import { listPortalJobs } from "@/lib/portal";

export async function GET(request: Request) {
  const access = await loadPortalAccess();
  if (!access) return jsonError("Unauthorized", 401);
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const format = searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const jobs = await listPortalJobs(access.tenant.id, access.groupIds);
  const jobIds = jobs.map((job) => job.id);
  const { rows, key } = await monthlyOpsRows(access.tenant.id, { month, jobIds });
  const title = access.client?.name ?? access.tenant.name;
  if (format === "pdf") {
    const pdf = monthlyOpsPdf(`${title} ops`, key, rows);
    return new NextResponse(pdf, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="ops-${key}.pdf"`,
      },
    });
  }
  return new NextResponse(monthlyOpsCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ops-${key}.csv"`,
    },
  });
}

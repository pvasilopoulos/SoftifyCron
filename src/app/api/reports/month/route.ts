import { NextResponse } from "next/server";
import { monthlyOpsRows } from "@/lib/monthly-report";
import { monthlyOpsCsv } from "@/lib/report";
import { getTenantSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getTenantSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month");
  const { rows, key } = await monthlyOpsRows(session.tid, { month });
  const csv = monthlyOpsCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ops-${key}.csv"`,
    },
  });
}

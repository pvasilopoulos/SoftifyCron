"use client";

import Link from "next/link";

export function JobMenu({
  jobId,
  keepResponse,
  canManage,
}: {
  jobId: string;
  keepResponse: boolean;
  canManage: boolean;
}) {
  return (
    <details className="relative">
      <summary className="btn btn-ghost min-h-10 cursor-pointer list-none px-3">
        Menu
      </summary>
      <div className="absolute right-0 z-20 mt-2 min-w-44 rounded-2xl border border-line bg-bg-elev p-2 shadow-lg">
        <Link href={`/jobs/${jobId}`} className="block rounded-xl px-3 py-2 text-sm hover:bg-bg-mute">
          Open
        </Link>
        {keepResponse ? (
          <Link
            href={`/jobs/${jobId}/response`}
            className="block rounded-xl px-3 py-2 text-sm hover:bg-bg-mute"
          >
            View response
          </Link>
        ) : null}
        {canManage ? (
          <Link
            href={`/jobs/${jobId}/edit`}
            className="block rounded-xl px-3 py-2 text-sm hover:bg-bg-mute"
          >
            Edit
          </Link>
        ) : null}
      </div>
    </details>
  );
}

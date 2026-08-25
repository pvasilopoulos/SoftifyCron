export async function postJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  }
  return data;
}

export async function runJobRequest(jobId: string) {
  return postJson(`/api/jobs/${jobId}/run`, { method: "POST" });
}

export async function toggleJobRequest(jobId: string, enabled: boolean) {
  return postJson(`/api/jobs/${jobId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
}

export async function duplicateJobRequest(jobId: string) {
  return postJson(`/api/jobs/${jobId}/duplicate`, { method: "POST" });
}

export async function deleteJobRequest(jobId: string) {
  return postJson(`/api/jobs/${jobId}`, { method: "DELETE" });
}

export async function skipJobRequest(jobId: string) {
  return postJson(`/api/jobs/${jobId}/skip`, { method: "POST" });
}

export async function snoozeJobRequest(jobId: string, hours: number) {
  return postJson(`/api/jobs/${jobId}/snooze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ hours }),
  });
}

export async function ackJobRequest(jobId: string, note = "") {
  return postJson(`/api/jobs/${jobId}/ack`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ note }),
  });
}

export async function previewJobRequest(jobId: string) {
  return postJson(`/api/jobs/${jobId}/preview`, { method: "POST" });
}

export async function muteJobRequest(jobId: string, event: string, hours: number) {
  return postJson(`/api/jobs/${jobId}/mute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event, hours }),
  });
}

export async function commentRunRequest(runId: string, comment: string) {
  return postJson(`/api/runs/${runId}/comment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ comment }),
  });
}

export async function saveJobViewRequest(
  jobId: string,
  view: {
    name: string;
    visible?: string[];
    freeze?: boolean;
    compact?: boolean;
    wrap?: boolean;
    pageSize?: number;
  },
) {
  return postJson(`/api/jobs/${jobId}/views`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(view),
  });
}

export async function deleteJobViewRequest(jobId: string, viewId: string) {
  return postJson(`/api/jobs/${jobId}/views`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ viewId }),
  });
}

export function confirmDeleteJob(name: string) {
  return confirm(`Delete “${name}” and its run history? This cannot be undone.`);
}

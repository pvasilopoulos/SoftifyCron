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

export function confirmDeleteJob(name: string) {
  return confirm(`Delete “${name}” and its run history? This cannot be undone.`);
}

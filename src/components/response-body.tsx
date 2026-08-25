"use client";

import { useState } from "react";

export function ResponseBody({ body }: { body: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button className="btn btn-ghost" type="button" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mono max-h-[70vh] overflow-auto whitespace-pre-wrap break-all rounded-2xl bg-bg p-4 text-xs text-gold-2">
        {body}
      </pre>
    </div>
  );
}

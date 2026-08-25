import { HTTP_METHODS } from "@/lib/constants";

export type JobTemplateValues = {
  name: string;
  type: string;
  cronExpr: string;
  method: (typeof HTTP_METHODS)[number];
  url: string;
  body?: string;
  keepResponse: boolean;
  responseBoard: boolean;
};

export type JobTemplate = {
  id: string;
  name: string;
  hint: string;
  values: JobTemplateValues;
};

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: "heartbeat",
    name: "Heartbeat every 5 min",
    hint: "GET health ping. Missed beat alerts if it goes silent.",
    values: {
      name: "Site heartbeat",
      type: "HEARTBEAT",
      cronExpr: "*/5 * * * *",
      method: "GET",
      url: "https://example.com/health",
      keepResponse: false,
      responseBoard: false,
    },
  },
  {
    id: "nightly-feed",
    name: "Nightly XML feed",
    hint: "03:00 GET, keep the body on Responses.",
    values: {
      name: "Nightly feed",
      type: "HTTP",
      cronExpr: "0 3 * * *",
      method: "GET",
      url: "https://example.com/feed.xml",
      keepResponse: true,
      responseBoard: true,
    },
  },
  {
    id: "webhook",
    name: "Hourly webhook POST",
    hint: "JSON POST every hour.",
    values: {
      name: "Hourly webhook",
      type: "WEBHOOK",
      cronExpr: "0 * * * *",
      method: "POST",
      url: "https://example.com/hooks/cron",
      body: '{"source":"softifycron"}',
      keepResponse: true,
      responseBoard: false,
    },
  },
];

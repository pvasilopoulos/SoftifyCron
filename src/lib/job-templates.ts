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
  assertContains?: string;
  assertEquals?: string;
  assertStatus?: number;
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
    id: "keyword",
    name: "Keyword on homepage",
    hint: "GET the URL and fail if the text is missing.",
    values: {
      name: "Homepage keyword",
      type: "HTTP",
      cronExpr: "*/10 * * * *",
      method: "GET",
      url: "https://example.com",
      keepResponse: true,
      responseBoard: false,
      assertContains: "Example Domain",
    },
  },
  {
    id: "tls",
    name: "TLS expiry",
    hint: "Fail if the certificate has fewer than 14 days left.",
    values: {
      name: "TLS expiry",
      type: "TLS",
      cronExpr: "0 8 * * *",
      method: "GET",
      url: "example.com:443",
      keepResponse: true,
      responseBoard: false,
      assertStatus: 14,
    },
  },
  {
    id: "tcp",
    name: "TCP port check",
    hint: "Open a TCP connection to host:port.",
    values: {
      name: "TCP 443",
      type: "TCP",
      cronExpr: "*/5 * * * *",
      method: "GET",
      url: "example.com:443",
      keepResponse: false,
      responseBoard: false,
    },
  },
  {
    id: "dns",
    name: "DNS lookup",
    hint: "Resolve a hostname. Set expected IP in Equals if you want a pin.",
    values: {
      name: "DNS example.com",
      type: "DNS",
      cronExpr: "*/15 * * * *",
      method: "GET",
      url: "example.com",
      keepResponse: true,
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

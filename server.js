"use strict";

const { createServer } = require("http");
const { parse } = require("url");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || "0.0.0.0";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fallbackPage(title, detail) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #0b0d10; color: #e8eaed; }
    main { max-width: 40rem; margin: 12vh auto; padding: 0 1.5rem; }
    h1 { font-size: 1.75rem; margin: 0 0 .75rem; }
    p, li { color: #b7bcc4; line-height: 1.55; }
    code { background: #171a1f; padding: .1rem .35rem; border-radius: 4px; color: #e7c07a; }
    ol { padding-left: 1.2rem; }
    pre { background: #171a1f; padding: 1rem; border-radius: 8px; overflow: auto; font-size: .85rem; color: #9aa3ad; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <p style="letter-spacing:.2em;text-transform:uppercase;color:#c4a15a;font-size:.7rem;">SoftifyCron</p>
    <h1>${escapeHtml(title)}</h1>
    <p>The Node process started, but Next.js is not ready. In Plesk Node.js:</p>
    <ol>
      <li>Click <strong>NPM Install</strong> and wait until it finishes</li>
      <li>Run Node.js script: <code>deploy</code> (type only that name — Plesk runs <code>npm run deploy</code>)</li>
      <li>Confirm the startup file is <code>server.js</code></li>
      <li><strong>Restart App</strong></li>
    </ol>
    ${detail ? `<pre>${escapeHtml(detail)}</pre>` : ""}
  </main>
</body>
</html>`;
}

function listenFallback(title, detail) {
  console.error("[softifycron]", title);
  if (detail) console.error(detail);
  createServer((req, res) => {
    const url = req.url || "/";
    if (url.startsWith("/favicon.ico")) {
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.startsWith("/api/health")) {
      res.writeHead(503, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      res.end(
        JSON.stringify({
          ok: false,
          service: "softifycron",
          reason: "not_ready",
          title,
        }),
      );
      return;
    }
    res.writeHead(503, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(fallbackPage(title, detail));
  }).listen(port, hostname, () => {
    console.log(`[softifycron] fallback listening on ${hostname}:${port} (${title})`);
  });
}

function hasProductionBuild() {
  return fs.existsSync(path.join(__dirname, ".next", "BUILD_ID"));
}

function start() {
  let next;
  try {
    next = require("next");
  } catch (error) {
    listenFallback(
      "Node modules are missing",
      "Click NPM Install in Plesk, wait until it finishes, then run script deploy and Restart App.\n\n" +
        (error && error.stack ? error.stack : String(error)),
    );
    return;
  }

  if (!hasProductionBuild()) {
    listenFallback(
      "Production build is missing",
      "Plesk Git pull does not create .next. Run Node.js script deploy (migrate + build), then Restart App.",
    );
    return;
  }

  const app = next({ dev: false, hostname, port });
  const handle = app.getRequestHandler();
  app
    .prepare()
    .then(() => {
      createServer((req, res) => {
        handle(req, res, parse(req.url, true));
      }).listen(port, hostname, () => {
        console.log(`[softifycron] listening on ${hostname}:${port}`);
      });
    })
    .catch((error) => {
      listenFallback(
        "Next.js failed to start",
        error && error.stack ? error.stack : String(error),
      );
    });
}

start();

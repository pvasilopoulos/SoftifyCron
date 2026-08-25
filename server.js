const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || "0.0.0.0";
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
    console.error("[softifycron] failed to start", error);
    process.exit(1);
  });

import net from "node:net";
import tls from "node:tls";
import type { CronJob } from "@prisma/client";
import {
  assertSafeHost,
  certExpiresTooSoon,
  dnsMatchesExpected,
  parseProbeTarget,
  type ProbeKind,
} from "./probes";

function timeoutMs(job: CronJob) {
  return Math.min(120_000, Math.max(1000, job.timeoutMs || 30_000));
}

function tcpConnect(host: string, port: number, ms: number) {
  return new Promise<void>((resolve, reject) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve();
    });
    socket.setTimeout(ms, () => {
      socket.destroy();
      reject(Object.assign(new Error("Timed out"), { name: "TimeoutError" }));
    });
    socket.on("error", reject);
  });
}

function tlsInspect(host: string, port: number, ms: number) {
  return new Promise<{ validTo: Date | null }>((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      const validTo = cert?.valid_to ? new Date(cert.valid_to) : null;
      resolve({ validTo });
    });
    socket.setTimeout(ms, () => {
      socket.destroy();
      reject(Object.assign(new Error("Timed out"), { name: "TimeoutError" }));
    });
    socket.on("error", reject);
  });
}

export async function runProbe(job: CronJob) {
  const kind = job.type as ProbeKind;
  const target = parseProbeTarget(job.url, kind);
  const addresses = await assertSafeHost(target.host);
  const ms = timeoutMs(job);
  if (kind === "DNS") {
    const expected = job.assertEquals?.trim() ?? "";
    if (!dnsMatchesExpected(addresses, expected)) {
      return {
        httpStatus: null as number | null,
        responseBody: addresses.join("\n"),
        encoding: "utf-8",
        ok: false,
      };
    }
    return {
      httpStatus: null,
      responseBody: addresses.join("\n"),
      encoding: "utf-8",
      ok: true,
    };
  }
  if (kind === "TCP") {
    await tcpConnect(target.host, target.port, ms);
    return {
      httpStatus: null,
      responseBody: `tcp ${target.host}:${target.port} open`,
      encoding: "utf-8",
      ok: true,
    };
  }
  const tlsInfo = await tlsInspect(target.host, target.port, ms);
  const minDays = job.assertStatus > 0 ? job.assertStatus : 14;
  const validTo = tlsInfo.validTo;
  const body = validTo ? `certificate valid to ${validTo.toISOString()}` : "no certificate";
  if (!validTo || certExpiresTooSoon(validTo, minDays)) {
    return { httpStatus: null, responseBody: body, encoding: "utf-8", ok: false };
  }
  return { httpStatus: null, responseBody: body, encoding: "utf-8", ok: true };
}

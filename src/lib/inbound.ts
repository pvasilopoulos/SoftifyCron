import { hashToken, randomToken } from "./crypto";

export function newHookToken() {
  const token = `hk_${randomToken()}`;
  return {
    token,
    hash: hashToken(token),
    prefix: token.slice(0, 10),
  };
}

export function hookUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/api/hooks/${encodeURIComponent(token)}`;
}

export function newPortalToken() {
  const token = `pt_${randomToken()}`;
  return {
    token,
    hash: hashToken(token),
    prefix: token.slice(0, 10),
  };
}

export function portalUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/portal/${encodeURIComponent(token)}`;
}

export function ackUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/api/ack/${encodeURIComponent(token)}`;
}

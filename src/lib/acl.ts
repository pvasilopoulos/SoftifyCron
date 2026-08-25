import type { Role } from "@prisma/client";

export function canManage(role: Role) {
  return role === "OWNER" || role === "ADMIN";
}

export const JOB_TYPES = ["HTTP", "HEARTBEAT", "WEBHOOK"] as const;

export const GROUP_COLORS = [
  "#7dffce",
  "#8b9cff",
  "#ffc46b",
  "#ff8fab",
  "#7ec8ff",
  "#c4b5fd",
];

export function capHit(used: number, cap: number) {
  return cap > 0 && used >= cap;
}

export function capWarn(used: number, cap: number) {
  if (cap <= 0) return false;
  return used / cap >= 0.8;
}

export function capLabel(used: number, cap: number) {
  if (cap <= 0) return `${used} (unlimited)`;
  return `${used} / ${cap}`;
}

export type GridView = {
  id: string;
  name: string;
  visible?: string[];
  freeze?: boolean;
  compact?: boolean;
  wrap?: boolean;
  pageSize?: number;
};

export function parseGridViews(raw: unknown): GridView[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is GridView => {
      if (!item || typeof item !== "object") return false;
      const view = item as { id?: unknown; name?: unknown };
      return typeof view.id === "string" && typeof view.name === "string" && Boolean(view.id && view.name);
    })
    .slice(0, 20);
}

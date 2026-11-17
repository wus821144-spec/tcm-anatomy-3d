export type BilingualMap = Record<string, string>;

export async function loadBilingualDict(): Promise<BilingualMap> {
  try {
    const r = await fetch('/data/zh_dict.json');
    if (!r.ok) return {};
    return (await r.json()) as BilingualMap;
  } catch {
    return {};
  }
}

export function formatBilingualName(enName: string, dict: BilingualMap): string {
  if (!enName) return '';
  const key = enName.toLowerCase().trim();
  const zh = dict[key];
  return zh ? `${zh} · ${enName}` : enName;
}

export function matchesBilingualQuery(enName: string, query: string, dict: BilingualMap): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (enName.toLowerCase().includes(q)) return true;
  const zh = dict[enName.toLowerCase().trim()];
  return !!zh && zh.toLowerCase().includes(q);
}

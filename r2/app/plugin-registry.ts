export type CarbonAccent = 'amber' | 'jade' | 'titanium' | 'cyan';

export interface R2Plugin {
  id: string;
  name: string;
  version: string;
  category: 'theme' | 'tcm' | 'anatomy' | 'tool';
}

class PluginRegistry {
  private plugins = new Map<string, R2Plugin>();

  register(plugin: R2Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  list(): R2Plugin[] {
    return Array.from(this.plugins.values());
  }
}

export const r2Plugins = new PluginRegistry();

export const CARBON_ACCENTS: { id: CarbonAccent; label: string; hex: string }[] = [
  { id: 'amber', label: '琥珀金', hex: '#f59e0b' },
  { id: 'jade', label: '翠玉青', hex: '#10b981' },
  { id: 'titanium', label: '钛银白', hex: '#e2e8f0' },
  { id: 'cyan', label: '天然蓝', hex: '#38bdf8' }
];

export function applyCarbonAccent(accent: CarbonAccent): void {
  document.documentElement.setAttribute('data-carbon-accent', accent);
  try { localStorage.setItem('r2_carbon_accent', accent); } catch {}
}

export function loadSavedCarbonAccent(): CarbonAccent {
  try {
    const v = localStorage.getItem('r2_carbon_accent') as CarbonAccent | null;
    if (v && CARBON_ACCENTS.some((a) => a.id === v)) return v;
  } catch {}
  return 'amber';
}

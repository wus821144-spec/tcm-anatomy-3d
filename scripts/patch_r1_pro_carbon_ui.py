#!/usr/bin/env python3
"""
R1-Pro Carbon-Ink Black + Luminous Natural Blue Flagship UI Overhaul
- Pure CSS injection (id="r1-pro-carbon-ui") before closing head tag
- Preserves 100% of existing DOM IDs, JS listeners, and safe-area insets
- Adds per-layer glowing color dots on #layer-dock buttons matching 3D layer colors
"""
import os

LT = chr(60)

CARBON_CSS = r"""
:root {
  --bg-core: #05070b;
  --bg-elevated: #0a0e14;
  --bg-glow: #0c1829;
  --glass: rgba(8, 11, 17, 0.80);
  --glass-strong: rgba(6, 9, 14, 0.92);
  --border: rgba(148, 163, 184, 0.13);
  --border-blue: rgba(56, 189, 248, 0.42);
  --text: #f1f5f9;
  --muted: #8b9bb4;
  --accent: #38bdf8;
  --accent-deep: #0ea5e9;
  --female: #f472b6;
}

html, body {
  background: radial-gradient(ellipse 85% 65% at 50% 42%, #0c1728 0%, #05070b 72%, #020305 100%) !important;
  color: var(--text) !important;
}

#view-3d::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    radial-gradient(circle at 50% 46%, rgba(14, 165, 233, 0.08) 0%, transparent 56%),
    linear-gradient(rgba(56, 189, 248, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(56, 189, 248, 0.025) 1px, transparent 1px);
  background-size: 100% 100%, 44px 44px, 44px 44px;
}

.glass {
  background: var(--glass) !important;
  border: 1px solid var(--border) !important;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.62),
    inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
  backdrop-filter: blur(22px) saturate(145%) !important;
  -webkit-backdrop-filter: blur(22px) saturate(145%) !important;
}

#splash {
  background: radial-gradient(circle at 50% 38%, #0e1d33 0%, #05070b 76%) !important;
}
.splash-logo {
  width: 76px !important;
  height: 76px !important;
  border-radius: 24px !important;
  background: linear-gradient(145deg, rgba(14, 165, 233, 0.22), rgba(5, 7, 11, 0.92)) !important;
  border: 1px solid rgba(56, 189, 248, 0.52) !important;
  box-shadow: 0 0 36px rgba(14, 165, 233, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
}

.search-box {
  border-radius: 14px !important;
  padding: 8px 13px !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.search-box:focus-within {
  border-color: var(--border-blue) !important;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.22), 0 12px 28px rgba(0, 0, 0, 0.6) !important;
}
.search-box input::placeholder {
  color: #64748b;
}

.seg-gender {
  border-radius: 14px !important;
  padding: 3px !important;
}
.seg-btn {
  border-radius: 10px !important;
  transition: all 0.18s ease;
}
.seg-btn.active-male {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.30), rgba(56, 189, 248, 0.14)) !important;
  color: #7dd3fc !important;
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.42);
}
.seg-btn.active-female {
  background: linear-gradient(135deg, rgba(244, 114, 182, 0.28), rgba(236, 72, 153, 0.14)) !important;
  color: #f9a8d4 !important;
  box-shadow: inset 0 0 0 1px rgba(244, 114, 182, 0.42);
}

.tool-strip {
  gap: 7px !important;
  padding: 2px 1px 4px !important;
}
.btn {
  padding: 7px 12px !important;
  border-radius: 11px !important;
  font-size: 11.5px !important;
  color: #cbd5e1 !important;
  transition: transform 0.14s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease !important;
}
.btn:active {
  transform: scale(0.95) !important;
}
.btn.on {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.26), rgba(56, 189, 248, 0.12)) !important;
  border-color: rgba(56, 189, 248, 0.68) !important;
  color: #e0f2fe !important;
  box-shadow: 0 0 16px rgba(14, 165, 233, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
}

.right-dock {
  gap: 6px !important;
}
.layer-btn {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 6px !important;
  padding: 6px 10px !important;
  border-radius: 11px !important;
  font-size: 11px !important;
  color: #8b9bb4 !important;
  min-width: 80px;
  transition: all 0.18s ease !important;
}
.layer-btn::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #64748b;
  opacity: 0.55;
  transition: transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
}
.layer-btn.on {
  color: #e0f2fe !important;
  border-color: rgba(56, 189, 248, 0.58) !important;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(7, 10, 16, 0.88)) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45), 0 0 10px rgba(14, 165, 233, 0.16) !important;
}
.layer-btn.on::before {
  opacity: 1;
  transform: scale(1.12);
}
.layer-btn[data-layer="Skin"]::before { background: #d6a88f; box-shadow: 0 0 6px #d6a88f; }
.layer-btn[data-layer="LigamentJoint"]::before { background: #bae6fd; box-shadow: 0 0 6px #bae6fd; }
.layer-btn[data-layer="Muscular"]::before { background: #c84b3e; box-shadow: 0 0 6px #c84b3e; }
.layer-btn[data-layer="Skeleton"]::before { background: #ebe2ce; box-shadow: 0 0 6px #ebe2ce; }
.layer-btn[data-layer="Visceral"]::before { background: #e07a5f; box-shadow: 0 0 6px #e07a5f; }
.layer-btn[data-layer="Arterial"]::before { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
.layer-btn[data-layer="Venous"]::before { background: #3b82f6; box-shadow: 0 0 6px #3b82f6; }
.layer-btn[data-layer="Nervous"]::before { background: #facc15; box-shadow: 0 0 6px #facc15; }
.layer-btn[data-layer="Lymphatic"]::before { background: #10b981; box-shadow: 0 0 6px #10b981; }
.layer-btn[data-layer="Points"]::before { background: #38bdf8; box-shadow: 0 0 6px #38bdf8; }

.left-dock {
  border-radius: 16px !important;
  padding: 11px 12px !important;
  border-color: rgba(56, 189, 248, 0.22) !important;
}

.toast {
  background: rgba(6, 9, 15, 0.88) !important;
  border: 1px solid rgba(56, 189, 248, 0.28) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65), 0 0 14px rgba(14, 165, 233, 0.14) !important;
  color: #e0f2fe !important;
  padding: 7px 16px !important;
  font-weight: 500;
}

.bottom-nav {
  background: rgba(5, 7, 11, 0.94) !important;
  border-top: 1px solid rgba(56, 189, 248, 0.18) !important;
  backdrop-filter: blur(22px) !important;
  -webkit-backdrop-filter: blur(22px) !important;
}
.nav-item {
  position: relative;
  color: #7c8ca3 !important;
  transition: color 0.18s ease;
}
.nav-item.active {
  color: #38bdf8 !important;
}
.nav-item.active::after {
  content: "";
  position: absolute;
  top: 0;
  width: 26px;
  height: 2.5px;
  border-radius: 0 0 3px 3px;
  background: linear-gradient(90deg, #0ea5e9, #38bdf8);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.75);
}

.drawer {
  background: var(--glass-strong) !important;
  border-top: 1px solid rgba(56, 189, 248, 0.35) !important;
  border-radius: 24px 24px 0 0 !important;
  box-shadow: 0 -16px 42px rgba(0, 0, 0, 0.78) !important;
}
.block {
  background: rgba(13, 19, 30, 0.78) !important;
  border: 1px solid rgba(148, 163, 184, 0.14) !important;
  border-radius: 14px !important;
}
.card {
  background: rgba(10, 14, 22, 0.86) !important;
  border: 1px solid rgba(148, 163, 184, 0.14) !important;
  border-radius: 16px !important;
}
.chip.active, .tab-btn.active {
  border-color: rgba(56, 189, 248, 0.65) !important;
  color: #7dd3fc !important;
  background: rgba(14, 165, 233, 0.18) !important;
}
"""


def inject_carbon_ui(path: str) -> None:
    if not os.path.exists(path):
        print(f"Skip missing {path}")
        return
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    style_tag = f'{LT}style id="r1-pro-carbon-ui">{CARBON_CSS}{LT}/style>'
    head_close = f'{LT}/head>'
    if 'id="r1-pro-carbon-ui"' in html:
        import re
        html = re.sub(
            rf'{LT}style id="r1-pro-carbon-ui">.*?{LT}/style>',
            style_tag,
            html,
            flags=re.DOTALL
        )
    elif head_close in html:
        html = html.replace(head_close, style_tag + "\n" + head_close, 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"{path}: injected Carbon-Ink + Natural Blue Flagship UI")


if __name__ == '__main__':
    for p in ['src/index.html', 'www/index.html']:
        inject_carbon_ui(p)

# EOF

#!/usr/bin/env python3
"""
R1-Pro Native App-Grade Carbon-Ink Black + Natural Blue UI Overhaul
Eliminates "HTML webpage" look and transforms the UI into a native mobile workstation:
- Disables web text-selection, callouts, and overscroll bounce globally (native touch feel)
- Groups #layer-dock into one unified floating Carbon-Ink capsule (instead of 10 separate HTML boxes)
- Replaces splash emoji with a crisp vector SVG medical-meridian emblem
- Adds native bottom-sheet grab handle on #drawer and edge-fade mask on .tool-strip
"""
import os
import re

LT = chr(60)

NATIVE_SVG_LOGO = (
    f'{LT}svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">'
    f'{LT}circle cx="18" cy="18" r="15.5" stroke="#38bdf8" stroke-width="1.4" stroke-opacity="0.65"/>'
    f'{LT}path d="M18 5C14 10.5 22 14.5 18 20C14 25.5 22 28.5 18 31" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>'
    f'{LT}path d="M18 5C22 10.5 14 14.5 18 20C22 25.5 14 28.5 18 31" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-opacity="0.7"/>'
    f'{LT}circle cx="18" cy="12" r="2" fill="#e0f2fe"/>'
    f'{LT}circle cx="18" cy="20" r="2.2" fill="#38bdf8"/>'
    f'{LT}circle cx="18" cy="27" r="1.8" fill="#e0f2fe"/>'
    f'{LT}/svg>'
)

CARBON_APP_CSS = r"""
:root {
  --bg-core: #05070b;
  --bg-elevated: #0a0e14;
  --glass: rgba(9, 12, 18, 0.84);
  --glass-strong: rgba(7, 10, 15, 0.96);
  --border: rgba(255, 255, 255, 0.08);
  --border-blue: rgba(56, 189, 248, 0.45);
  --text: #f1f5f9;
  --muted: #7e8da4;
  --accent: #38bdf8;
  --accent-deep: #0ea5e9;
  --female: #f472b6;
}

/* Native App Touch & Immersion Discipline */
html, body {
  background: radial-gradient(ellipse 90% 70% at 50% 42%, #0b1422 0%, #05070b 70%, #020305 100%) !important;
  color: var(--text) !important;
  overscroll-behavior: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
  -webkit-touch-callout: none !important;
  touch-action: manipulation;
}
input, textarea {
  -webkit-user-select: text !important;
  user-select: text !important;
}
::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }

/* Subtle surgical viewport vignette */
#view-3d::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(circle at 50% 45%, rgba(14, 165, 233, 0.07) 0%, transparent 58%);
}

.glass {
  background: var(--glass) !important;
  border: 1px solid var(--border) !important;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
  backdrop-filter: blur(24px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(150%) !important;
}

/* Splash Screen */
#splash {
  background: radial-gradient(circle at 50% 38%, #0c192c 0%, #05070b 75%) !important;
}
.splash-logo {
  width: 74px !important;
  height: 74px !important;
  border-radius: 22px !important;
  background: linear-gradient(150deg, rgba(14, 165, 233, 0.18), rgba(5, 7, 11, 0.94)) !important;
  border: 1px solid rgba(56, 189, 248, 0.42) !important;
  box-shadow: 0 12px 36px rgba(14, 165, 233, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
}

/* Top Search Pill & Segmented Gender Control */
.top-stack { gap: 8px !important; }
.search-box {
  border-radius: 999px !important;
  padding: 8px 14px !important;
  background: rgba(9, 12, 18, 0.88) !important;
}
.search-box:focus-within {
  border-color: var(--border-blue) !important;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.20), 0 10px 24px rgba(0, 0, 0, 0.6) !important;
}
.search-box input { font-size: 13px !important; }
.search-box input::placeholder { color: #5b6b82; }

.seg-gender {
  border-radius: 999px !important;
  padding: 3px !important;
  background: rgba(9, 12, 18, 0.88) !important;
}
.seg-btn {
  border-radius: 999px !important;
  padding: 5px 12px !important;
  font-size: 12px !important;
  transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1) !important;
}
.seg-btn.active-male {
  background: linear-gradient(135deg, #0284c7, #0ea5e9) !important;
  color: #ffffff !important;
  box-shadow: 0 2px 10px rgba(14, 165, 233, 0.42) !important;
}
.seg-btn.active-female {
  background: linear-gradient(135deg, #db2777, #ec4899) !important;
  color: #ffffff !important;
  box-shadow: 0 2px 10px rgba(236, 72, 153, 0.42) !important;
}

/* Horizontal Action Strip with Native Edge Fade */
.tool-strip {
  gap: 6px !important;
  padding: 2px 14px 4px 2px !important;
  -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 90%, transparent 100%);
  mask-image: linear-gradient(90deg, #000 0%, #000 90%, transparent 100%);
}
.btn {
  padding: 6px 12px !important;
  border-radius: 999px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  color: #cbd5e1 !important;
  background: rgba(9, 12, 18, 0.80) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  transition: transform 0.12s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease !important;
}
.btn:active { transform: scale(0.93) !important; }
.btn.on {
  background: rgba(14, 165, 233, 0.22) !important;
  border-color: rgba(56, 189, 248, 0.68) !important;
  color: #e0f2fe !important;
  box-shadow: 0 0 14px rgba(14, 165, 233, 0.26) !important;
}

/* Unified Floating Capsule for Right Layer Dock (No 10 separate HTML boxes!) */
.right-dock {
  background: rgba(8, 11, 17, 0.84) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 18px !important;
  padding: 5px !important;
  gap: 2px !important;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
  backdrop-filter: blur(24px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(150%) !important;
}
.layer-btn {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 6px !important;
  padding: 6px 9px !important;
  border-radius: 12px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #7c8ca3 !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  min-width: 78px;
  transition: all 0.16s ease !important;
}
.layer-btn:active { transform: scale(0.94) !important; }
.layer-btn::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.42;
  transition: transform 0.16s ease, opacity 0.16s ease, box-shadow 0.16s ease;
}
.layer-btn.on {
  color: #f1f5f9 !important;
  background: rgba(14, 165, 233, 0.18) !important;
  border-color: rgba(56, 189, 248, 0.35) !important;
}
.layer-btn.on::before { opacity: 1; transform: scale(1.14); }
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
  border-radius: 18px !important;
  padding: 11px 12px !important;
  border-color: rgba(56, 189, 248, 0.22) !important;
}

/* Native Floating Toast Pill */
.toast {
  background: rgba(7, 10, 16, 0.90) !important;
  border: 1px solid rgba(56, 189, 248, 0.28) !important;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.68) !important;
  color: #e0f2fe !important;
  padding: 7px 16px !important;
  font-size: 11.5px !important;
  font-weight: 500 !important;
}

/* Native Bottom Tab Bar */
.bottom-nav {
  background: rgba(5, 7, 11, 0.96) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
}
.nav-item {
  position: relative;
  color: #6e7f96 !important;
  font-size: 10.5px !important;
  transition: color 0.16s ease, transform 0.12s ease;
}
.nav-item:active { transform: scale(0.92); }
.nav-item.active { color: #38bdf8 !important; }
.nav-item.active::after {
  content: "";
  position: absolute;
  top: 0;
  width: 24px;
  height: 2.5px;
  border-radius: 0 0 3px 3px;
  background: linear-gradient(90deg, #0ea5e9, #38bdf8);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.75);
}

/* Native Bottom-Sheet Drawer with Grab Handle */
.drawer {
  background: var(--glass-strong) !important;
  border-top: 1px solid rgba(56, 189, 248, 0.30) !important;
  border-radius: 26px 26px 0 0 !important;
  padding-top: 20px !important;
  box-shadow: 0 -18px 46px rgba(0, 0, 0, 0.82) !important;
}
.drawer::before {
  content: "";
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 38px;
  height: 4px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
}
.block {
  background: rgba(12, 17, 26, 0.84) !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 14px !important;
}
.card {
  background: rgba(10, 14, 21, 0.90) !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 16px !important;
}
.chip.active, .tab-btn.active {
  border-color: rgba(56, 189, 248, 0.65) !important;
  color: #e0f2fe !important;
  background: rgba(14, 165, 233, 0.20) !important;
}
"""


def inject_carbon_ui(path: str) -> None:
    if not os.path.exists(path):
        print(f"Skip missing {path}")
        return
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    # Replace splash emoji with sleek SVG emblem
    html = re.sub(
        rf'({LT}div class="splash-logo">)🧬({LT}/div>)',
        rf'\1{NATIVE_SVG_LOGO}\2',
        html
    )

    style_tag = f'{LT}style id="r1-pro-carbon-ui">{CARBON_APP_CSS}{LT}/style>'
    head_close = f'{LT}/head>'
    if 'id="r1-pro-carbon-ui"' in html:
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
    print(f"{path}: injected Native App-Grade Carbon-Ink UI")


if __name__ == '__main__':
    for p in ['src/index.html', 'www/index.html']:
        inject_carbon_ui(p)

# EOF

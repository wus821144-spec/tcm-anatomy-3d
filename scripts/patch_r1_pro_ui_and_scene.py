import os

LT = chr(60)

e3d_path = 'src/engine_3d.js'
if os.path.exists(e3d_path):
  src = open(e3d_path, encoding='utf-8').read()

  old_filter = "low.includes('regions of human') || low.includes('general terms')"
  new_filter = (
    "low.includes('regions of human') || low.includes('general terms') || "
    "low.includes('skeletal system') || low.includes('muscular system') || "
    "low.includes('nervous system') || low.includes('visceral system') || "
    "low.includes('reference line') || low.includes('lymphoid organ') || "
    "low.includes('sense organ') || low.includes('cardiovascular system') || "
    "low.includes('movements') || low.includes('font') || low.includes('cross_section')"
  )
  src = src.replace(old_filter, new_filter)

  src = src.replace(
    "if (vCount <= 256 && maxD > 0.14 && minD < 0.005 * maxD) { toRemove.push(obj); return; }",
    "if (vCount <= 256 && maxD > 0.14 && minD < 0.005 * maxD) { toRemove.push(obj); return; }\n          const ctr = new THREE.Vector3(); box.getCenter(ctr);\n          if (ctr.y < -0.05 || ctr.y > 1.85 || Math.abs(ctr.x) > 0.52 || Math.abs(ctr.z) > 0.42) { toRemove.push(obj); return; }"
  )

  old_fit = "if (size.y > 0.2 && !state.activeZone) {\n      controls.target.copy(center);\n      camera.position.set(center.x, center.y + 0.1, center.z + Math.max(size.y * 1.45, 1.8));\n      state.hasAutoFitted = true;\n    }"
  new_fit = """if (size.y > 0.2 && !state.activeZone) {
      if (size.z > size.x * 1.15 && Math.abs(anatomyGroup.rotation.y) < 0.1) {
        anatomyGroup.rotation.y = Math.PI / 2;
        box.setFromObject(anatomyGroup);
        box.getSize(size);
        box.getCenter(center);
      }
      controls.target.set(center.x, center.y, center.z);
      camera.position.set(center.x, center.y + 0.04, center.z + Math.max(size.y * 1.62, 2.35));
      state.hasAutoFitted = true;
    }"""
  src = src.replace(old_fit, new_fit)

  src = src.replace(
    "opacity: 0.14, wireframe: true, depthWrite: false",
    "opacity: 0.0, wireframe: false, depthWrite: false"
  )

  src = src.replace("envScene.background = new THREE.Color(0x0f172a);", "envScene.background = new THREE.Color(0x05070b);")
  open(e3d_path, 'w', encoding='utf-8').write(src)

idx_path = 'www/index.html'
if os.path.exists(idx_path):
  h = open(idx_path, encoding='utf-8').read()
  head_end = LT + '/head>'
  carbon_css = (
    LT + 'style id="carbon-ink-theme">\n'
    '  :root { --bg: #05070b !important; --panel: rgba(10, 14, 20, 0.88) !important; --accent: #0ea5e9 !important; --accent2: #38bdf8 !important; --muted: #8ca3ba !important; --border: rgba(56, 189, 248, 0.26) !important; }\n'
    '  html, body, #view-3d, #canvas-wrap { background: radial-gradient(circle at 50% 38%, #0d1520 0%, #06090e 58%, #030406 100%) !important; }\n'
    '  .glass { background: rgba(10, 14, 20, 0.86) !important; border: 1px solid rgba(56, 189, 248, 0.24) !important; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.65) !important; }\n'
    '  .btn.on, .seg-btn.active-male, .seg-btn.active-female, .chip.on, .layer-btn.on, .nav-item.active { background: linear-gradient(135deg, rgba(14, 165, 233, 0.28), rgba(2, 132, 199, 0.36)) !important; border-color: #38bdf8 !important; color: #e0f2fe !important; box-shadow: 0 0 12px rgba(14, 165, 233, 0.32) !important; }\n'
    '  .nav-bar, .top-bar, .drawer { background: rgba(6, 9, 14, 0.94) !important; border-color: rgba(56, 189, 248, 0.22) !important; }\n'
    '  input, select, textarea { background: #080b10 !important; border-color: rgba(56, 189, 248, 0.28) !important; color: #e0f2fe !important; }\n'
    + LT + '/style>\n'
  )
  if 'id="carbon-ink-theme"' not in h and head_end in h:
    h = h.replace(head_end, carbon_css + head_end, 1)
  open(idx_path, 'w', encoding='utf-8').write(h)

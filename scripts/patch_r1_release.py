import os, re, json

def strip_all_fn_blocks(code, fn_name):
  pattern = re.compile(r'(^|\n)\s*function\s+' + re.escape(fn_name) + r'\s*\([^)]*\)\s*\{')
  while True:
    m = pattern.search(code)
    if not m:
      break
    start = m.start()
    brace_start = code.find('{', m.start())
    depth = 0
    i = brace_start
    while i < len(code):
      ch = code[i]
      if ch == '{':
        depth += 1
      elif ch == '}':
        depth -= 1
        if depth == 0:
          code = code[:start] + '\n' + code[i+1:]
          break
      i += 1
    else:
      break
  return code

app_path = 'src/app.js'
if os.path.exists(app_path):
  a = open(app_path, encoding='utf-8').read()
  a = strip_all_fn_blocks(a, 'drawCtSlice')
  single_ct = """
function drawCtSlice(canvas, depthCun, zone) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, w, h);
  const z = String(zone || (state.activeZone && state.activeZone.id) || 'torso').toLowerCase();
  let title = '胸部 PACS CT 轴位 (肺/纵隔窗)';
  if (z.includes('head')) {
    title = '颅脑 PACS CT 轴位 (脑实质窗)';
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx, cy, 56, 66, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, 52, 62, 0, 0, Math.PI * 2); ctx.stroke();
    const gr = ctx.createRadialGradient(cx, cy, 6, cx, cy, 58);
    gr.addColorStop(0, '#475569'); gr.addColorStop(0.7, '#334155'); gr.addColorStop(1, '#1e293b');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx, cy, 50, 60, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, cy - 58); ctx.lineTo(cx, cy + 58); ctx.stroke();
    ctx.fillStyle = '#090d16'; ctx.beginPath(); ctx.ellipse(cx - 10, cy - 4, 6, 17, -0.25, 0, Math.PI * 2); ctx.ellipse(cx + 10, cy - 4, 6, 17, 0.25, 0, Math.PI * 2); ctx.fill();
  } else if (z.includes('arm') || z.includes('leg')) {
    title = z.includes('arm') ? '上肢 PACS CT 轴位 (骨肌窗)' : '下肢 PACS CT 轴位 (骨肌窗)';
    ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, 58, 50, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.ellipse(cx, cy - 15, 38, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f3f46'; ctx.beginPath(); ctx.ellipse(cx, cy + 17, 36, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(cx - 4, cy + 2, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(cx - 4, cy + 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx + 22, cy - 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(cx + 30, cy + 4, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(cx + 24, cy + 10, 2.8, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 70, 50, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
    ctx.fillStyle = '#020617'; ctx.beginPath(); ctx.ellipse(cx - 26, cy, 24, 30, 0, 0, Math.PI * 2); ctx.ellipse(cx + 26, cy, 24, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 18, cy); ctx.lineTo(cx - 38, cy - 14); ctx.moveTo(cx + 18, cy); ctx.lineTo(cx + 38, cy - 14); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.ellipse(cx + 4, cy - 6, 16, 18, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(cx - 9, cy + 32, 18, 14); ctx.fillRect(cx - 7, cy - 48, 14, 8);
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(cx - 2, cy + 18, 5, 0, Math.PI * 2); ctx.fill();
  }
  const dPx = Math.min(54, Math.max(0, (depthCun || 0) * 26));
  if (dPx > 0) {
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - 62); ctx.lineTo(cx, cy - 52 + dPx); ctx.stroke();
    ctx.fillStyle = depthCun > 1.0 ? '#f43f5e' : '#10b981'; ctx.beginPath(); ctx.arc(cx, cy - 52 + dPx, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif'; ctx.fillText(title, 8, 13);
  ctx.fillStyle = '#38bdf8'; ctx.fillText(`进针 ${(depthCun || 0).toFixed(1)}寸 (${((depthCun || 0) * 25).toFixed(0)}mm)`, 8, h - 7);
}
"""
  a = a + "\n" + single_ct

  a = a.replace(
    "holdTimer = setTimeout(() => { retActive = true; }, 280);",
    "holdTimer = setTimeout(() => { retActive = true; controls.enabled = false; }, 280);"
  )
  a = a.replace(
    "retActive = false;\n    if (ret) ret.style.display = 'none';",
    "retActive = false;\n    controls.enabled = true;\n    if (ret) ret.style.display = 'none';"
  )

  a = a.replace(
    "biomechEngine.showJointKinematics(b.dataset.joint, anatomyGroup)",
    "biomechEngine.showJointKinematics(b.dataset.joint, anatomyGroup, window.__tcmJointSide || 'L')"
  )
  a = a.replace(
    "let jointSide = 'L';\n  const sideBtn = document.getElementById('btn-joint-side');\n  if (sideBtn) sideBtn.addEventListener('click', () => {\n    jointSide = jointSide === 'L' ? 'R' : 'L';\n    sideBtn.innerText = jointSide === 'L' ? '当前：左侧(L)' : '当前：右侧(R)';\n  });\n  document.querySelectorAll('.joint-btn').forEach((b) => {\n    b.addEventListener('click', () => {\n      if (jointSide === 'R' && typeof biomechEngine !== 'undefined') {\n        const lbl = biomechEngine.showJointKinematics(b.dataset.joint, anatomyGroup, 'R');\n        if (lbl) toastEl.innerText = lbl;\n      }\n    });\n  });",
    "window.__tcmJointSide = 'L';\n  const sideBtn = document.getElementById('btn-joint-side');\n  if (sideBtn) sideBtn.addEventListener('click', () => {\n    window.__tcmJointSide = window.__tcmJointSide === 'L' ? 'R' : 'L';\n    sideBtn.innerText = window.__tcmJointSide === 'L' ? '当前：左侧(L)' : '当前：右侧(R)';\n  });"
  )

  if 'history.pushState' not in a:
    a = a.replace("document.getElementById('drawer').classList.add('open');", "try { history.pushState({ tcm: 'drawer' }, ''); } catch {}\n  document.getElementById('drawer').classList.add('open');")
    a = a.replace("function enterZone(z) {", "function enterZone(z) {\n  try { history.pushState({ tcm: 'zone' }, ''); } catch {}")

  a += '''
;(() => {
  document.querySelectorAll('.nav-item').forEach((nav) => {
    nav.addEventListener('click', () => {
      if (nav.dataset.view !== 'view-3d') {
        const vid = document.getElementById('ar-video');
        if (vid && vid.srcObject) {
          vid.srcObject.getTracks().forEach((t) => t.stop());
          vid.srcObject = null;
          vid.style.display = 'none';
          const arBtn = document.getElementById('btn-ar-bg');
          if (arBtn) arBtn.classList.remove('on');
        }
      }
    });
  });

  const kbFilters = document.getElementById('kb-filters');
  const kbList = document.getElementById('kb-list');
  if (kbFilters && kbList) {
    kbFilters.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip || chip.dataset.kb !== 'cutaneous_sinew') return;
      document.querySelectorAll('#kb-filters .chip').forEach((c) => c.classList.remove('on'));
      chip.classList.add('on');
      const items = (typeof dataset !== 'undefined' && dataset.tcm_cutaneous_sinew) ? dataset.tcm_cutaneous_sinew : [];
      kbList.innerHTML = items.map((x) => `<div class="card"><strong style="color:#38bdf8;">${escapeHtml(x.name)}</strong><div style="font-size:12px;margin-top:4px;"><b>分布区域：</b>${escapeHtml(x.region)}</div><div style="font-size:12px;color:#fde68a;margin-top:2px;"><b>经筋病候：</b>${escapeHtml(x.pathology)}</div></div>`).join('') || '<div class="card">暂无经筋皮部数据</div>';
    });
  }
})();
'''
  open(app_path, 'w', encoding='utf-8').write(a)

dm_path = 'src/data_manager.js'
if os.path.exists(dm_path):
  dm = open(dm_path, encoding='utf-8').read()
  if "a.specialTags" not in dm:
    dm = dm.replace(
      "if (a.name.includes(q) || a.code.toLowerCase().includes(q) || a.meridian.includes(q))",
      "if (a.name.includes(q) || a.code.toLowerCase().includes(q) || a.meridian.includes(q) || (Array.isArray(a.specialTags) && a.specialTags.some((t) => t.toLowerCase().includes(q))))"
    )
    open(dm_path, 'w', encoding='utf-8').write(dm)

idx_path = 'www/index.html'
if os.path.exists(idx_path):
  h = open(idx_path, encoding='utf-8').read()
  if 'data-kb="cutaneous_sinew"' not in h and 'id="kb-filters"' in h:
    h = h.replace(
      '<div class="chip-row" id="kb-filters">',
      '<div class="chip-row" id="kb-filters">\n      <button class="chip" data-kb="cutaneous_sinew">十二经筋/皮部</button>'
    )
  h = h.replace('特供版', '特供版 R1')
  open(idx_path, 'w', encoding='utf-8').write(h)

pkg_path = 'package.json'
if os.path.exists(pkg_path):
  pkg = json.load(open(pkg_path, encoding='utf-8'))
  pkg['version'] = '1.0.0-R1'
  open(pkg_path, 'w', encoding='utf-8').write(json.dumps(pkg, ensure_ascii=False, indent=2))

import os

# 1. Fix src/app.js wiring bugs
app_path = 'src/app.js'
if os.path.exists(app_path):
  a = open(app_path, encoding='utf-8').read()
  a = a.replace(
    'meridianOverlay.updateNeedleSimulation(lastOpenedPoint, d)',
    'meridianOverlay.updateNeedleSimulation(lastOpenedPoint, d, anatomyGroup, translateAnatName)'
  )
  a = a.replace(
    'drawCtSlice(ctCanvas, d)',
    'drawCtSlice(ctCanvas, d, (state.activeZone && state.activeZone.id) || "torso")'
  )
  old_hide = """document.getElementById('d-hide-mesh').addEventListener('click', () => {
  if (!activePickedMesh) return;
  activePickedMesh.visible = false;
  state.hiddenDissectedMeshes.add(activePickedMesh);
  document.getElementById('drawer').classList.remove('open');
  toastEl.innerText = '已剥离隐藏该层结构，露出深层组织（点“恢复剥离”可还原）';
});"""
  new_hide = """document.getElementById('d-hide-mesh').addEventListener('click', () => {
  if (!activePickedMesh) return;
  if (engine.hideMeshWithUndo) engine.hideMeshWithUndo(activePickedMesh);
  else { activePickedMesh.visible = false; state.hiddenDissectedMeshes.add(activePickedMesh); }
  document.getElementById('drawer').classList.remove('open');
  toastEl.innerText = '已剥离隐藏该层结构（支持“撤销剥离”单步还原）';
});"""
  a = a.replace(old_hide, new_hide)

  old_iso = """document.getElementById('d-isolate-mesh').addEventListener('click', () => {
  if (!activePickedMesh) return;
  anatomyGroup.traverse((c) => {
    if (c.isMesh && c !== activePickedMesh) {
      c.visible = false;
      state.hiddenDissectedMeshes.add(c);
    }
  });
  activePickedMesh.visible = true;
  toastEl.innerText = '已孤立显示该解剖结构（点“恢复剥离”可还原）';
});"""
  new_iso = """document.getElementById('d-isolate-mesh').addEventListener('click', () => {
  if (!activePickedMesh) return;
  if (engine.isolateWithGhost) {
    const on = engine.isolateWithGhost(activePickedMesh);
    toastEl.innerText = on ? '已开启半透明语境孤立（周边保留12%空间参照）' : '已退出孤立视图';
  }
});"""
  a = a.replace(old_iso, new_iso)

  old_res = """document.getElementById('btn-restore-dissect').addEventListener('click', () => {
  state.hiddenDissectedMeshes.clear();
  engine.applyLayerAndGenderStyles();
  toastEl.innerText = '已恢复全部被剥离/孤立的解剖结构';
});"""
  new_res = """document.getElementById('btn-restore-dissect').addEventListener('click', () => {
  if (engine.restoreAllDissected) engine.restoreAllDissected();
  else { state.hiddenDissectedMeshes.clear(); engine.applyLayerAndGenderStyles(); }
  toastEl.innerText = '已恢复全部被剥离/孤立的解剖结构';
});"""
  a = a.replace(old_res, new_res)

  if 'special-filter-select' not in a:
    a += '''
;(() => {
  const spSel = document.getElementById('special-filter-select');
  if (spSel) spSel.addEventListener('change', (e) => {
    const tag = e.target.value;
    if (!tag) { engine.refreshVisiblePoints(); return; }
    let cnt = 0;
    state.pointMeshes.forEach((m) => {
      const pt = m.userData.data || {};
      const ok = Array.isArray(pt.specialTags) && pt.specialTags.some((t) => t.includes(tag)) || (tag === '经外奇穴' && pt.category === '经外奇穴');
      m.visible = !!ok;
      if (ok) cnt++;
    });
    toastEl.innerText = `特定穴筛选 [${tag}]：共高亮 ${cnt} 个 3D 穴位`;
  });
  const exSel = document.getElementById('extra-meridian-select');
  if (exSel) exSel.addEventListener('change', (e) => {
    const nm = e.target.value;
    if (!nm) { meridianOverlay.clearMeridianPath(); return; }
    const coords = (dataset.extra_meridian_paths || {})[nm];
    if (coords && meridianOverlay.showExtraMeridian) {
      meridianOverlay.showExtraMeridian(coords, '#c084fc');
      engine.smoothFlyTo([0, 1.05, 0], [0, 1.15, 1.55]);
      toastEl.innerText = `已高亮奇经八脉：${nm}`;
    }
  });
})();
'''
  open(app_path, 'w', encoding='utf-8').write(a)

# 2. Upgrade src/engine_3d.js: artery/nerve pulse + Female in-situ uterus
e3d_path = 'src/engine_3d.js'
if os.path.exists(e3d_path):
  src = open(e3d_path, encoding='utf-8').read()
  if 'arteryMeshes' not in src:
    src = src.replace('heartMeshes: [],\n    lungMeshes: [],', 'heartMeshes: [],\n    lungMeshes: [],\n    arteryMeshes: [],\n    nerveMeshes: [],')
    src = src.replace("if (c.isMesh && low.includes('lung')) state.lungMeshes.push(c);", "if (c.isMesh && low.includes('lung')) state.lungMeshes.push(c);\n          if (c.isMesh && low.includes('arter')) state.arteryMeshes.push(c);\n          if (c.isMesh && low.includes('nerv')) state.nerveMeshes.push(c);")
    src = src.replace(
      "state.lungMeshes.forEach((l) => l.scale.set(breath, 1.0, breath));",
      "state.lungMeshes.forEach((l) => l.scale.set(breath, 1.0, breath));\n        const pulse = Math.pow(Math.max(0, Math.sin(t * 3.8 - 0.35)), 4) * 0.24;\n        state.arteryMeshes.forEach((a) => { if (a.material && a.material.emissive && prevHighlighted !== a) { a.material.emissive.setHex(0x991b1b); a.material.emissiveIntensity = pulse; } });\n        const imp = 0.08 + 0.08 * Math.sin(t * 5.2);\n        state.nerveMeshes.forEach((n) => { if (n.material && n.material.emissive && prevHighlighted !== n) { n.material.emissive.setHex(0x854d0e); n.material.emissiveIntensity = imp; } });"
    )
    src = src.replace(
      "if (state.activeGender === 'Female') {",
      "if (state.activeGender === 'Female' && !state.loadedRegions['female_pelvis_uterus']) { state.loadedRegions['female_pelvis_uterus'] = new THREE.Group(); gltfLoader.load('./models/hra_uterus.glb', (g) => { const r = g.scene; const b = new THREE.Box3().setFromObject(r); const sz = new THREE.Vector3(); const ct = new THREE.Vector3(); b.getSize(sz); b.getCenter(ct); const sc = 0.11 / (Math.max(sz.x, sz.y, sz.z) || 1); r.scale.setScalar(sc); r.position.set(-ct.x*sc, 0.87 - ct.y*sc, 0.02 - ct.z*sc); r.traverse((m) => { if (m.isMesh) m.name = 'Visceral__Female__Uterus'; }); state.loadedRegions['female_pelvis_uterus'].add(r); anatomyGroup.add(state.loadedRegions['female_pelvis_uterus']); applyLayerAndGenderStyles(); }, undefined, () => {}); }\n      if (state.activeGender === 'Female') {"
    )
    open(e3d_path, 'w', encoding='utf-8').write(src)

# 3. Latin plural normalization in src/data_manager.js
dm_path = 'src/data_manager.js'
if os.path.exists(dm_path):
  dm = open(dm_path, encoding='utf-8').read()
  if 'musculi' not in dm:
    dm = dm.replace(
      "const low = (raw || '').toLowerCase();",
      "const low = (raw || '').toLowerCase().replace(/arteriae/g, 'artery').replace(/venae/g, 'vein').replace(/nervi/g, 'nerve').replace(/musculi/g, 'muscle').replace(/ligamenta/g, 'ligament').replace(/foramina/g, 'foramen').replace(/processus/g, 'process');"
    )
    open(dm_path, 'w', encoding='utf-8').write(dm)

# 4. Persistent wrongBank in src/study_sync_engine.js
ss_path = 'src/study_sync_engine.js'
if os.path.exists(ss_path):
  ss = open(ss_path, encoding='utf-8').read()
  if 'tcm_wrong_bank_v1' not in ss:
    ss = ss.replace('const wrongBank = [];', "const wrongBank = (() => { try { return JSON.parse(localStorage.getItem('tcm_wrong_bank_v1') || '[]'); } catch { return []; } })();")
    ss = ss.replace('if (!wrongBank.some((w) => w.id === currentTarget.id)) wrongBank.push(currentTarget);', "if (!wrongBank.some((w) => w.id === currentTarget.id)) { wrongBank.push(currentTarget); try { localStorage.setItem('tcm_wrong_bank_v1', JSON.stringify(wrongBank.slice(-60))); } catch {} }")
    open(ss_path, 'w', encoding='utf-8').write(ss)

# 5. Add 3D Auricular Ear Lab to src/micro_anatomy_engine.js
mic_path = 'src/micro_anatomy_engine.js'
if os.path.exists(mic_path):
  mc = open(mic_path, encoding='utf-8').read()
  if 'ear_auricular' not in mc:
    ear_block = """    } else if (type === 'ear_auricular') {
      const earMat = new THREE.MeshPhysicalMaterial({ color: 0xf1c2a0, roughness: 0.45, clearcoat: 0.18, side: THREE.DoubleSide });
      const helix = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 16, 42, Math.PI * 1.45), earMat);
      helix.rotation.z = -0.35;
      const concha = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24), new THREE.MeshPhysicalMaterial({ color: 0xe0a885, roughness: 0.5, side: THREE.DoubleSide }));
      concha.scale.set(0.75, 1.15, 0.35);
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 20), earMat);
      lobe.position.set(0.02, -0.22, 0.01); lobe.scale.set(0.95, 1.15, 0.65);
      microGroup.add(helix, concha, lobe);
      const earPts = [
        ['耳神门', 0.03, 0.11, 0.05], ['耳皮质下', 0.04, -0.10, 0.055], ['耳交感', -0.02, 0.08, 0.05],
        ['耳心', 0.0, -0.02, 0.055], ['耳肺', 0.01, -0.05, 0.055], ['耳肾', 0.02, 0.04, 0.055],
        ['耳肝', -0.03, 0.01, 0.055], ['耳胃', -0.01, 0.02, 0.055], ['耳内分泌', 0.01, -0.12, 0.055],
        ['耳降压沟', 0.05, 0.04, -0.05]
      ];
      earPts.forEach(([nm, x, y, z]) => {
        const pt = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
        pt.position.set(x, y, z); pt.name = nm;
        microGroup.add(pt);
      });"""
    mc = mc.replace("    } else if (type === 'valve') {", ear_block + "\n    } else if (type === 'valve') {")
    open(mic_path, 'w', encoding='utf-8').write(mc)

# 6. Add Special Filter + Extra Meridians + Ear Auricular button to www/index.html
idx_path = 'www/index.html'
if os.path.exists(idx_path):
  h = open(idx_path, encoding='utf-8').read()
  if 'ear_auricular' not in h:
    if 'data-micro="kidney_r_interior"' in h:
      h = h.replace('<button class="micro-btn" data-micro="kidney_r_interior">NIH 右肾</button>', '<button class="micro-btn" data-micro="kidney_r_interior">NIH 右肾</button><button class="micro-btn" data-micro="ear_auricular">3D 耳廓全息耳穴</button>')
    elif 'data-micro="alveolus"' in h:
      h = h.replace('<button class="micro-btn" data-micro="alveolus">', '<button class="micro-btn" data-micro="ear_auricular">3D 耳廓全息耳穴</button><button class="micro-btn" data-micro="alveolus">')
  if 'special-filter-select' not in h and 'id="drill-level"' in h:
    sel_html = '<select id="special-filter-select" style="width:100%;margin-top:4px;font-size:11px;background:#0f172a;color:#fde68a;border:1px solid #334155;border-radius:6px;padding:3px;"><option value="">特定穴筛选 (全部)</option><option value="五输穴">五输穴(井荥输经合)</option><option value="原穴">原穴</option><option value="络穴">络穴</option><option value="背俞穴">背俞穴</option><option value="腹募穴">腹募穴</option><option value="八会穴">八会穴</option><option value="八脉交会穴">八脉交会穴</option><option value="下合穴">下合穴</option><option value="经外奇穴">经外奇穴(48穴)</option></select><select id="extra-meridian-select" style="width:100%;margin-top:4px;font-size:11px;background:#0f172a;color:#d8b4fe;border:1px solid #334155;border-radius:6px;padding:3px;"><option value="">奇经八脉循行</option><option value="冲脉">冲脉</option><option value="带脉">带脉</option><option value="阴维脉">阴维脉</option><option value="阳维脉">阳维脉</option><option value="阴跷脉">阴跷脉</option><option value="阳跷脉">阳跷脉</option></select>'
    h = h.replace('<div id="drill-level" style="color:#38bdf8;font-weight:700;">一级：全身大区</div>', '<div id="drill-level" style="color:#38bdf8;font-weight:700;">一级：全身大区</div>' + sel_html)
  open(idx_path, 'w', encoding='utf-8').write(h)

# 7. Calibrate Bladder Meridian inner/outer lines & abdominal parallel lines in src/tcm_meridian_engine.js
mer_path = 'src/tcm_meridian_engine.js'
if os.path.exists(mer_path):
  ms = open(mer_path, encoding='utf-8').read()
  if 'xAdj' not in ms:
    ms = ms.replace(
      'pos = [\n        +(p0[0] + (p1[0] - p0[0]) * frac).toFixed(3),',
      '''let xAdj = p0[0] + (p1[0] - p0[0]) * frac;
      const num = parseInt(String(a.code || '').replace(/\\D/g, ''), 10) || 0;
      if (a.meridian === '足太阳膀胱经' && num >= 11 && num <= 30) xAdj = (xAdj >= 0 ? 0.032 : -0.032);
      else if (a.meridian === '足太阳膀胱经' && num >= 41 && num <= 54) xAdj = (xAdj >= 0 ? 0.064 : -0.064);
      else if (a.meridian === '足少阴肾经' && num >= 11 && num <= 21) xAdj = (xAdj >= 0 ? 0.018 : -0.018);
      else if (a.meridian === '足阳明胃经' && num >= 19 && num <= 30) xAdj = (xAdj >= 0 ? 0.056 : -0.056);
      pos = [
        +xAdj.toFixed(3),'''
    )
    open(mer_path, 'w', encoding='utf-8').write(ms)

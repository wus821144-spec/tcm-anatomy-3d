import os

# 1. Patch src/engine_3d.js (X/Y/Z 3-plane clipping, Ghost Isolation, Dissect Undo, 3D Callout Pins)
e3d_path = 'src/engine_3d.js'
if os.path.exists(e3d_path):
  src = open(e3d_path, encoding='utf-8').read()
  if 'clipPlaneX' not in src:
    src = src.replace(
      'const clipPlaneZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.24);',
      'const clipPlaneX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.45);\n  const clipPlaneY = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.85);\n  const clipPlaneZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.24);'
    )
    src = src.replace('clippingPlanes: [clipPlaneZ]', 'clippingPlanes: [clipPlaneX, clipPlaneY, clipPlaneZ]')
    src = src.replace('mesh.material.clippingPlanes = [clipPlaneZ];', 'mesh.material.clippingPlanes = [clipPlaneX, clipPlaneY, clipPlaneZ];')
    src = src.replace(
      'const toolGroup = new THREE.Group();\n  scene.add(anatomyGroup, zoneGroup, pointGroup, toolGroup);',
      'const toolGroup = new THREE.Group();\n  const calloutGroup = new THREE.Group();\n  scene.add(anatomyGroup, zoneGroup, pointGroup, toolGroup, calloutGroup);'
    )
    src = src.replace(
      'hiddenDissectedMeshes: new Set(),',
      'hiddenDissectedMeshes: new Set(),\n    dissectUndoStack: [],\n    isolatedTargetMesh: null,'
    )
    src = src.replace(
      'if (state.ghostMode) {\n          c.material.transparent = true; c.material.opacity = 0.16; c.material.depthWrite = false;',
      'if (state.isolatedTargetMesh && c === state.isolatedTargetMesh) {\n          c.material.transparent = false; c.material.opacity = 1.0; c.material.depthWrite = true;\n        } else if (state.ghostMode || state.isolatedTargetMesh) {\n          c.material.transparent = true; c.material.opacity = 0.12; c.material.depthWrite = false;'
    )
    helper_fns = '''
  function hideMeshWithUndo(mesh) {
    if (!mesh) return;
    state.hiddenDissectedMeshes.add(mesh);
    state.dissectUndoStack.push(mesh);
    applyLayerAndGenderStyles();
  }
  function undoLastHide() {
    const last = state.dissectUndoStack.pop();
    if (!last) return false;
    state.hiddenDissectedMeshes.delete(last);
    applyLayerAndGenderStyles();
    return true;
  }
  function restoreAllDissected() {
    state.hiddenDissectedMeshes.clear();
    state.dissectUndoStack = [];
    state.isolatedTargetMesh = null;
    applyLayerAndGenderStyles();
  }
  function isolateWithGhost(mesh) {
    state.isolatedTargetMesh = (state.isolatedTargetMesh === mesh) ? null : mesh;
    applyLayerAndGenderStyles();
    return !!state.isolatedTargetMesh;
  }
  function addCalloutPin(worldVec, text) {
    if (!worldVec) return;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 10), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    dot.position.copy(worldVec);
    const stemEnd = worldVec.clone().add(new THREE.Vector3(worldVec.x >= 0 ? 0.08 : -0.08, 0.05, 0.04));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([worldVec, stemEnd]), new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
    const cvs = document.createElement('canvas');
    cvs.width = 256; cvs.height = 56;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = 'rgba(15,23,42,0.88)'; ctx.fillRect(0, 0, 256, 56);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, 252, 52);
    ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(String(text || '').slice(0, 12), 12, 36);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cvs), depthTest: false }));
    sp.position.copy(stemEnd);
    sp.scale.set(0.16, 0.036, 1);
    calloutGroup.add(dot, line, sp);
  }
  function clearCalloutPins() {
    while (calloutGroup.children.length > 0) {
      const c = calloutGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
    }
  }
'''
    src = src.replace(
      'return {\n    THREE, scene, camera, renderer, controls, clipPlaneZ,',
      helper_fns + '\n  return {\n    THREE, scene, camera, renderer, controls, clipPlaneX, clipPlaneY, clipPlaneZ, calloutGroup, hideMeshWithUndo, undoLastHide, restoreAllDissected, isolateWithGhost, addCalloutPin, clearCalloutPins,'
    )
    open(e3d_path, 'w', encoding='utf-8').write(src)

# 2. Patch www/index.html
idx_path = 'www/index.html'
if os.path.exists(idx_path):
  h = open(idx_path, encoding='utf-8').read()
  if 'id="clip-x"' not in h and 'id="clip-z"' in h:
    h = h.replace(
      '<input id="clip-z" type="range" min="-0.24" max="0.24" step="0.01" value="0.24" />',
      '<div style="font-size:10px;color:#94a3b8;">矢状剖切(X)</div><input id="clip-x" type="range" min="-0.45" max="0.45" step="0.01" value="0.45" /><div style="font-size:10px;color:#94a3b8;">横断剖切(Y)</div><input id="clip-y" type="range" min="0.0" max="1.85" step="0.02" value="1.85" /><div style="font-size:10px;color:#94a3b8;">冠状剖切(Z)</div><input id="clip-z" type="range" min="-0.24" max="0.24" step="0.01" value="0.24" />'
    )
  if 'id="btn-undo-dissect"' not in h and 'id="btn-restore-dissect"' in h:
    h = h.replace(
      '<button id="btn-restore-dissect" class="btn glass">恢复剥离</button>',
      '<button id="btn-undo-dissect" class="btn glass">撤销剥离</button><button id="btn-restore-dissect" class="btn glass">恢复剥离</button><button id="btn-clear-callouts" class="btn glass">清标签</button>'
    )
  if 'id="d-pin-callout"' not in h and 'id="d-isolate-mesh"' in h:
    h = h.replace(
      '<button id="d-isolate-mesh"',
      '<button id="d-pin-callout" class="btn glass" style="color:#a5f3fc;">固定标签</button><button id="d-isolate-mesh"'
    )
  if 'lung_interior' not in h and 'data-micro="uterus_interior"' in h:
    h = h.replace(
      '<button class="micro-btn" data-micro="uterus_interior">NIH 子宫(20结构)</button>',
      '<button class="micro-btn" data-micro="uterus_interior">NIH 子宫(20结构)</button><button class="micro-btn" data-micro="lung_interior">NIH 肺支气管</button><button class="micro-btn" data-micro="pancreas_interior">NIH 胰腺</button><button class="micro-btn" data-micro="spleen_interior">NIH 脾脏</button><button class="micro-btn" data-micro="large_intestine_interior">NIH 大肠</button><button class="micro-btn" data-micro="small_intestine_interior">NIH 小肠</button><button class="micro-btn" data-micro="eye_interior">NIH 眼球</button><button class="micro-btn" data-micro="prostate_interior">NIH 前列腺</button><button class="micro-btn" data-micro="kidney_r_interior">NIH 右肾</button>'
    )
  open(idx_path, 'w', encoding='utf-8').write(h)

# 3. Patch src/app.js
app_path = 'src/app.js'
if os.path.exists(app_path):
  a = open(app_path, encoding='utf-8').read()
  a = a.replace('meridianOverlay.updateNeedleSimulation(activePointForNeedle, d)', 'meridianOverlay.updateNeedleSimulation(activePointForNeedle, d, anatomyGroup, translateAnatName)')
  a = a.replace('biomechEngine.showJointKinematics(b.dataset.joint)', 'biomechEngine.showJointKinematics(b.dataset.joint, anatomyGroup)')
  if 'btn-undo-dissect' not in a:
    a += '''
;(() => {
  const cx = document.getElementById('clip-x');
  const cy = document.getElementById('clip-y');
  if (cx && engine.clipPlaneX) cx.addEventListener('input', (e) => { engine.clipPlaneX.constant = parseFloat(e.target.value); });
  if (cy && engine.clipPlaneY) cy.addEventListener('input', (e) => { engine.clipPlaneY.constant = parseFloat(e.target.value); });
  const undoBtn = document.getElementById('btn-undo-dissect');
  if (undoBtn && engine.undoLastHide) undoBtn.addEventListener('click', () => {
    toastEl.innerText = engine.undoLastHide() ? '已撤销上一步剥离' : '没有可撤销的剥离记录';
  });
  const clrPinBtn = document.getElementById('btn-clear-callouts');
  if (clrPinBtn && engine.clearCalloutPins) clrPinBtn.addEventListener('click', () => {
    engine.clearCalloutPins();
    toastEl.innerText = '已清除所有 3D 固定引线标签';
  });
  const pinCallBtn = document.getElementById('d-pin-callout');
  if (pinCallBtn && engine.addCalloutPin) pinCallBtn.addEventListener('click', () => {
    const nm = (document.getElementById('d-name') || {}).innerText || '解剖结构';
    if (focusRing.visible) {
      engine.addCalloutPin(focusRing.position, nm);
      toastEl.innerText = '已在 3D 模型表面固定引线标签：' + nm;
    }
  });
})();
'''
  open(app_path, 'w', encoding='utf-8').write(a)

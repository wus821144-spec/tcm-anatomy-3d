#!/usr/bin/env python3
"""
R1-Pro Visual, Material, Layer-Color, Anti-Clipping & Upright-Camera Patch
- Replaces sanitizeAndUpgradeModelRoot, upgradeBiologicalMaterial,
  applyLayerAndGenderStyles, and autoFitAnatomyIfNeeded via balanced-brace matching.
- Eliminates half-white/half-maroon meshes and assigns distinct per-layer colors.
- Removes misplaced Visceral meshes below pelvis (y < 0.58) and outliers below feet (y < -0.08).
- Slightly insets Visceral geometry around each organ's own center (0.955x) to prevent organ-through-muscle clipping.
- Hides Skin by default on startup and frames full standing body upright from +Z.
"""
import os
import re

def replace_js_function(code: str, fn_name: str, new_fn_code: str) -> tuple[str, bool]:
    pattern = re.compile(rf'(?:^|\n)([ \t]*function\s+{re.escape(fn_name)}\s*\([^)]*\)\s*\{{)')
    m = pattern.search(code)
    if not m:
        return code, False
    start = m.start(1)
    brace_start = code.find('{', m.start(1))
    depth = 0
    i = brace_start
    n = len(code)
    in_str = None
    while i < n:
        ch = code[i]
        if in_str:
            if ch == '\\':
                i += 2
                continue
            if ch == in_str:
                in_str = None
        else:
            if ch in ('"', "'", '`'):
                in_str = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    return code[:start] + new_fn_code + code[end:], True
        i += 1
    return code, False


NEW_SANITIZE_FN = """  function sanitizeAndUpgradeModelRoot(root, upgradeMaterialFn) {
    const toRemove = [];
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    root.updateMatrixWorld(true);
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const rawName = obj.name || '';
      const low = rawName.toLowerCase();
      const parts = rawName.split('__');
      const sys = parts.length >= 2 ? parts[0] : 'Visceral';
      if (
        low.includes('plane') || low.includes('backdrop') || low.includes('grid') ||
        low.includes('menu') || low.includes('_label') || low.includes('gizmo') ||
        low.includes('regions of human') || low.includes('general terms') ||
        low.includes('reference line') || low.includes('lymphoid organs')
      ) { toRemove.push(obj); return; }
      if (obj.geometry) {
        obj.geometry.computeBoundingBox();
        if (obj.geometry.boundingBox) {
          box.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
          box.getSize(size);
          box.getCenter(center);
          const maxD = Math.max(size.x, size.y, size.z);
          const minD = Math.min(size.x, size.y, size.z);
          const vCount = obj.geometry.attributes.position ? obj.geometry.attributes.position.count : 0;
          if (vCount <= 256 && maxD > 0.14 && minD < 0.005 * maxD) { toRemove.push(obj); return; }
          if (sys === 'Visceral' && center.y < 0.58) { toRemove.push(obj); return; }
          if (box.min.y < -0.08 && center.y < 0.05) { toRemove.push(obj); return; }
          if (sys === 'Visceral' && !obj.userData._viscInset) {
            const gBox = obj.geometry.boundingBox;
            const gc = new THREE.Vector3();
            gBox.getCenter(gc);
            obj.geometry.translate(-gc.x, -gc.y, -gc.z);
            obj.geometry.scale(0.955, 0.955, 0.955);
            obj.geometry.translate(gc.x, gc.y, gc.z);
            obj.geometry.computeBoundingBox();
            obj.userData._viscInset = true;
          }
        }
      }
      if (upgradeMaterialFn) upgradeMaterialFn(obj);
    });
    toRemove.forEach((m) => {
      if (m.parent) m.parent.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) { if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose()); else m.material.dispose(); }
    });
  }"""

NEW_UPGRADE_MAT_FN = """  function upgradeBiologicalMaterial(mesh) {
    if (!mesh.isMesh || !mesh.material) return;
    const parts = (mesh.name || '').split('__');
    const sys = parts.length >= 2 ? parts[0] : 'Visceral';
    const lowN = (mesh.name || '').toLowerCase();
    const oldMat = mesh.material;
    const activeClips = (typeof clipPlaneX !== 'undefined' && typeof clipPlaneY !== 'undefined')
      ? [clipPlaneX, clipPlaneY, clipPlaneZ]
      : [clipPlaneZ];

    let h = 0;
    for (let i = 0; i < lowN.length; i++) h = ((h << 5) - h + lowN.charCodeAt(i)) | 0;
    const jitter = ((Math.abs(h) % 100) / 100 - 0.5) * 0.06;

    if (sys === 'Muscular') {
      const c = new THREE.Color(0xb84339);
      c.offsetHSL(jitter * 0.12, jitter * 0.3, jitter * 0.45);
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: c, normalMap: MUSCLE_NORMAL, normalScale: new THREE.Vector2(0.45, 0.45),
        roughness: 0.56, metalness: 0.02, clearcoat: 0.08, clearcoatRoughness: 0.45,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    } else if (sys === 'Skeleton') {
      const c = new THREE.Color(0xebe2ce);
      c.offsetHSL(0, 0, jitter * 0.35);
      mesh.material = new THREE.MeshStandardMaterial({
        color: c, normalMap: BONE_NORMAL, normalScale: new THREE.Vector2(0.25, 0.25),
        roughness: 0.68, metalness: 0.02, clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    } else if (sys === 'LigamentJoint') {
      const c = new THREE.Color(0xbae6fd);
      c.offsetHSL(0, 0, jitter * 0.25);
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: c, normalMap: MUSCLE_NORMAL, normalScale: new THREE.Vector2(0.18, 0.18),
        roughness: 0.42, sheen: 0.50, sheenColor: new THREE.Color(0xe0f2fe),
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    } else if (sys === 'Neurovascular') {
      let hex = 0xfacc15;
      let sub = 'Nervous';
      if (/arter|aort|coronary|carotid/.test(lowN)) { hex = 0xef4444; sub = 'Arterial'; }
      else if (/vein|ven|vena|jugular|saphen/.test(lowN)) { hex = 0x2563eb; sub = 'Venous'; }
      else if (/lymph|thoracic duct/.test(lowN)) { hex = 0x10b981; sub = 'Lymphatic'; }
      mesh.userData.subSys = sub;
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(hex), emissive: new THREE.Color(hex), emissiveIntensity: 0.12,
        roughness: 0.32, clearcoat: 0.28, clearcoatRoughness: 0.30,
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    } else if (sys === 'Visceral') {
      let hex = 0xc25949;
      if (/heart|pericard|atrium|ventricle/.test(lowN)) hex = 0x991b1b;
      else if (/lung|bronch|pleura|alveol/.test(lowN)) hex = 0xfda4af;
      else if (/liver|hepat/.test(lowN)) hex = 0x7c2d12;
      else if (/kidney|renal|adrenal/.test(lowN)) hex = 0x7f1d1d;
      else if (/brain|cereb|encephal|meninges/.test(lowN)) hex = 0xfbcfe8;
      else if (/stomach|gastr|intestin|colon|duoden|esophag/.test(lowN)) hex = 0xd97706;
      else if (/spleen|splen/.test(lowN)) hex = 0x881337;
      else if (/pancrea|bladder|gall/.test(lowN)) hex = 0xeab308;
      const c = new THREE.Color(hex);
      c.offsetHSL(0, 0, jitter * 0.25);
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: c, roughness: 0.42, roughnessMap: BIO_ROUGHNESS,
        clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 0.95,
        polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    } else if (sys === 'Skin') {
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xd6a88f), normalMap: BONE_NORMAL, normalScale: new THREE.Vector2(0.10, 0.10),
        roughness: 0.52, clearcoat: 0.10, sheen: 0.30, sheenColor: new THREE.Color(0xffedd5),
        transparent: true, opacity: state.skinOpacity, depthWrite: false,
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    } else {
      mesh.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xc25949), roughness: 0.5,
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    }
    if (oldMat && oldMat.dispose) oldMat.dispose();
  }"""

NEW_APPLY_LAYERS_FN = """  function applyLayerAndGenderStyles() {
    anatomyGroup.traverse((c) => {
      if (!c.isMesh) return;
      const parts = (c.name || '').split('__');
      const sys = parts.length >= 2 ? parts[0] : 'Visceral';
      const genderTag = parts.length >= 3 ? parts[1] : 'Common';
      let layerVis = !!state.visibleLayers[sys];
      if (sys === 'Neurovascular') {
        const sub = c.userData.subSys || 'Nervous';
        if (state.visibleLayers[sub] !== undefined) layerVis = !!state.visibleLayers[sub];
      }
      c.visible = !state.hiddenDissectedMeshes.has(c) && layerVis && (genderTag === 'Common' || genderTag === state.activeGender);
      if (!c.userData._origScale) c.userData._origScale = c.scale.clone();
      if (state.activeGender === 'Female') {
        const lowM = (c.name || '').toLowerCase();
        if (/pelvi|ilium|ischium|pubis|sacrum|glute|hip/.test(lowM)) {
          c.scale.set(c.userData._origScale.x * 1.08, c.userData._origScale.y * 0.96, c.userData._origScale.z * 1.04);
        } else if (/rib|clavicle|scapula|sternum|thorax|pectoral|deltoid/.test(lowM)) {
          c.scale.set(c.userData._origScale.x * 0.91, c.userData._origScale.y * 0.96, c.userData._origScale.z * 0.94);
        } else {
          c.scale.set(c.userData._origScale.x * 0.96, c.userData._origScale.y * 0.98, c.userData._origScale.z * 0.97);
        }
      } else {
        c.scale.copy(c.userData._origScale);
      }
      if (c.material) {
        if (state.ghostMode) {
          c.material.transparent = true; c.material.opacity = 0.16; c.material.depthWrite = false;
        } else if (sys === 'Skin') {
          c.material.color.setHex(0xd6a88f);
          c.material.transparent = state.skinOpacity < 0.99;
          c.material.opacity = state.skinOpacity;
          c.material.depthWrite = state.skinOpacity >= 0.99;
        } else {
          c.material.transparent = false; c.material.opacity = 1.0; c.material.depthWrite = true;
        }
      }
    });
  }"""

NEW_AUTOFIT_FN = """  function autoFitAnatomyIfNeeded() {
    if (state.hasAutoFitted || state.activeZone) return;
    const box = new THREE.Box3().setFromObject(anatomyGroup);
    if (box.isEmpty()) return;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    if (size.z > size.x * 1.15 && size.z > size.y * 1.15) {
      anatomyGroup.rotation.x = -Math.PI / 2;
      box.setFromObject(anatomyGroup);
      box.getSize(size);
      box.getCenter(center);
    }
    if (size.y > 0.2) {
      controls.target.set(center.x, center.y, center.z);
      camera.up.set(0, 1, 0);
      camera.position.set(center.x, center.y + 0.06, center.z + Math.max(size.y * 1.68, 2.48));
      controls.update();
      if (Object.keys(state.loadedRegions).length >= 5 || size.y > 1.35) {
        state.hasAutoFitted = true;
      }
    }
  }"""


def patch_engine_3d(path: str) -> None:
    if not os.path.exists(path):
        print(f"Skip missing {path}")
        return
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    code = re.sub(
        r'camera\.position\.set\([^)]+\);',
        'camera.position.set(0, 0.98, 2.65); camera.up.set(0, 1, 0);',
        code, count=1
    )
    code = re.sub(
        r'controls\.target\.set\([^)]+\);',
        'controls.target.set(0, 0.90, 0);',
        code, count=1
    )
    code = re.sub(
        r'const\s+clipPlaneZ\s*=\s*new\s+THREE\.Plane\([^)]+\)\s*,?\s*[^)]*\)\s*;',
        'const clipPlaneZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 2.5);',
        code, count=1
    )

    code = re.sub(
        r'visibleLayers:\s*\{[^}]+\}',
        "visibleLayers: { Skin: false, LigamentJoint: true, Muscular: true, Skeleton: true, Visceral: true, Neurovascular: true, Arterial: true, Venous: true, Nervous: true, Lymphatic: true, Points: true }",
        code, count=1
    )
    code = re.sub(r'skinOpacity:\s*[0-9.]+', 'skinOpacity: 0.28', code, count=1)

    for fn_name, new_fn in [
        ('sanitizeAndUpgradeModelRoot', NEW_SANITIZE_FN),
        ('upgradeBiologicalMaterial', NEW_UPGRADE_MAT_FN),
        ('applyLayerAndGenderStyles', NEW_APPLY_LAYERS_FN),
        ('autoFitAnatomyIfNeeded', NEW_AUTOFIT_FN),
    ]:
        code, ok = replace_js_function(code, fn_name, new_fn)
        print(f"{path}: replace {fn_name} -> {'OK' if ok else 'NOT FOUND'}")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)


def patch_index_html(path: str) -> None:
    if not os.path.exists(path):
        print(f"Skip missing {path}")
        return
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    def _strip_on_from_skin(m):
        tag = m.group(0)
        return re.sub(r'\bon\b', '', tag).replace('  ', ' ')

    html = re.sub(r'\x3cbutton[^>]*data-layer=["\']Skin["\'][^>]*>', _strip_on_from_skin, html)
    html = re.sub(r'background:\s*#[0-9a-fA-F]{3,8}\s*;(\s*/\*\s*canvas-bg\s*\*/)?', 'background: #05070b;', html, count=1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"{path}: updated Skin default toggle & Carbon-Ink theme")


if __name__ == '__main__':
    for p in ['src/engine_3d.js']:
        patch_engine_3d(p)
    for p in ['src/index.html', 'www/index.html']:
        patch_index_html(p)):
  src = open(e3d_path, encoding='utf-8').read()

  old_filter = "low.includes('regions of human') || low.includes('general terms')"
  new_filter = (
    "low.includes('regions of human') || low.includes('general terms') || "
    "low.includes('skeletal system') || low.includes('muscular system') || "
    "low.includes('nervous system') || low.includes('visceral system') || "
    "low.includes('reference line') || low.includes('lymphoid organ') || "
    "low.includes('sense organ') || low.includes('cardiovascular system') || "
    "low.includes('movements') || low.includes('font') || low.includes('cross_section') || "
    "low.includes('hair') || low.includes('eyebrow') || low.includes('eyelash')"
  )
  src = src.replace(old_filter, new_filter)

  src = src.replace("const ctr = new THREE.Vector3(); box.getCenter(ctr);\n          if (ctr.y < -0.05 || ctr.y > 1.85 || Math.abs(ctr.x) > 0.52 || Math.abs(ctr.z) > 0.42) { toRemove.push(obj); return; }", "")
  if 'wBox' not in src:
    src = src.replace(
      "if (vCount <= 256 && maxD > 0.14 && minD < 0.005 * maxD) { toRemove.push(obj); return; }",
      "if (vCount <= 256 && maxD > 0.14 && minD < 0.005 * maxD) { toRemove.push(obj); return; }\n          obj.updateWorldMatrix(true, false);\n          const wBox = new THREE.Box3().setFromObject(obj);\n          const wCtr = new THREE.Vector3(); wBox.getCenter(wCtr);\n          if (wCtr.y < 0.0 || wCtr.y > 1.82 || Math.abs(wCtr.x) > 0.48 || Math.abs(wCtr.z) > 0.35) { toRemove.push(obj); return; }"
    )

  src = src.replace(
    "if (sys === 'Muscular') {\n      mesh.material = new THREE.MeshPhysicalMaterial({\n        color: baseColor, normalMap: MUSCLE_NORMAL, normalScale: new THREE.Vector2(0.45, 0.45),\n        roughness: 0.42, clearcoat: 0.18, clearcoatRoughness: 0.35, clippingPlanes: [clipPlaneX, clipPlaneY, clipPlaneZ], side: THREE.DoubleSide\n      });",
    "if (sys === 'Muscular') {\n      if (baseColor.r > 0.65 && baseColor.g > 0.65 && baseColor.b > 0.65) baseColor.setHex(0xa63a33);\n      mesh.material = new THREE.MeshPhysicalMaterial({\n        color: baseColor, normalMap: MUSCLE_NORMAL, normalScale: new THREE.Vector2(0.38, 0.38),\n        roughness: 0.58, clearcoat: 0.08, clearcoatRoughness: 0.45, clippingPlanes: [clipPlaneX, clipPlaneY, clipPlaneZ], side: THREE.DoubleSide\n      });"
  )
  src = src.replace("roughness: 0.56, metalness: 0.04,", "roughness: 0.68, metalness: 0.02,")
  src = src.replace("roughness: 0.26, roughnessMap: BIO_ROUGHNESS,\n        clearcoat: 0.78, clearcoatRoughness: 0.12,", "roughness: 0.42, roughnessMap: BIO_ROUGHNESS,\n        clearcoat: 0.25, clearcoatRoughness: 0.32,")
  src = src.replace("visibleLayers: { Skin: true,", "visibleLayers: { Skin: false,")

  old_fit = "if (size.y > 0.2 && !state.activeZone) {\n      controls.target.copy(center);\n      camera.position.set(center.x, center.y + 0.1, center.z + Math.max(size.y * 1.45, 1.8));\n      state.hasAutoFitted = true;\n    }"
  new_fit = """if (size.y > 0.2 && !state.activeZone) {
      if (size.z > size.x * 1.15 && Math.abs(anatomyGroup.rotation.y) < 0.1) {
        anatomyGroup.rotation.y = Math.PI / 2;
        box.setFromObject(anatomyGroup);
        box.getSize(size);
        box.getCenter(center);
      }
      controls.target.set(center.x, center.y, center.z);
      camera.position.set(center.x, center.y + 0.05, center.z + Math.max(size.y * 1.65, 2.40));
      state.hasAutoFitted = true;
    }"""
  src = src.replace(old_fit, new_fit)
  src = src.replace("opacity: 0.14, wireframe: true, depthWrite: false", "opacity: 0.0, wireframe: false, depthWrite: false")
  src = src.replace("envScene.background = new THREE.Color(0x0f172a);", "envScene.background = new THREE.Color(0x05070b);")
  open(e3d_path, 'w', encoding='utf-8').write(src)

idx_path = 'www/index.html'
if os.path.exists(idx_path):
  h = open(idx_path, encoding='utf-8').read()
  h = h.replace('class="layer-btn on" data-layer="Skin"', 'class="layer-btn" data-layer="Skin"')
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

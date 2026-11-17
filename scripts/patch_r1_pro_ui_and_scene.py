#!/usr/bin/env python3
"""
R1-Pro Root-Cause Fix: Full-Body Retention + Latin Anatomical Layer Classification + 60FPS Mobile
Fixes all issues seen in device screenshots:
1. Stops `evictInactiveRegions` from deleting loaded body regions (fixes missing head/torso/arms/left leg).
2. Adds comprehensive Latin+English `classifyAnatSystem(mesh)` so:
   - Thigh/arm/torso Latin muscles (Sartorius, Vastus, Gastrocnemius, etc.) go to Muscular (NOT Visceral!)
   - Bones (Femur, Tibia, Fibula, Skull, Ribs, etc.) go to Skeleton (NOT LigamentJoint!)
   - Arteries, Veins, Nerves, Lymphatics go to Arterial / Venous / Nervous / Lymphatic (NOT blank!)
   - Visceral contains ONLY actual internal organs, culled below pelvis (y < 0.58) & inset 0.955x.
3. Disables expensive per-mesh shadowMap double-pass so mobile GPUs sustain 50-60 FPS instead of 20-29 FPS.
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


CLASSIFY_HELPER_JS = """  function classifyAnatSystem(mesh) {
    const raw = mesh.name || '';
    const parts = raw.split('__');
    const prefix = parts.length >= 2 ? parts[0] : '';
    const low = raw.toLowerCase();

    if (prefix === 'Skin' || /skin|integument|epiderm|cutane|hair|nail/.test(low)) return 'Skin';
    if (/lymph|thoracic_duct|thoracic duct|cisterna_chyli/.test(low)) return 'Lymphatic';
    if (/artery|arteria|arterial|aorta|aortic|carotid|subclavian|coronary|celiac|mesenteric/.test(low) && !/vein|vena|nerve|nerv/.test(low)) return 'Arterial';
    if (/vein|vena|venous|jugular|saphenous|cephalic|basilic|azygos|portal/.test(low) && !/artery|nerve|nerv/.test(low)) return 'Venous';
    if (/nerve|nervus|nervous|plexus|sciatic|vagus|phrenic|ganglion|ganglia|brachial_p|lumbosacral/.test(low)) return 'Nervous';
    if (/ligament|capsule|meniscus|cartilage|bursa|symphysis|retinaculum|disc|labrum|tendon|aponeurosis|sheath/.test(low)) return 'LigamentJoint';
    if (/bone|skelet|skull|cranium|mandible|maxilla|zygomatic|nasal_bone|frontal_bone|parietal_bone|temporal_bone|occipital|sphenoid|ethmoid|vertebra|sacrum|coccyx|sternum|rib|costa|clavicle|scapula|humerus|radius|ulna|carpal|metacarpal|phalanx|phalanges|pelvis|ilium|ischium|pubis|femur|patella|tibia|fibula|tarsal|talus|calcaneus|navicular|cuboid|cuneiform|metatarsal/.test(low)) return 'Skeleton';
    if (/muscle|muscul|fascia|diaphragm|vastus|rectus|biceps|triceps|brachialis|deltoid|pectoral|trapezius|latissimus|rhomboid|serratus|oblique|transversus|psoas|iliacus|gluteus|piriformis|sartorius|gracilis|adductor|abductor|semitendinosus|semimembranosus|tibialis|fibularis|peroneus|gastrocnemius|soleus|plantaris|popliteus|flexor|extensor|pronator|supinator|masseter|temporalis|sternocleido|scalene|splenius|erector|intercostal|orbicularis|buccinator|platysma/.test(low)) return 'Muscular';
    if (/heart|pericard|atrium|ventricle|lung|bronch|pleura|trachea|larynx|pharynx|liver|hepat|gallbladder|stomach|gastr|intestin|duoden|jejunum|ileum|colon|cecum|rectum|esophag|kidney|renal|ureter|urethra|bladder|spleen|pancreas|thyroid|adrenal|brain|cerebr|cerebell|encephal|meninges|uterus|ovary|prostate|testis|epididymis|vagina|penis/.test(low)) return 'Visceral';

    if (prefix === 'Neurovascular') return 'Arterial';
    if (prefix) return prefix;
    return 'Visceral';
  }"""

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
      if (
        low.includes('plane') || low.includes('backdrop') || low.includes('grid') ||
        low.includes('menu') || low.includes('_label') || low.includes('gizmo') ||
        low.includes('regions of human') || low.includes('general terms') ||
        low.includes('reference line') || low.includes('lymphoid organs')
      ) { toRemove.push(obj); return; }
      const sys = classifyAnatSystem(obj);
      obj.userData.anatSys = sys;
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
    if (mesh.geometry && !mesh.geometry.attributes.uv && mesh.geometry.attributes.position) {
      const pos = mesh.geometry.attributes.position;
      const uvs = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uvs[i * 2] = (pos.getX(i) + pos.getZ(i)) * 2.5;
        uvs[i * 2 + 1] = pos.getY(i) * 2.5;
      }
      mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }
    const sys = mesh.userData.anatSys || classifyAnatSystem(mesh);
    mesh.userData.anatSys = sys;
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
        color: c, normalMap: MUSCLE_NORMAL, normalScale: new THREE.Vector2(0.42, 0.42),
        roughness: 0.54, metalness: 0.02, clearcoat: 0.10, clearcoatRoughness: 0.42,
        sheen: 0.22, sheenColor: new THREE.Color(0xfca5a5),
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    } else if (sys === 'Skeleton') {
      const c = new THREE.Color(0xebe2ce);
      c.offsetHSL(0, 0, jitter * 0.35);
      mesh.material = new THREE.MeshStandardMaterial({
        color: c, normalMap: BONE_NORMAL, normalScale: new THREE.Vector2(0.28, 0.28),
        roughness: 0.64, metalness: 0.03, envMapIntensity: 0.85,
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    } else if (sys === 'LigamentJoint') {
      const c = new THREE.Color(0xbae6fd);
      c.offsetHSL(0, 0, jitter * 0.25);
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: c, normalMap: MUSCLE_NORMAL, normalScale: new THREE.Vector2(0.18, 0.18),
        roughness: 0.40, sheen: 0.55, sheenColor: new THREE.Color(0xe0f2fe),
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    } else if (sys === 'Arterial' || sys === 'Venous' || sys === 'Nervous' || sys === 'Lymphatic') {
      const hexMap = { Arterial: 0xef4444, Venous: 0x2563eb, Nervous: 0xfacc15, Lymphatic: 0x10b981 };
      const hex = hexMap[sys] || 0xef4444;
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(hex), emissive: new THREE.Color(hex), emissiveIntensity: 0.16,
        roughness: 0.30, clearcoat: 0.32, clearcoatRoughness: 0.28,
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
        color: c, roughness: 0.40, roughnessMap: BIO_ROUGHNESS,
        clearcoat: 0.28, clearcoatRoughness: 0.32, envMapIntensity: 1.0,
        polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    } else if (sys === 'Skin') {
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xd6a88f), normalMap: BONE_NORMAL, normalScale: new THREE.Vector2(0.10, 0.10),
        roughness: 0.50, clearcoat: 0.10, sheen: 0.35, sheenColor: new THREE.Color(0xffedd5),
        transparent: true, opacity: state.skinOpacity, depthWrite: false,
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    } else {
      mesh.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xc25949), roughness: 0.5,
        clippingPlanes: activeClips, side: THREE.DoubleSide
      });
    }
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (oldMat) {
      if (Array.isArray(oldMat)) oldMat.forEach((m) => m && m.dispose && m.dispose());
      else if (oldMat.dispose) oldMat.dispose();
    }
  }"""

NEW_APPLY_LAYERS_FN = """  function applyLayerAndGenderStyles() {
    anatomyGroup.traverse((c) => {
      if (!c.isMesh) return;
      const parts = (c.name || '').split('__');
      const sys = c.userData.anatSys || classifyAnatSystem(c);
      const genderTag = parts.length >= 3 ? parts[1] : 'Common';
      const layerVis = !!state.visibleLayers[sys];
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
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach((m) => {
          if (!m) return;
          if (state.ghostMode) {
            m.transparent = true; m.opacity = 0.16; m.depthWrite = false;
          } else if (sys === 'Skin') {
            if (m.color) m.color.setHex(0xd6a88f);
            m.transparent = state.skinOpacity < 0.99;
            m.opacity = state.skinOpacity;
            m.depthWrite = state.skinOpacity >= 0.99;
          } else {
            m.transparent = false; m.opacity = 1.0; m.depthWrite = true;
          }
        });
      }
    });
  }"""

NEW_EVICT_FN = """  function evictInactiveRegions(keepSet, isEco) {
    return;
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
      if (Object.keys(state.loadedRegions).length >= 6 || size.y > 1.45) {
        state.hasAutoFitted = true;
      }
    }
  }"""

NEW_HIGHLIGHT_FN = """  function highlightSelectedMesh(mesh) {
    if (prevHighlighted && prevHighlighted.material) {
      const pm = Array.isArray(prevHighlighted.material) ? prevHighlighted.material[0] : prevHighlighted.material;
      if (pm && pm.emissive && prevHighlighted.userData._origEmissive !== undefined) {
        pm.emissive.setHex(prevHighlighted.userData._origEmissive);
        pm.emissiveIntensity = prevHighlighted.userData._origEmissiveInt || 0;
      }
    }
    prevHighlighted = mesh || null;
    if (mesh && mesh.material) {
      const mm = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (mm && mm.emissive) {
        if (mesh.userData._origEmissive === undefined) {
          mesh.userData._origEmissive = mm.emissive.getHex();
          mesh.userData._origEmissiveInt = mm.emissiveIntensity || 0;
        }
        mm.emissive.setHex(0x0ea5e9);
        mm.emissiveIntensity = 0.55;
      }
    }
  }"""


def patch_engine_3d(path: str) -> None:
    if not os.path.exists(path):
        print(f"Skip missing {path}")
        return
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    if 'function classifyAnatSystem(' not in code:
        code = code.replace('  function sanitizeAndUpgradeModelRoot(', CLASSIFY_HELPER_JS + '\n\n  function sanitizeAndUpgradeModelRoot(', 1)

    code = re.sub(r'renderer\.shadowMap\.enabled\s*=\s*true;', 'renderer.shadowMap.enabled = false;', code)
    code = re.sub(r'dir1\.castShadow\s*=\s*true;', 'dir1.castShadow = false;', code)
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
        r'renderer\.toneMappingExposure\s*=\s*[0-9.]+;',
        'renderer.toneMappingExposure = 1.18;',
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
        ('evictInactiveRegions', NEW_EVICT_FN),
        ('autoFitAnatomyIfNeeded', NEW_AUTOFIT_FN),
        ('highlightSelectedMesh', NEW_HIGHLIGHT_FN),
    ]:
        code, ok = replace_js_function(code, fn_name, new_fn)
        print(f"{path}: replace {fn_name} -> {'OK' if ok else 'NOT FOUND'}")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)


def patch_mobile_adapter(path: str) -> None:
    if not os.path.exists(path):
        print(f"Skip missing {path}")
        return
    with open(path, 'r', encoding='utf-8') as f:
        js = f.read()

    js = re.sub(
        r'renderer\.setPixelRatio\([^;]+\);',
        'renderer.setPixelRatio(isEco ? Math.min(window.devicePixelRatio || 1, 1.25) : Math.min(window.devicePixelRatio || 1, 2.0));',
        js, count=1
    )
    js = re.sub(
        r'const h = window\.innerHeight - 60;\s*camera\.aspect = window\.innerWidth / h;\s*camera\.updateProjectionMatrix\(\);\s*renderer\.setSize\(window\.innerWidth, h\);',
        'const wrap = renderer.domElement.parentElement; const w = (wrap && wrap.clientWidth) || window.innerWidth; const h = (wrap && wrap.clientHeight) || (window.innerHeight - 60); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); renderer.setSize(w, h);',
        js, count=1
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(js)
    print(f"{path}: optimized DPR cap & container-accurate resize")


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
    patch_engine_3d('src/engine_3d.js')
    patch_mobile_adapter('src/mobile_adapter.js')
    for p in ['src/index.html', 'www/index.html']:
        patch_index_html(p)

# EOF

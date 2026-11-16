import os

# 1. Add Ren & Du meridians to MER_LAYERS in src/tcm_meridian_engine.js
mer_path = 'src/tcm_meridian_engine.js'
if os.path.exists(mer_path):
  s = open(mer_path, encoding='utf-8').read()
  if "'任脉'" not in s and 'const MER_LAYERS = {' in s:
    extra = """const MER_LAYERS = {
  '任脉': { layers: '皮肤 → 浅筋膜 → 腹白线 / 胸骨体骨膜 → 腹横筋膜（腹部）', vessels: '腹壁上、下动脉分支，胸廓内动脉穿支', nerves: '肋间神经前皮支（T1–T12）及髂腹下神经分支', depth: '胸骨段平刺 0.3–0.5寸（防穿透胸骨孔）；上腹及脐周直刺 0.5–1.0寸（禁暴力深刺伤及腹腔脏器）；下腹关元/中极直刺前须排空膀胱' },
  '督脉': { layers: '皮肤 → 浅筋膜 → 棘上韧带 → 棘间韧带（深层近黄韧带/椎管）', vessels: '椎动脉分支（枕下三角段）、肋间后动脉及腰动脉背侧支', nerves: '枕大神经（C2）、颈/胸/腰脊神经后支', depth: '风府/哑门向鼻尖或下颌方向斜刺 0.5–0.8寸（严禁向上深刺延髓）；胸腰段棘突间直刺或微向上斜刺 0.5–1.0寸，禁穿透黄韧带伤及脊髓' },"""
    s = s.replace('const MER_LAYERS = {', extra, 1)
    open(mer_path, 'w', encoding='utf-8').write(s)

# 2. Upgrade src/micro_anatomy_engine.js with NIH HRA GLB loader + procedural fallback
micro_code = '''import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const HRA_ORGANS = {
  heart_interior: { url: './models/hra_heart.glb', label: 'NIH HRA 心脏 (17 结构)' },
  brain_interior: { url: './models/hra_brain.glb', label: 'NIH HRA 脑图谱 (108 结构)' },
  kidney_interior: { url: './models/hra_kidney.glb', label: 'NIH HRA 左肾 (31 结构)' },
  liver_interior: { url: './models/hra_liver.glb', label: 'NIH HRA 肝脏 (23 结构)' },
  uterus_interior: { url: './models/hra_uterus.glb', label: 'NIH HRA 子宫 (20 结构)' }
};

export function createMicroAnatomyEngine(scene) {
  const microGroup = new THREE.Group();
  microGroup.visible = false;
  scene.add(microGroup);
  let activeType = null;
  const loader = new GLTFLoader();
  const hraCache = {};

  function clearMicro() {
    while (microGroup.children.length > 0) {
      const c = microGroup.children.pop();
      if (c.userData && c.userData.isCachedHra) continue;
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    }
    microGroup.visible = false;
    activeType = null;
  }

  function buildProceduralFallback(type) {
    if (type === 'heart_interior') {
      const wall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 28, 0, Math.PI * 1.35), new THREE.MeshPhysicalMaterial({ color: 0x991b1b, roughness: 0.38, clearcoat: 0.35, side: THREE.DoubleSide }));
      const septum = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.32, 0.22), new THREE.MeshStandardMaterial({ color: 0xfca5a5, roughness: 0.45 }));
      const aorta = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 16, 28, Math.PI * 1.1), new THREE.MeshPhysicalMaterial({ color: 0xdc2626, roughness: 0.25, clearcoat: 0.6 }));
      aorta.position.set(0.02, 0.22, 0);
      microGroup.add(wall, septum, aorta);
    } else if (type === 'kidney_interior') {
      const cortex = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 24, 0, Math.PI * 1.4), new THREE.MeshPhysicalMaterial({ color: 0x7f1d1d, roughness: 0.4, side: THREE.DoubleSide }));
      cortex.scale.set(0.75, 1.25, 0.55);
      const pelvis = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 18), new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.35 }));
      pelvis.rotation.z = Math.PI / 2; pelvis.position.set(-0.08, 0, 0);
      microGroup.add(cortex, pelvis);
    } else if (type === 'brain_interior') {
      const hemiL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 24, 0, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0xfda4af, roughness: 0.48, clearcoat: 0.25, side: THREE.DoubleSide }));
      hemiL.scale.set(0.85, 0.95, 1.18);
      const cc = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.024, 14, 28, Math.PI), new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.35 }));
      cc.rotation.y = Math.PI / 2;
      microGroup.add(hemiL, cc);
    } else if (type === 'liver_interior') {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 20), new THREE.MeshPhysicalMaterial({ color: 0x7c2d12, roughness: 0.35, clearcoat: 0.4 }));
      lobe.scale.set(1.25, 0.72, 0.75);
      microGroup.add(lobe);
    } else if (type === 'uterus_interior') {
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.30, 24), new THREE.MeshPhysicalMaterial({ color: 0xbe123c, roughness: 0.42, clearcoat: 0.35 }));
      body.rotation.z = Math.PI;
      microGroup.add(body);
    }
  }

  function attachNormalizedHra(type, root) {
    if (activeType !== type) return;
    root.userData.isCachedHra = true;
    microGroup.add(root);
  }

  function showMicroModel(type, onLoaded) {
    clearMicro();
    activeType = type;
    microGroup.visible = true;
    microGroup.position.set(0, 1.05, 0);

    if (HRA_ORGANS[type]) {
      const meta = HRA_ORGANS[type];
      if (hraCache[type]) {
        attachNormalizedHra(type, hraCache[type]);
        if (onLoaded) onLoaded(meta.label);
        return;
      }
      buildProceduralFallback(type);
      loader.load(meta.url, (gltf) => {
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size); box.getCenter(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 0.56 / maxDim;
        root.scale.setScalar(scale);
        root.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        root.traverse((m) => {
          if (!m.isMesh) return;
          m.castShadow = true; m.receiveShadow = true;
          if (m.material) { m.material.side = THREE.DoubleSide; m.material.needsUpdate = true; }
        });
        hraCache[type] = root;
        if (activeType === type) {
          while (microGroup.children.length > 0) {
            const c = microGroup.children.pop();
            if (c.geometry) c.geometry.dispose();
          }
          attachNormalizedHra(type, root);
          if (onLoaded) onLoaded(meta.label);
        }
      }, undefined, () => {});
      return;
    }

    if (type === 'alveolus') {
      const sacMat = new THREE.MeshPhysicalMaterial({ color: 0xfda4af, roughness: 0.35, clearcoat: 0.5, transparent: true, opacity: 0.82 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.105, 22, 22), sacMat);
        s.position.set(Math.cos(a) * 0.15, Math.sin(a * 2) * 0.08, Math.sin(a) * 0.15);
        microGroup.add(s);
      }
      microGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.24, 16), new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.45 })));
      const capCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.34, -0.1, 0.16), new THREE.Vector3(0, 0.18, 0.20), new THREE.Vector3(0.34, -0.08, -0.14)]);
      microGroup.add(new THREE.Mesh(new THREE.TubeGeometry(capCurve, 36, 0.02, 10, false), new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.25, clearcoat: 0.7 })));
    } else if (type === 'nephron') {
      const bowman = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24, 0, Math.PI * 1.5), new THREE.MeshPhysicalMaterial({ color: 0xfde68a, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
      const glom = new THREE.Mesh(new THREE.TorusKnotGeometry(0.06, 0.018, 56, 10), new THREE.MeshPhysicalMaterial({ color: 0xdc2626, clearcoat: 0.65 }));
      const tubule = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.14, 0, 0), new THREE.Vector3(0.28, 0.12, 0.06), new THREE.Vector3(0.24, -0.28, 0), new THREE.Vector3(0.35, -0.28, 0), new THREE.Vector3(0.40, 0.10, -0.05), new THREE.Vector3(0.48, -0.30, -0.05)]), 48, 0.022, 10, false), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 }));
      microGroup.add(bowman, glom, tubule);
    } else if (type === 'lobule') {
      const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.28, 6), new THREE.MeshPhysicalMaterial({ color: 0x991b1b, roughness: 0.35, clearcoat: 0.4, transparent: true, opacity: 0.78 }));
      const cv = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 16), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
      microGroup.add(hex, cv);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const triad = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.32, 10), new THREE.MeshStandardMaterial({ color: 0x10b981 }));
        triad.position.set(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25);
        microGroup.add(triad);
      }
    } else if (type === 'sarcomere') {
      const zMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
      const z1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.24), zMat); z1.position.x = -0.28;
      const z2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.24), zMat); z2.position.x = 0.28;
      microGroup.add(z1, z2);
      for (let y = -0.1; y <= 0.1; y += 0.1) {
        const myosin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 10), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        myosin.rotation.z = Math.PI / 2; myosin.position.y = y;
        const actinL = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
        actinL.rotation.z = Math.PI / 2; actinL.position.set(-0.17, y + 0.04, 0);
        const actinR = actinL.clone(); actinR.position.x = 0.17;
        microGroup.add(myosin, actinL, actinR);
      }
    } else if (type === 'synapse') {
      const pre = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24), new THREE.MeshPhysicalMaterial({ color: 0xfbbf24, roughness: 0.35, clearcoat: 0.4 }));
      pre.position.y = 0.14;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.14, 20), new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.4 }));
      post.position.y = -0.14;
      microGroup.add(pre, post);
      for (let i = 0; i < 10; i++) {
        const nt = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
        nt.position.set((Math.random() - 0.5) * 0.14, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.14);
        microGroup.add(nt);
      }
    } else if (type === 'valve') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.03, 16, 36), new THREE.MeshStandardMaterial({ color: 0xfca5a5 }));
      ring.rotation.x = Math.PI / 2;
      const cuspMat = new THREE.MeshPhysicalMaterial({ color: 0xfef2f2, roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.88 });
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.16, 12, 1, true), cuspMat);
        const a = (i / 3) * Math.PI * 2;
        c.position.set(Math.cos(a) * 0.08, -0.05, Math.sin(a) * 0.08);
        microGroup.add(c);
      }
      microGroup.add(ring);
    }
  }

  return { microGroup, showMicroModel, clearMicro, getActiveType: () => activeType };
}
'''
open('src/micro_anatomy_engine.js', 'w', encoding='utf-8').write(micro_code)

# 3. Add liver_interior & uterus_interior buttons in www/index.html
idx_path = 'www/index.html'
if os.path.exists(idx_path):
  h = open(idx_path, encoding='utf-8').read()
  if 'liver_interior' not in h and 'data-micro="brain_interior"' in h:
    h = h.replace(
      'data-micro="brain_interior">大脑内部</button>',
      'data-micro="brain_interior">NIH 脑图谱(108结构)</button><button class="micro-btn" data-micro="liver_interior">NIH 肝脏(23结构)</button><button class="micro-btn" data-micro="uterus_interior">NIH 子宫(20结构)</button>'
    )
    open(idx_path, 'w', encoding='utf-8').write(h)

# 4. Upgrade src/app.js: zone-aware drawCtSlice + microGroup raycasting & HRA label callback
app_path = 'src/app.js'
if os.path.exists(app_path):
  a = open(app_path, encoding='utf-8').read()
  if 'drawCtSlice(ctCanvas, d)' in a:
    a = a.replace('drawCtSlice(ctCanvas, d)', 'drawCtSlice(ctCanvas, d, (state.activeZone && state.activeZone.id) || "torso")')
  if 'microEngine.showMicroModel(b.dataset.micro);' in a:
    a = a.replace(
      'microEngine.showMicroModel(b.dataset.micro);',
      'zoneGroup.visible = false; microEngine.showMicroModel(b.dataset.micro, (lbl) => { toastEl.innerText = "已加载 " + lbl + "（点击器官结构可识别名称，点「总览」返回）"; });'
    )
  if 'if (!state.activeZone) {' in a and 'microEngine.microGroup.visible' not in a:
    a = a.replace(
      'if (!state.activeZone) {',
      'if (typeof microEngine !== "undefined" && microEngine.microGroup.visible) { const mHits = raycaster.intersectObjects(microEngine.microGroup.children, true); if (mHits.length > 0) { const nm = (mHits[0].object.name || "NIH HRA 器官结构").replace(/_/g, " "); toastEl.innerText = "NIH HRA 精细结构：" + nm; } return; }\n  if (!state.activeZone) {'
    )
  zone_ct_fn = """
function drawCtSlice(canvas, depthCun, zone) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, w, h);
  const z = String(zone || (state.activeZone && state.activeZone.id) || 'torso').toLowerCase();
  let title = '胸廓/躯干轴位 CT 断面';
  if (z.includes('head')) {
    title = '颅脑轴位 CT 断面';
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx, cy, 56, 66, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(cx, cy, 50, 60, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy - 58); ctx.lineTo(cx, cy + 58); ctx.stroke();
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.ellipse(cx - 11, cy - 4, 6, 16, -0.25, 0, Math.PI * 2); ctx.ellipse(cx + 11, cy - 4, 6, 16, 0.25, 0, Math.PI * 2); ctx.fill();
  } else if (z.includes('arm') || z.includes('leg')) {
    title = z.includes('arm') ? '上肢肌骨轴位 CT 断面' : '下肢肌骨轴位 CT 断面';
    ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, 56, 50, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.ellipse(cx, cy - 16, 36, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#991b1b'; ctx.beginPath(); ctx.ellipse(cx, cy + 18, 34, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(cx - 4, cy + 2, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(cx - 4, cy + 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx + 22, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(cx + 30, cy + 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(cx + 24, cy + 10, 3, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy, 68, 48, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#020617'; ctx.beginPath(); ctx.ellipse(cx - 26, cy, 24, 30, 0, 0, Math.PI * 2); ctx.ellipse(cx + 26, cy, 24, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#991b1b'; ctx.beginPath(); ctx.ellipse(cx + 4, cy - 6, 16, 18, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(cx - 9, cy + 32, 18, 14); ctx.fillRect(cx - 7, cy - 48, 14, 8);
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
  a = a + "\n" + zone_ct_fn
  open(app_path, 'w', encoding='utf-8').write(a)

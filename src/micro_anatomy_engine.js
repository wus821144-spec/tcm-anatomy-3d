import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const HRA_ORGANS = {
  heart_interior: { url: './models/hra_heart.glb', label: 'NIH HRA 心脏 (17 结构)' },
  brain_interior: { url: './models/hra_brain.glb', label: 'NIH HRA 脑图谱 (108 结构)' },
  kidney_interior: { url: './models/hra_kidney.glb', label: 'NIH HRA 左肾 (31 结构)' },
  kidney_r_interior: { url: './models/hra_kidney_r.glb', label: 'NIH HRA 右肾 (31 结构)' },
  liver_interior: { url: './models/hra_liver.glb', label: 'NIH HRA 肝脏 (23 结构)' },
  uterus_interior: { url: './models/hra_uterus.glb', label: 'NIH HRA 子宫 (20 结构)' },
  lung_interior: { url: './models/hra_lung.glb', label: 'NIH HRA 肺与支气管树' },
  pancreas_interior: { url: './models/hra_pancreas.glb', label: 'NIH HRA 胰腺' },
  spleen_interior: { url: './models/hra_spleen.glb', label: 'NIH HRA 脾脏' },
  large_intestine_interior: { url: './models/hra_large_intestine.glb', label: 'NIH HRA 大肠' },
  small_intestine_interior: { url: './models/hra_small_intestine.glb', label: 'NIH HRA 小肠' },
  eye_interior: { url: './models/hra_eye.glb', label: 'NIH HRA 眼球解剖' },
  prostate_interior: { url: './models/hra_prostate.glb', label: 'NIH HRA 前列腺' }
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
    const fallbackMat = new THREE.MeshPhysicalMaterial({ color: 0x991b1b, roughness: 0.38, clearcoat: 0.35, side: THREE.DoubleSide });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 24), fallbackMat);
    microGroup.add(core);
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
      const sacMat = new THREE.MeshPhysicalMaterial({ color: 0xfda4af, roughness: 0.32, clearcoat: 0.55, transparent: true, opacity: 0.84 });
      for (let i = 0; i < 14; i++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / 14);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.082, 24, 24), sacMat);
        s.position.set(0.16 * Math.sin(phi) * Math.cos(theta), 0.14 * Math.cos(phi) - 0.04, 0.16 * Math.sin(phi) * Math.sin(theta));
        microGroup.add(s);
      }
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.055, 0.28, 20), new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.4 }));
      stem.position.y = 0.22;
      microGroup.add(stem);
      const artCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.32, 0.18, 0.14), new THREE.Vector3(-0.08, 0.04, 0.21), new THREE.Vector3(0.14, -0.10, 0.18), new THREE.Vector3(0.28, -0.16, -0.08)]);
      const venCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.28, -0.16, -0.08), new THREE.Vector3(0.08, -0.18, -0.20), new THREE.Vector3(-0.18, 0.02, -0.18), new THREE.Vector3(-0.30, 0.20, -0.10)]);
      microGroup.add(new THREE.Mesh(new THREE.TubeGeometry(artCurve, 44, 0.016, 12, false), new THREE.MeshPhysicalMaterial({ color: 0x2563eb, clearcoat: 0.7 })));
      microGroup.add(new THREE.Mesh(new THREE.TubeGeometry(venCurve, 44, 0.016, 12, false), new THREE.MeshPhysicalMaterial({ color: 0xef4444, clearcoat: 0.7 })));
    } else if (type === 'nephron') {
      const bowman = new THREE.Mesh(new THREE.SphereGeometry(0.14, 28, 28, 0, Math.PI * 1.45), new THREE.MeshPhysicalMaterial({ color: 0xfde68a, roughness: 0.35, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
      const glom = new THREE.Mesh(new THREE.TorusKnotGeometry(0.062, 0.016, 72, 12, 2, 3), new THREE.MeshPhysicalMaterial({ color: 0xdc2626, clearcoat: 0.7 }));
      const tubule = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.13, 0, 0), new THREE.Vector3(0.24, 0.14, 0.07), new THREE.Vector3(0.22, -0.28, 0.02), new THREE.Vector3(0.32, -0.32, 0), new THREE.Vector3(0.38, 0.12, -0.05), new THREE.Vector3(0.46, -0.30, -0.05)]), 64, 0.022, 12, false), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.42 }));
      const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.56, 18), new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.45 }));
      duct.position.set(0.48, -0.05, -0.05);
      microGroup.add(bowman, glom, tubule, duct);
    } else if (type === 'lobule') {
      const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.28, 6), new THREE.MeshPhysicalMaterial({ color: 0x991b1b, roughness: 0.35, clearcoat: 0.4, transparent: true, opacity: 0.76 }));
      const cv = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 18), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
      microGroup.add(hex, cv);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const r = 0.25;
        const pv = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 10), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
        pv.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        const ha = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.34, 10), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        ha.position.set(Math.cos(a + 0.08) * (r + 0.02), 0, Math.sin(a + 0.08) * (r + 0.02));
        const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.34, 10), new THREE.MeshStandardMaterial({ color: 0x10b981 }));
        bd.position.set(Math.cos(a - 0.08) * (r + 0.02), 0, Math.sin(a - 0.08) * (r + 0.02));
        microGroup.add(pv, ha, bd);
      }
    } else if (type === 'sarcomere') {
      const zMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
      const z1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.36, 0.26), zMat); z1.position.x = -0.30;
      const z2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.36, 0.26), zMat); z2.position.x = 0.30;
      const mLine = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.34, 0.24), new THREE.MeshStandardMaterial({ color: 0xa855f7 }));
      microGroup.add(z1, z2, mLine);
      for (let y = -0.12; y <= 0.12; y += 0.08) {
        const myosin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 12), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        myosin.rotation.z = Math.PI / 2; myosin.position.y = y;
        const actinL = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 10), new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
        actinL.rotation.z = Math.PI / 2; actinL.position.set(-0.18, y + 0.035, 0);
        const actinR = actinL.clone(); actinR.position.x = 0.18;
        microGroup.add(myosin, actinL, actinR);
      }
    } else if (type === 'synapse') {
      const pre = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 28), new THREE.MeshPhysicalMaterial({ color: 0xfbbf24, roughness: 0.35, clearcoat: 0.45, transparent: true, opacity: 0.72 }));
      pre.position.y = 0.15;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.16, 24), new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.4 }));
      post.position.y = -0.15;
      microGroup.add(pre, post);
      for (let i = 0; i < 6; i++) {
        const ves = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
        ves.position.set(Math.cos(i) * 0.06, 0.12 + (i % 2) * 0.04, Math.sin(i) * 0.06);
        microGroup.add(ves);
      }
      for (let i = 0; i < 14; i++) {
        const nt = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 10), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
        nt.position.set(Math.cos(i * 1.7) * 0.08, (i % 3 - 1) * 0.025, Math.sin(i * 1.7) * 0.08);
        microGroup.add(nt);
      }
    } else if (type === 'valve') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.028, 18, 42), new THREE.MeshStandardMaterial({ color: 0xfca5a5 }));
      ring.rotation.x = Math.PI / 2;
      const cuspMat = new THREE.MeshPhysicalMaterial({ color: 0xfef2f2, roughness: 0.28, side: THREE.DoubleSide, transparent: true, opacity: 0.88 });
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.17, 16, 1, true), cuspMat);
        const a = (i / 3) * Math.PI * 2;
        c.position.set(Math.cos(a) * 0.085, -0.05, Math.sin(a) * 0.085);
        const chord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0xfde68a }));
        chord.position.set(Math.cos(a) * 0.10, -0.18, Math.sin(a) * 0.10);
        microGroup.add(c, chord);
      }
      microGroup.add(ring);
    }
  }

  return { microGroup, showMicroModel, clearMicro, getActiveType: () => activeType };
}

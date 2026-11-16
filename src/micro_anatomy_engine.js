import * as THREE from 'three';

export function createMicroAnatomyEngine(scene) {
  const microGroup = new THREE.Group();
  microGroup.visible = false;
  scene.add(microGroup);
  let activeType = null;

  function clearMicro() {
    while (microGroup.children.length > 0) {
      const c = microGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    microGroup.visible = false;
    activeType = null;
  }

  function showMicroModel(type) {
    clearMicro();
    activeType = type;
    microGroup.visible = true;
    microGroup.position.set(0, 1.05, 0);

    if (type === 'alveolus') {
      const sacMat = new THREE.MeshPhysicalMaterial({ color: 0xfda4af, roughness: 0.35, clearcoat: 0.5, transparent: true, opacity: 0.82 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.105, 22, 22), sacMat);
        s.position.set(Math.cos(a) * 0.15, Math.sin(a * 2) * 0.08, Math.sin(a) * 0.15);
        microGroup.add(s);
      }
      microGroup.add(new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.055, 0.24, 16),
        new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.45 })
      ));
      const capCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.34, -0.1, 0.16), new THREE.Vector3(0, 0.18, 0.20), new THREE.Vector3(0.34, -0.08, -0.14)
      ]);
      microGroup.add(new THREE.Mesh(
        new THREE.TubeGeometry(capCurve, 36, 0.02, 10, false),
        new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.25, clearcoat: 0.7 })
      ));
    } else if (type === 'nephron') {
      const bowman = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 24, 24, 0, Math.PI * 1.5),
        new THREE.MeshPhysicalMaterial({ color: 0xfde68a, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
      );
      const glom = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.06, 0.018, 56, 10),
        new THREE.MeshPhysicalMaterial({ color: 0xdc2626, clearcoat: 0.65 })
      );
      const tubule = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.14, 0, 0), new THREE.Vector3(0.28, 0.12, 0.06),
          new THREE.Vector3(0.24, -0.28, 0), new THREE.Vector3(0.35, -0.28, 0),
          new THREE.Vector3(0.40, 0.10, -0.05), new THREE.Vector3(0.48, -0.30, -0.05)
        ]), 48, 0.022, 10, false),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 })
      );
      microGroup.add(bowman, glom, tubule);
    } else if (type === 'lobule') {
      const hex = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.28, 6),
        new THREE.MeshPhysicalMaterial({ color: 0x991b1b, roughness: 0.35, clearcoat: 0.4, transparent: true, opacity: 0.78 })
      );
      const cv = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.36, 16),
        new THREE.MeshStandardMaterial({ color: 0x2563eb })
      );
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

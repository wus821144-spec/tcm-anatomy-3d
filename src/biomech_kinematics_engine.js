import * as THREE from 'three';

const MUSCLE_VECTORS = {
  'sternocleidomastoid': { origin: [0.02, 1.38, 0.06], insertion: [0.06, 1.56, -0.02], sinew: '足少阳经筋 / 手阳明经筋' },
  'trapezius': { origin: [0.0, 1.48, -0.08], insertion: [0.18, 1.36, -0.03], sinew: '足太阳经筋' },
  'deltoid': { origin: [0.18, 1.37, 0.0], insertion: [0.23, 1.21, 0.01], sinew: '手阳明经筋' },
  'biceps': { origin: [0.21, 1.35, 0.02], insertion: [0.25, 1.07, 0.03], sinew: '手太阴经筋' },
  'pectoralis': { origin: [0.02, 1.28, 0.09], insertion: [0.20, 1.31, 0.03], sinew: '手少阴 / 足阳明经筋' },
  'rectus abdominis': { origin: [0.04, 0.90, 0.08], insertion: [0.05, 1.18, 0.09], sinew: '足阳明经筋' },
  'quadriceps': { origin: [0.10, 0.88, 0.06], insertion: [0.10, 0.50, 0.06], sinew: '足阳明经筋' },
  'gastrocnemius': { origin: [0.10, 0.48, -0.04], insertion: [0.10, 0.08, -0.06], sinew: '足太阳经筋' }
};

const JOINT_PIVOTS = {
  shoulder: { pos: [0.20, 1.36, 0.0], axis: 'z', maxY: 1.38, minX: 0.17, len: 0.28, label: '肩关节外展（真实3D上肢骨骼联动，主动肌：三角肌）' },
  elbow: { pos: [0.24, 1.10, 0.0], axis: 'x', maxY: 1.12, minX: 0.20, len: 0.24, label: '肘关节屈伸（真实3D前臂联动，主动肌：肱二头肌）' },
  wrist: { pos: [0.28, 0.88, 0.0], axis: 'x', maxY: 0.90, minX: 0.23, len: 0.12, label: '腕关节掌屈背伸（真实3D手掌联动）' },
  hip: { pos: [0.10, 0.88, 0.0], axis: 'x', maxY: 0.90, minX: 0.03, len: 0.38, label: '髋关节前屈（真实3D下肢联动，主动肌：髂腰肌）' },
  knee: { pos: [0.10, 0.49, 0.01], axis: 'x', maxY: 0.51, minX: 0.03, len: 0.36, label: '膝关节屈伸（真实3D小腿联动，主动肌：股四头肌）' },
  ankle: { pos: [0.10, 0.09, 0.0], axis: 'x', maxY: 0.10, minX: 0.03, len: 0.14, label: '踝关节背伸跖屈（真实3D足部联动，主动肌：胫骨前肌）' }
};

export function createBiomechEngine(scene) {
  const vecGroup = new THREE.Group();
  const jointGroup = new THREE.Group();
  scene.add(vecGroup, jointGroup);
  let activeJointPivot = null;
  let activeAxis = 'x';
  let attachedRecords = [];

  function restoreAttachedMeshes() {
    attachedRecords.forEach(({ mesh, parent, pos, quat }) => {
      if (parent && mesh) {
        parent.add(mesh);
        mesh.position.copy(pos);
        mesh.quaternion.copy(quat);
      }
    });
    attachedRecords = [];
  }

  function clearVectors() {
    restoreAttachedMeshes();
    [vecGroup, jointGroup].forEach((g) => {
      while (g.children.length > 0) {
        const c = g.children.pop();
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      }
    });
    activeJointPivot = null;
  }

  function matchAndShowMuscleVector(meshNameOrTitle) {
    clearVectors();
    const low = (meshNameOrTitle || '').toLowerCase();
    const entry = Object.entries(MUSCLE_VECTORS).find(([k]) => low.includes(k));
    if (!entry) return null;
    const [, info] = entry;
    const oVec = new THREE.Vector3(...info.origin);
    const iVec = new THREE.Vector3(...info.insertion);
    const sGeo = new THREE.SphereGeometry(0.012, 12, 12);
    const oMesh = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    oMesh.position.copy(oVec);
    const iMesh = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
    iMesh.position.copy(iVec);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([oVec, iVec]);
    vecGroup.add(oMesh, iMesh, new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x38bdf8 })));
    return info;
  }

  function showJointKinematics(jointKey, anatomyGroup) {
    clearVectors();
    const j = JOINT_PIVOTS[jointKey];
    if (!j) return null;
    const pivot = new THREE.Group();
    pivot.position.set(...j.pos);
    pivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfbbf24 })));

    if (anatomyGroup) {
      const box = new THREE.Box3();
      const center = new THREE.Vector3();
      const toAttach = [];
      anatomyGroup.traverse((c) => {
        if (!c.isMesh || !c.visible) return;
        box.setFromObject(c);
        box.getCenter(center);
        if (center.y < j.maxY && center.x >= j.minX && center.x < 0.45) toAttach.push(c);
      });
      toAttach.forEach((m) => {
        attachedRecords.push({ mesh: m, parent: m.parent, pos: m.position.clone(), quat: m.quaternion.clone() });
        pivot.attach(m);
      });
    }

    if (attachedRecords.length === 0) {
      const limb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.010, j.len, 12),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
      );
      limb.position.y = -j.len / 2;
      pivot.add(limb);
    }

    jointGroup.add(pivot);
    activeJointPivot = pivot;
    activeAxis = j.axis || 'x';
    return j.label;
  }

  function animateJoints(t) {
    if (activeJointPivot) {
      const ang = Math.sin(t * 2.0) * 0.48 - 0.25;
      if (activeAxis === 'z') activeJointPivot.rotation.z = Math.abs(ang) * 0.85;
      else activeJointPivot.rotation.x = ang;
    }
  }

  return { clearVectors, matchAndShowMuscleVector, showJointKinematics, animateJoints };
}

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
  shoulder: { pos: [0.20, 1.36, 0.0], axis: [1, 0, 0], len: 0.28, label: '肩关节外展/前屈（主动肌：三角肌/胸大肌）' },
  elbow: { pos: [0.24, 1.10, 0.0], axis: [1, 0, 0], len: 0.24, label: '肘关节屈伸（主动肌：肱二头肌/肱三头肌）' },
  wrist: { pos: [0.28, 0.88, 0.0], axis: [1, 0, 0], len: 0.12, label: '腕关节掌屈背伸（主动肌：尺侧腕屈肌/伸肌）' },
  hip: { pos: [0.10, 0.88, 0.0], axis: [1, 0, 0], len: 0.38, label: '髋关节屈伸（主动肌：髂腰肌/臀大肌）' },
  knee: { pos: [0.10, 0.49, 0.01], axis: [1, 0, 0], len: 0.36, label: '膝关节屈伸（主动肌：股四头肌/腘绳肌）' },
  ankle: { pos: [0.10, 0.09, 0.0], axis: [1, 0, 0], len: 0.14, label: '踝关节背伸跖屈（主动肌：胫骨前肌/小腿三头肌）' }
};

export function createBiomechEngine(scene) {
  const vecGroup = new THREE.Group();
  const jointGroup = new THREE.Group();
  scene.add(vecGroup, jointGroup);
  let activeJointArm = null;

  function clearVectors() {
    [vecGroup, jointGroup].forEach((g) => {
      while (g.children.length > 0) {
        const c = g.children.pop();
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      }
    });
    activeJointArm = null;
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

  function showJointKinematics(jointKey) {
    clearVectors();
    const j = JOINT_PIVOTS[jointKey];
    if (!j) return null;
    const pivot = new THREE.Group();
    pivot.position.set(...j.pos);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    const limb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.010, j.len, 12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    limb.position.y = -j.len / 2;
    pivot.add(sphere, limb);
    jointGroup.add(pivot);
    activeJointArm = pivot;
    return j.label;
  }

  function animateJoints(t) {
    if (activeJointArm) {
      activeJointArm.rotation.x = Math.sin(t * 2.2) * 0.65 - 0.35;
    }
  }

  return { clearVectors, matchAndShowMuscleVector, showJointKinematics, animateJoints };
}

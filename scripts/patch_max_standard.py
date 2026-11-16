import os, json, re

bio_code = '''import * as THREE from 'three';

const MUSCLE_VECTORS = {
  'sternocleidomastoid': { origin: [0.02, 1.38, 0.06], insertion: [0.06, 1.56, -0.02], sinew: '足少阳经筋 / 手阳明经筋' },
  'trapezius': { origin: [0.0, 1.48, -0.08], insertion: [0.18, 1.36, -0.03], sinew: '足太阳经筋' },
  'deltoid': { origin: [0.18, 1.37, 0.0], insertion: [0.23, 1.21, 0.01], sinew: '手阳明经筋' },
  'biceps': { origin: [0.21, 1.35, 0.02], insertion: [0.25, 1.07, 0.03], sinew: '手太阴经筋' },
  'triceps': { origin: [0.20, 1.34, -0.02], insertion: [0.24, 1.09, -0.03], sinew: '手太阳经筋' },
  'pectoralis': { origin: [0.02, 1.28, 0.09], insertion: [0.20, 1.31, 0.03], sinew: '手少阴 / 足阳明经筋' },
  'latissimus': { origin: [0.02, 1.05, -0.09], insertion: [0.20, 1.31, 0.0], sinew: '手太阳经筋' },
  'rectus abdominis': { origin: [0.04, 0.90, 0.08], insertion: [0.05, 1.18, 0.09], sinew: '足阳明经筋' },
  'quadriceps': { origin: [0.10, 0.88, 0.06], insertion: [0.10, 0.50, 0.06], sinew: '足阳明经筋' },
  'hamstring': { origin: [0.08, 0.85, -0.05], insertion: [0.10, 0.48, -0.04], sinew: '足太阳经筋' },
  'gluteus': { origin: [0.06, 0.94, -0.08], insertion: [0.15, 0.84, -0.02], sinew: '足太阳 / 足少阳经筋' },
  'gastrocnemius': { origin: [0.10, 0.48, -0.04], insertion: [0.10, 0.08, -0.06], sinew: '足太阳经筋' },
  'tibialis anterior': { origin: [0.10, 0.45, 0.05], insertion: [0.08, 0.06, 0.06], sinew: '足阳明经筋' }
};

const JOINT_PIVOTS = {
  shoulder: { pos: [0.20, 1.36, 0.0], axis: 'z', maxY: 1.38, minX: 0.17, limbType: 'arm', len: 0.28, label: '肩关节外展（真实双侧3D骨骼联动，主动肌：三角肌）' },
  elbow: { pos: [0.24, 1.10, 0.0], axis: 'x', maxY: 1.12, minX: 0.21, limbType: 'arm', len: 0.24, label: '肘关节屈伸（真实双侧前臂联动，主动肌：肱二头肌）' },
  wrist: { pos: [0.28, 0.88, 0.0], axis: 'x', maxY: 0.90, minX: 0.24, limbType: 'arm', len: 0.12, label: '腕关节掌屈背伸（真实双侧手掌联动）' },
  hip: { pos: [0.10, 0.88, 0.0], axis: 'x', maxY: 0.90, minX: 0.03, limbType: 'leg', len: 0.38, label: '髋关节前屈（真实双侧下肢联动，主动肌：髂腰肌）' },
  knee: { pos: [0.10, 0.49, 0.01], axis: 'x', maxY: 0.51, minX: 0.03, limbType: 'leg', len: 0.36, label: '膝关节屈伸（真实双侧小腿联动，主动肌：股四头肌）' },
  ankle: { pos: [0.10, 0.09, 0.0], axis: 'x', maxY: 0.10, minX: 0.03, limbType: 'leg', len: 0.14, label: '踝关节背伸跖屈（真实双侧足部联动，主动肌：胫骨前肌）' }
};

const TRUNK_EXCLUDE_RE = /rib|sternum|clavicle|scapula|pectoral|vertebra|sacrum|ilium|ischium|pubis|pelvi|thorax|abdom|heart|lung|liver|stomach|kidney|spleen|intestin/i;
const ARM_INCLUDE_RE = /humerus|radius|ulna|carpal|metacarpal|phalan|biceps|triceps|brachi|pronator|supinator|flexor_carpi|extensor_carpi|deltoid|hand|wrist|forearm/i;
const LEG_INCLUDE_RE = /femur|tibia|fibula|patella|tarsal|metatarsal|calcaneus|talus|quadriceps|rectus_femoris|vastus|biceps_femoris|semitend|semimemb|gastrocnem|soleus|tibialis|fibularis|perone|sartorius|gracilis|foot|ankle|phalan/i;

export function createBiomechEngine(scene) {
  const vecGroup = new THREE.Group();
  const jointGroup = new THREE.Group();
  scene.add(vecGroup, jointGroup);
  let activeJointPivot = null;
  let activeAxis = 'x';
  let activeSideSign = 1;
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

  function showJointKinematics(jointKey, anatomyGroup, side = 'L') {
    clearVectors();
    const j = JOINT_PIVOTS[jointKey];
    if (!j) return null;
    const sign = side === 'R' ? -1 : 1;
    activeSideSign = sign;
    const pivot = new THREE.Group();
    pivot.position.set(j.pos[0] * sign, j.pos[1], j.pos[2]);
    pivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfbbf24 })));

    if (anatomyGroup) {
      anatomyGroup.updateMatrixWorld(true);
      const box = new THREE.Box3();
      const center = new THREE.Vector3();
      const toAttach = [];
      const incRe = j.limbType === 'arm' ? ARM_INCLUDE_RE : LEG_INCLUDE_RE;
      anatomyGroup.traverse((c) => {
        if (!c.isMesh || !c.visible) return;
        const nm = c.name || '';
        if (TRUNK_EXCLUDE_RE.test(nm)) return;
        box.setFromObject(c);
        box.getCenter(center);
        const sideOk = sign > 0 ? (center.x >= j.minX && center.x < 0.45) : (center.x <= -j.minX && center.x > -0.45);
        if (center.y < j.maxY && sideOk && (incRe.test(nm) || (j.limbType === 'arm' && Math.abs(center.x) >= 0.22) || (j.limbType === 'leg' && center.y < 0.85))) {
          toAttach.push(c);
        }
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
    return `${j.label} [${side === 'R' ? '右侧' : '左侧'}]`;
  }

  function animateJoints(t) {
    if (activeJointPivot) {
      const ang = Math.sin(t * 2.0) * 0.48 - 0.25;
      if (activeAxis === 'z') activeJointPivot.rotation.z = Math.abs(ang) * 0.85 * activeSideSign;
      else activeJointPivot.rotation.x = ang;
    }
  }

  return { clearVectors, matchAndShowMuscleVector, showJointKinematics, animateJoints };
}
'''
open('src/biomech_kinematics_engine.js', 'w', encoding='utf-8').write(bio_code)

mic_path = 'src/micro_anatomy_engine.js'
if os.path.exists(mic_path):
  mc = open(mic_path, encoding='utf-8').read()
  if 'micro_alveolus.glb' not in mc:
    mc = mc.replace(
      "prostate_interior: { url: './models/hra_prostate.glb', label: 'NIH HRA 前列腺' }",
      "prostate_interior: { url: './models/hra_prostate.glb', label: 'NIH HRA 前列腺' },\n  alveolus: { url: './models/micro_alveolus.glb', label: 'Blender 高精肺泡微血管网' },\n  nephron: { url: './models/micro_nephron.glb', label: 'Blender 高精肾单位' },\n  lobule: { url: './models/micro_lobule.glb', label: 'Blender 高精肝小叶' },\n  sarcomere: { url: './models/micro_sarcomere.glb', label: 'Blender 高精肌节肌丝' },\n  synapse: { url: './models/micro_synapse.glb', label: 'Blender 高精神经突触' },\n  valve: { url: './models/micro_valve.glb', label: 'Blender 高精心脏瓣膜' }"
    )
    open(mic_path, 'w', encoding='utf-8').write(mc)

e3d_path = 'src/engine_3d.js'
if os.path.exists(e3d_path):
  src = open(e3d_path, encoding='utf-8').read()
  src = src.replace("powerPreference: 'high-performance' }", "powerPreference: 'high-performance', stencil: true }")
  if 'female_ovary_l' not in src and 'female_pelvis_uterus' in src:
    src = src.replace(
      "state.loadedRegions['female_pelvis_uterus'].add(r);",
      "const ovGeo = new THREE.SphereGeometry(0.016, 16, 16); const ovMat = new THREE.MeshPhysicalMaterial({ color: 0xf472b6, roughness: 0.35, clearcoat: 0.5 }); const ovL = new THREE.Mesh(ovGeo, ovMat); ovL.position.set(0.045, 0.875, 0.015); ovL.name = 'Visceral__Female__Left_Ovary'; const ovR = ovL.clone(); ovR.position.x = -0.045; ovR.name = 'Visceral__Female__Right_Ovary'; state.loadedRegions['female_pelvis_uterus'].add(r, ovL, ovR);"
    )
  open(e3d_path, 'w', encoding='utf-8').write(src)

idx_path = 'www/index.html'
if os.path.exists(idx_path):
  h = open(idx_path, encoding='utf-8').read()
  if 'id="pick-reticle"' not in h and 'id="toast"' in h:
    h = h.replace(
      '<div id="toast"',
      '<div id="pick-reticle" class="glass" style="display:none;position:fixed;z-index:60;pointer-events:none;padding:4px 10px;border-radius:999px;font-size:12px;color:#38bdf8;border:1px solid rgba(56,189,248,0.6);transform:translate(-50%,-100%);white-space:nowrap;">⊕ 精细拾取</div>\n    <div id="toast"'
    )
  if 'id="btn-joint-side"' not in h and 'class="joint-btn"' in h:
    h = h.replace(
      '<button class="joint-btn"',
      '<button id="btn-joint-side" class="btn glass on" style="font-size:11px;">当前：左侧(L)</button><button class="joint-btn"',
      1
    )
  open(idx_path, 'w', encoding='utf-8').write(h)

app_path = 'src/app.js'
if os.path.exists(app_path):
  a = open(app_path, encoding='utf-8').read()
  if 'pick-reticle' not in a:
    a += '''
;(() => {
  let jointSide = 'L';
  const sideBtn = document.getElementById('btn-joint-side');
  if (sideBtn) sideBtn.addEventListener('click', () => {
    jointSide = jointSide === 'L' ? 'R' : 'L';
    sideBtn.innerText = jointSide === 'L' ? '当前：左侧(L)' : '当前：右侧(R)';
  });
  document.querySelectorAll('.joint-btn').forEach((b) => {
    b.addEventListener('click', () => {
      if (jointSide === 'R' && typeof biomechEngine !== 'undefined') {
        const lbl = biomechEngine.showJointKinematics(b.dataset.joint, anatomyGroup, 'R');
        if (lbl) toastEl.innerText = lbl;
      }
    });
  });

  const ret = document.getElementById('pick-reticle');
  let holdTimer = null, retActive = false;
  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', () => {
    clearTimeout(holdTimer);
    retActive = false;
    holdTimer = setTimeout(() => { retActive = true; }, 280);
  });
  dom.addEventListener('pointermove', (e) => {
    if (!retActive || !ret) return;
    const rect = dom.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const py = -((e.clientY - rect.top - 48) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(px, py), camera);
    const hits = raycaster.intersectObjects(anatomyGroup.children, true).filter((h) => h.object.visible);
    ret.style.display = 'block';
    ret.style.left = e.clientX + 'px';
    ret.style.top = (e.clientY - 48) + 'px';
    if (hits.length > 0) {
      const raw = (hits[0].object.name || '').split('__').slice(2).join(' ').replace(/\\.[0-9]+$/, '');
      const zh = translateAnatName(raw);
      ret.innerText = '⊕ ' + (zh && zh !== '标准解剖结构' ? zh : raw);
    } else {
      ret.innerText = '⊕ 移动准星对准微细结构';
    }
  });
  const endRet = () => {
    clearTimeout(holdTimer);
    retActive = false;
    if (ret) ret.style.display = 'none';
  };
  dom.addEventListener('pointerup', endRet);
  dom.addEventListener('pointercancel', endRet);
})();
'''
  open(app_path, 'w', encoding='utf-8').write(a)

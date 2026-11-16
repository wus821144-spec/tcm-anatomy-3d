const PAIRED_MERIDIANS = {
  '手太阴肺经': '手阳明大肠经（表里经）', '手阳明大肠经': '手太阴肺经（表里经）',
  '足阳明胃经': '足太阴脾经（表里经）', '足太阴脾经': '足阳明胃经（表里经）',
  '手少阴心经': '手太阳小肠经（表里经）', '手太阳小肠经': '手少阴心经（表里经）',
  '足太阳膀胱经': '足少阴肾经（表里经）', '足少阴肾经': '足太阳膀胱经（表里经）',
  '手厥阴心包经': '手少阳三焦经（表里经）', '手少阳三焦经': '手厥阴心包经（表里经）',
  '足少阳胆经': '足厥阴肝经（表里经）', '足厥阴肝经': '足少阳胆经（表里经）'
};

export function getPairedMeridianInfo(meridianName) {
  if (!meridianName) return '';
  return PAIRED_MERIDIANS[meridianName] || '';
}

import * as THREE from 'three';

const HIGH_RISK_ACUPOINTS = {
  'GV16': { depth: '0.5-0.8寸（向口鼻方向）', risk: '深层为延髓与枕骨大孔，严禁向上深刺', level: 'danger' },
  'GV15': { depth: '0.5-0.8寸（向口鼻方向）', risk: '深层为延髓，严禁向上深刺', level: 'danger' },
  'BL13': { depth: '斜刺 0.5-0.8寸', risk: '深层为胸膜腔与肺尖，严禁直刺过深防气胸', level: 'warn' },
  'BL15': { depth: '斜刺 0.5-0.8寸', risk: '深层为胸膜腔与心包，严禁深刺', level: 'warn' },
  'CV17': { depth: '平刺 0.3-0.5寸', risk: '皮下即胸骨，严禁直刺深刺', level: 'warn' },
  'ST12': { depth: '直刺 0.3-0.5寸', risk: '深层有锁骨下动脉、臂丛及肺尖，禁深刺', level: 'danger' },
  'LR14': { depth: '斜刺或平刺 0.5-0.8寸', risk: '右侧深层为肝脏，左侧近肺底，禁直刺', level: 'warn' },
  'BL23': { depth: '直刺 0.5-1.0寸', risk: '深层为肾脏，避免暴力深刺', level: 'warn' }
};

const ZONE_ANCHORS = {
  head: [0, 1.56, 0.04],
  torso: [0, 1.15, 0.05],
  arm_l: [0.30, 1.08, 0.02],
  arm_r: [-0.30, 1.08, 0.02],
  leg_l: [0.11, 0.45, 0.04],
  leg_r: [-0.11, 0.45, 0.04]
};

export function resolveAll361Points(dataset) {
  const basePoints = dataset.points || [];
  const existingNames = new Set(basePoints.map((p) => p.name));
  const resolved = [...basePoints];

  const byMeridian = {};
  basePoints.forEach((p) => {
    if (p.meridian) {
      byMeridian[p.meridian] = byMeridian[p.meridian] || [];
      byMeridian[p.meridian].push(p);
    }
  });

  const catalog = dataset.full_acupoints_catalog || [];
  catalog.forEach((a, idx) => {
    if (existingNames.has(a.name)) return;
    const mPts = byMeridian[a.meridian] || [];
    let pos;
    if (mPts.length >= 2) {
      const t = ((idx % 12) + 0.5) / 12.0;
      const i0 = Math.min(mPts.length - 2, Math.floor(t * (mPts.length - 1)));
      const frac = t * (mPts.length - 1) - i0;
      const p0 = mPts[i0].pos || [mPts[i0].x, mPts[i0].y, mPts[i0].z];
      const p1 = mPts[i0 + 1].pos || [mPts[i0 + 1].x, mPts[i0 + 1].y, mPts[i0 + 1].z];
      const jitter = ((idx % 5) - 2) * 0.006;
      pos = [
        +(p0[0] + (p1[0] - p0[0]) * frac + jitter).toFixed(3),
        +(p0[1] + (p1[1] - p0[1]) * frac).toFixed(3),
        +(p0[2] + (p1[2] - p0[2]) * frac + 0.005).toFixed(3)
      ];
    } else {
      const zKey = a.zone || 'torso';
      const base = ZONE_ANCHORS[zKey] || ZONE_ANCHORS.torso;
      const row = Math.floor(idx / 6) % 8;
      const col = idx % 6;
      pos = [
        +(base[0] + (col - 2.5) * 0.022).toFixed(3),
        +(base[1] + (row - 3.5) * 0.028).toFixed(3),
        +(base[2] + 0.02).toFixed(3)
      ];
    }
    resolved.push({
      id: 'ACU_' + a.code,
      code: a.code,
      name: a.name,
      sub: `${a.meridian} · 国标经穴 ${a.code}`,
      category: '国标 361 穴位',
      layer: 'Points',
      zone: a.zone || 'torso',
      meridian: a.meridian,
      ontology: a.ontology || 'GB/T 12346-2021',
      pos,
      anatomy: `按 ${a.meridian} 循行路径与国标解剖定位映射于体表对应分区，可结合邻近骨性/肌性标志点取穴。`,
      tcm: `属 ${a.meridian}（${a.code}），支持与 3D 经脉循行管道及局部肌肉血管联动观察。`,
      pharmacology: '可联合针灸、艾灸或穴位贴敷发挥局部与远端调节作用。',
      nursing: '进针前请核对深层骨性标志与危险深度提示。',
      isCatalogMapped: true
    });
  });

  return resolved;
}

export function createMeridianOverlay(scene) {
  const meridianGroup = new THREE.Group();
  const safetyGroup = new THREE.Group();
  scene.add(meridianGroup);
  scene.add(safetyGroup);

  function clearGroup(grp) {
    while (grp.children.length > 0) {
      const c = grp.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
  }

  function clearMeridianPath() {
    clearGroup(meridianGroup);
    clearGroup(safetyGroup);
    clearGroup(needleGroup);
  }

  const needleGroup = new THREE.Group();
  scene.add(needleGroup);

  function updateNeedleSimulation(pt, depthCun) {
    clearGroup(needleGroup);
    if (!pt || depthCun <= 0) return null;
    const pos = pt.pos || [pt.x, pt.y, pt.z];
    const pVec = new THREE.Vector3(pos[0], pos[1], pos[2]);
    const inward = new THREE.Vector3(-pos[0] * 0.4, 0, -pos[2]).normalize();
    const depthM = depthCun * 0.025;

    const shaftGeo = new THREE.CylinderGeometry(0.0012, 0.0008, depthM + 0.035, 8);
    const shaft = new THREE.Mesh(shaftGeo, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 }));
    const tipPos = pVec.clone().addScaledVector(inward, depthM);
    const handlePos = pVec.clone().addScaledVector(inward, -0.035);
    shaft.position.copy(tipPos).lerp(handlePos, 0.5);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), inward.clone().negate());

    const tipMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.005, 10, 10),
      new THREE.MeshBasicMaterial({ color: depthCun > 1.0 ? 0xf43f5e : (depthCun > 0.4 ? 0x10b981 : 0xfbbf24) })
    );
    tipMarker.position.copy(tipPos);
    needleGroup.add(shaft, tipMarker);

    let layerMsg = '皮肤与浅筋膜层 (0–0.2寸)：进针破皮';
    if (depthCun > 0.2 && depthCun <= 0.4) layerMsg = '皮下疏松结缔组织与浅血管网 (0.2–0.4寸)';
    else if (depthCun > 0.4 && depthCun <= 1.0) layerMsg = '肌层得气区 (0.4–1.0寸)：酸麻胀重感应区';
    else if (depthCun > 1.0) layerMsg = '深层结构警戒区 (>1.0寸)：注意避让深部神经干与脏器';
    return layerMsg;
  }

  function showMeridianForPoints(pointsList, colorHex = '#fbbf24') {
    clearGroup(meridianGroup);
    if (!pointsList || pointsList.length < 2) return;
    const sorted = [...pointsList].sort((a, b) => {
      const ay = (a.pos ? a.pos[1] : a.y) || 0;
      const by = (b.pos ? b.pos[1] : b.y) || 0;
      return by - ay;
    });
    const vectors = sorted.map((p) => {
      const pos = p.pos || [p.x, p.y, p.z];
      return new THREE.Vector3(pos[0], pos[1], pos[2]);
    });
    const curve = new THREE.CatmullRomCurve3(vectors);
    const tubeGeo = new THREE.TubeGeometry(curve, Math.max(28, vectors.length * 8), 0.0042, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.9
    });
    meridianGroup.add(new THREE.Mesh(tubeGeo, tubeMat));
  }

  function showAcupunctureSafetyCone(pt) {
    clearGroup(safetyGroup);
    if (!pt) return null;
    const code = pt.code || (String(pt.id || '').startsWith('ACU_') ? pt.id.slice(4) : '');
    const info = HIGH_RISK_ACUPOINTS[code] || Object.entries(HIGH_RISK_ACUPOINTS).find(([k]) => (pt.name || '').includes(k))?.[1];
    if (!info) return null;

    const pos = pt.pos || [pt.x, pt.y, pt.z];
    const pVec = new THREE.Vector3(pos[0], pos[1], pos[2]);
    const inward = new THREE.Vector3(-pos[0] * 0.4, 0, -pos[2]).normalize();
    const coneGeo = new THREE.ConeGeometry(0.022, 0.065, 16, 1, true);
    coneGeo.translate(0, -0.0325, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: info.level === 'danger' ? 0xf43f5e : 0xf59e0b,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.copy(pVec);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), inward);
    safetyGroup.add(cone);
    return info;
  }

  function findNearbyAcupoints(worldVec, allPoints, maxResults = 5) {
    if (!worldVec || !allPoints || !allPoints.length) return [];
    return allPoints
      .map((p) => {
        const pos = p.pos || [p.x, p.y, p.z];
        const d = worldVec.distanceTo(new THREE.Vector3(pos[0], pos[1], pos[2]));
        return { point: p, dist: d };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, maxResults)
      .filter((x) => x.dist < 0.28);
  }

  return {
    meridianGroup, safetyGroup, clearMeridianPath,
    showMeridianForPoints, showAcupunctureSafetyCone, updateNeedleSimulation, findNearbyAcupoints
  };
}

import * as THREE from 'three';

const PAIRED_MERIDIANS = {
  '手太阴肺经': '手阳明大肠经（表里经）', '手阳明大肠经': '手太阴肺经（表里经）',
  '足阳明胃经': '足太阴脾经（表里经）', '足太阴脾经': '足阳明胃经（表里经）',
  '手少阴心经': '手太阳小肠经（表里经）', '手太阳小肠经': '手少阴心经（表里经）',
  '足太阳膀胱经': '足少阴肾经（表里经）', '足少阴肾经': '足太阳膀胱经（表里经）',
  '手厥阴心包经': '手少阳三焦经（表里经）', '手少阳三焦经': '手厥阴心包经（表里经）',
  '足少阳胆经': '足厥阴肝经（表里经）', '足厥阴肝经': '足少阳胆经（表里经）'
};

const MER_LAYERS = {
  '任脉': { layers: '皮肤 → 浅筋膜 → 腹白线 / 胸骨体骨膜 → 腹横筋膜（腹部）', vessels: '腹壁上、下动脉分支，胸廓内动脉穿支', nerves: '肋间神经前皮支（T1–T12）及髂腹下神经分支', depth: '胸骨段平刺 0.3–0.5寸（防穿透胸骨孔）；上腹及脐周直刺 0.5–1.0寸；下腹关元/中极直刺前须排空膀胱' },
  '督脉': { layers: '皮肤 → 浅筋膜 → 棘上韧带 → 棘间韧带（深层近黄韧带/椎管）', vessels: '椎动脉分支（枕下三角段）、肋间后动脉及腰动脉背侧支', nerves: '枕大神经（C2）、颈/胸/腰脊神经后支', depth: '风府/哑门向鼻尖或下颌斜刺 0.5–0.8寸（严禁向上深刺延髓）；胸腰段直刺 0.5–1.0寸，禁穿透黄韧带伤及脊髓' },
  '手太阴肺经': { layers: '皮肤 → 浅筋膜 → 胸大肌/肱二头肌/肱桡肌筋膜 → 桡侧腕屈肌腱外侧', vessels: '头静脉、桡动脉及其掌浅支', nerves: '前臂外侧皮神经、桡神经浅支', depth: '尺泽直刺 0.8–1.2寸；太渊避开桡动脉直刺 0.3–0.5寸；中府向外斜刺 0.5–0.8寸防气胸' },
  '手阳明大肠经': { layers: '皮肤 → 浅筋膜 → 第一骨间背侧肌/肱桡肌 → 骨膜', vessels: '手背静脉网、桡动脉分支、头静脉', nerves: '桡神经浅支、正中神经指掌侧固有神经、面神经颊支', depth: '合谷直刺 0.5–1.0寸；曲池直刺 1.0–1.5寸；迎香向内上方斜刺 0.3–0.5寸' },
  '足阳明胃经': { layers: '皮肤 → 浅筋膜 → 腹直肌/股直肌/胫骨前肌 → 骨间膜', vessels: '腹壁上/下动脉、旋股外侧动脉、胫前动静脉', nerves: '肋间神经、股神经、腓深神经', depth: '足三里直刺 1.0–2.0寸；缺盆直刺 0.3–0.5寸避锁骨下动脉及肺尖；承泣沿眶下缘慢刺' },
  '足太阴脾经': { layers: '皮肤 → 浅筋膜 → 胫骨内侧缘后方/缝匠肌/股内侧肌', vessels: '大隐静脉、胫后动静脉、股动脉分支', nerves: '隐神经、胫神经肌支', depth: '三阴交直刺 1.0–1.5寸（孕妇禁针）；血海直刺 1.0–1.5寸；公孙直刺 0.6–1.2寸' },
  '手少阴心经': { layers: '皮肤 → 浅筋膜 → 尺侧腕屈肌腱桡侧缘', vessels: '贵要静脉、尺动脉（神门紧邻）', nerves: '前臂内侧皮神经、尺神经干', depth: '神门直刺 0.3–0.5寸避开尺动脉；极泉避开腋动脉直刺 0.3–0.5寸' },
  '手太阳小肠经': { layers: '皮肤 → 浅筋膜 → 小指展肌/尺侧腕伸肌/冈下肌', vessels: '尺动脉腕背支、旋肩胛动脉、颞浅动脉', nerves: '尺神经手背支、肩胛上神经、耳颞神经', depth: '后溪直刺 0.5–1.0寸；听宫张口直刺 0.5–1.0寸；天宗直刺或斜刺 0.5–1.0寸' },
  '足太阳膀胱经': { layers: '皮肤 → 浅筋膜 → 斜方肌/竖脊肌/臀大肌/腓肠肌', vessels: '肋间后动静脉、臀上/下动脉、小隐静脉', nerves: '脊神经后支、坐骨神经干（殷门/委中深层）', depth: '背部第一、二侧线斜刺 0.5–0.8寸严防气胸；委中直刺 1.0–1.5寸或点刺出血' },
  '足少阴肾经': { layers: '皮肤 → 浅筋膜 → 跟腱前缘/半腱半膜肌腱/腹直肌', vessels: '胫后动静脉、大隐静脉、腹壁下动脉', nerves: '小腿内侧皮神经、胫神经、肋间神经', depth: '太溪直刺 0.5–0.8寸；涌泉直刺 0.5–0.8寸；俞府向外斜刺 0.5–0.8寸防气胸' },
  '手厥阴心包经': { layers: '皮肤 → 浅筋膜 → 掌长肌腱与桡侧腕屈肌腱之间 → 拇长屈肌', vessels: '正中动静脉、前臂正中静脉', nerves: '正中神经干（内关/大陵正下方）', depth: '内关直刺 0.5–1.0寸，出现触电感即微退针避让正中神经' },
  '手少阳三焦经': { layers: '皮肤 → 浅筋膜 → 指伸肌与小指伸肌之间 → 骨间膜', vessels: '前臂骨间背侧动静脉、耳后动脉', nerves: '前臂后皮神经、骨间后神经、耳大神经', depth: '外关直刺 0.5–1.0寸；翳风直刺 0.8–1.2寸避面神经干' },
  '足少阳胆经': { layers: '皮肤 → 浅筋膜 → 颞肌/胸锁乳突肌/阔筋膜张肌/腓骨长肌', vessels: '颞浅动脉、臀上动脉、胫前动脉分支', nerves: '枕大/小神经、臀上神经、腓总神经（阳陵泉上方）', depth: '风池向鼻尖方向斜刺 0.8–1.2寸严禁向内上深刺延髓；环跳直刺 2.0–3.0寸' },
  '足厥阴肝经': { layers: '皮肤 → 浅筋膜 → 拇长伸肌腱内侧/缝匠肌/腹斜肌', vessels: '足背静脉网、大隐静脉、肋间动脉', nerves: '腓深神经分支、隐神经、肋间神经', depth: '太冲直刺 0.5–0.8寸；期门/章门斜刺或平刺 0.5–0.8寸避肝脾' }
};

export function getPairedMeridianInfo(meridianName) {
  if (!meridianName) return '';
  return PAIRED_MERIDIANS[meridianName] || '';
}

export function getMeridianLayerInfo(meridianName) {
  if (!meridianName) return null;
  if (MER_LAYERS[meridianName]) return MER_LAYERS[meridianName];
  const hit = Object.entries(MER_LAYERS).find(([k]) => meridianName.includes(k) || k.includes(meridianName));
  return hit ? hit[1] : null;
}

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
  head: [0, 1.56, 0.04], torso: [0, 1.15, 0.05],
  arm_l: [0.30, 1.08, 0.02], arm_r: [-0.30, 1.08, 0.02],
  leg_l: [0.11, 0.45, 0.04], leg_r: [-0.11, 0.45, 0.04]
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
  Object.values(byMeridian).forEach((arr) => arr.sort((a, b) => ((b.pos ? b.pos[1] : 0) - (a.pos ? a.pos[1] : 0))));

  const catalog = dataset.full_acupoints_catalog || [];
  const merIndexCount = {};
  const merTotals = {};
  catalog.forEach((a) => { merTotals[a.meridian] = (merTotals[a.meridian] || 0) + 1; });

  catalog.forEach((a, idx) => {
    if (existingNames.has(a.name)) return;
    const mIdx = merIndexCount[a.meridian] || 0;
    merIndexCount[a.meridian] = mIdx + 1;
    const mPts = byMeridian[a.meridian] || [];
    let pos;
    if (mPts.length >= 2) {
      const t = (mIdx + 0.5) / Math.max(1, merTotals[a.meridian]);
      const i0 = Math.min(mPts.length - 2, Math.floor(t * (mPts.length - 1)));
      const frac = t * (mPts.length - 1) - i0;
      const p0 = mPts[i0].pos || [mPts[i0].x, mPts[i0].y, mPts[i0].z];
      const p1 = mPts[i0 + 1].pos || [mPts[i0 + 1].x, mPts[i0 + 1].y, mPts[i0 + 1].z];
      pos = [
        +(p0[0] + (p1[0] - p0[0]) * frac).toFixed(3),
        +(p0[1] + (p1[1] - p0[1]) * frac).toFixed(3),
        +(p0[2] + (p1[2] - p0[2]) * frac + 0.003).toFixed(3)
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
      id: 'ACU_' + a.code, code: a.code, name: a.name,
      sub: `${a.meridian} · 国标经穴 ${a.code}`,
      category: '国标 361 穴位', layer: 'Points', zone: a.zone || 'torso',
      meridian: a.meridian, specialTags: a.specialTags || [],
      ontology: a.ontology || 'GB/T 12346-2021', pos,
      anatomy: `按 ${a.meridian} 骨度分寸与解剖标志映射于体表。`,
      tcm: `属 ${a.meridian}（${a.code}）${(a.specialTags && a.specialTags.length) ? ' · 特定穴：' + a.specialTags.join(' / ') : ''}。`,
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
  const needleGroup = new THREE.Group();
  scene.add(meridianGroup, safetyGroup, needleGroup);
  const needleRay = new THREE.Raycaster();

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

  function updateNeedleSimulation(pt, depthCun, anatomyGroup, translateFn) {
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

    let hitWarning = '';
    const piercedNames = [];
    if (anatomyGroup) {
      needleRay.set(pVec.clone().addScaledVector(inward, -0.02), inward);
      needleRay.near = 0.005;
      needleRay.far = depthM + 0.025;
      const hits = needleRay.intersectObjects(anatomyGroup.children, true).filter((h) => h.object.visible);
      const seen = new Set();
      for (const h of hits) {
        const raw = (h.object.name || '').split('__').slice(2).join(' ').replace(/\.[0-9]+$/, '');
        const zh = translateFn ? translateFn(raw) : raw;
        const label = zh && zh !== '标准解剖结构' ? zh : raw;
        if (label && !seen.has(label)) {
          seen.add(label);
          piercedNames.push(label);
        }
        const low = (h.object.name || '').toLowerCase();
        if (/lung|pleura|heart|aorta|carotid|medulla|spinal|nerv|arter/.test(low)) {
          hitWarning = `⚠ 警告：针尖已接近或触及危险结构 (${label})！`;
        }
      }
    }

    const tipMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.005, 10, 10),
      new THREE.MeshBasicMaterial({ color: (hitWarning || depthCun > 1.0) ? 0xf43f5e : (depthCun > 0.4 ? 0x10b981 : 0xfbbf24) })
    );
    tipMarker.position.copy(tipPos);
    needleGroup.add(shaft, tipMarker);

    let baseMsg = '皮肤与浅筋膜层 (0–0.2寸)';
    if (depthCun > 0.2 && depthCun <= 0.4) baseMsg = '皮下疏松结缔组织与浅血管网 (0.2–0.4寸)';
    else if (depthCun > 0.4 && depthCun <= 1.0) baseMsg = '肌层得气区 (0.4–1.0寸)：酸麻胀重感应区';
    else if (depthCun > 1.0) baseMsg = '深层结构警戒区 (>1.0寸)';

    if (piercedNames.length) baseMsg += ` | 真实穿刺：${piercedNames.slice(0, 4).join(' → ')}`;
    if (hitWarning) baseMsg += ` | ${hitWarning}`;
    return baseMsg;
  }

  function showMeridianForPoints(pointsList, colorHex = '#fbbf24') {
    clearGroup(meridianGroup);
    if (!pointsList || pointsList.length < 2) return;
    const sorted = [...pointsList].sort((a, b) => ((b.pos ? b.pos[1] : b.y) || 0) - ((a.pos ? a.pos[1] : a.y) || 0));
    const vectors = sorted.map((p) => { const pos = p.pos || [p.x, p.y, p.z]; return new THREE.Vector3(pos[0], pos[1], pos[2]); });
    const curve = new THREE.CatmullRomCurve3(vectors);
    const tubeGeo = new THREE.TubeGeometry(curve, Math.max(28, vectors.length * 8), 0.0042, 8, false);
    meridianGroup.add(new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex), transparent: true, opacity: 0.9 })));
  }

  function showExtraMeridian(coordsList, colorHex = '#c084fc') {
    clearGroup(meridianGroup);
    if (!coordsList || coordsList.length < 2) return;
    const vectors = coordsList.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const curve = new THREE.CatmullRomCurve3(vectors);
    const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.0052, 8, false);
    meridianGroup.add(new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex), transparent: true, opacity: 0.92 })));
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
    const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: info.level === 'danger' ? 0xf43f5e : 0xf59e0b, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    cone.position.copy(pVec);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), inward);
    safetyGroup.add(cone);
    return info;
  }

  function findNearbyAcupoints(worldVec, allPoints, maxResults = 5) {
    if (!worldVec || !allPoints || !allPoints.length) return [];
    return allPoints
      .map((p) => { const pos = p.pos || [p.x, p.y, p.z]; return { point: p, dist: worldVec.distanceTo(new THREE.Vector3(pos[0], pos[1], pos[2])) }; })
      .sort((a, b) => a.dist - b.dist).slice(0, maxResults).filter((x) => x.dist < 0.28);
  }

  return {
    meridianGroup, safetyGroup, clearMeridianPath,
    showMeridianForPoints, showExtraMeridian, showAcupunctureSafetyCone, updateNeedleSimulation, findNearbyAcupoints
  };
}

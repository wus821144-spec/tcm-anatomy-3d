import os, json

# 1. Fix disposeRegion + add GLSL BackSide Cutaway Marrow/Muscle Shading in src/engine_3d.js
e3d_path = 'src/engine_3d.js'
if os.path.exists(e3d_path):
  src = open(e3d_path, encoding='utf-8').read()
  if 'gl_FrontFacing' not in src:
    src = src.replace(
      "state.lungMeshes = state.lungMeshes.filter((m) => m !== obj);",
      "state.lungMeshes = state.lungMeshes.filter((m) => m !== obj);\n        state.arteryMeshes = state.arteryMeshes.filter((m) => m !== obj);\n        state.nerveMeshes = state.nerveMeshes.filter((m) => m !== obj);"
    )
    cutaway_hook = """
  function applyCutawayBackfaceShader(mat, isBone) {
    if (!mat) return;
    mat.onBeforeCompile = (shader) => {
      const tint = isBone ? 'vec3(0.42, 0.20, 0.14)' : 'vec3(0.28, 0.05, 0.06)';
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `if (!gl_FrontFacing) { gl_FragColor.rgb = mix(gl_FragColor.rgb, ${tint}, 0.78); }\n#include <dithering_fragment>`
      );
    };
  }
"""
    src = src.replace("function upgradeBiologicalMaterial(mesh) {", cutaway_hook + "\n  function upgradeBiologicalMaterial(mesh) {")
    src = src.replace(
      "if (oldMat && oldMat.dispose) oldMat.dispose();",
      "if (sys === 'Skeleton') applyCutawayBackfaceShader(mesh.material, true);\n    else if (sys === 'Muscular' || sys === 'Visceral') applyCutawayBackfaceShader(mesh.material, false);\n    if (oldMat && oldMat.dispose) oldMat.dispose();"
    )
    open(e3d_path, 'w', encoding='utf-8').write(src)

# 2. Fix enterOverview isolatedTargetMesh reset + upgrade drawCtSlice to clinical PACS Hounsfield grayscale in src/app.js
app_path = 'src/app.js'
if os.path.exists(app_path):
  a = open(app_path, encoding='utf-8').read()
  if 'state.isolatedTargetMesh = null;' not in a:
    a = a.replace("state.activeZone = null;", "state.activeZone = null;\n  state.isolatedTargetMesh = null;")
  pacs_ct = """
function drawCtSlice(canvas, depthCun, zone) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, w, h);
  const z = String(zone || (state.activeZone && state.activeZone.id) || 'torso').toLowerCase();
  let title = '胸部 PACS CT 轴位 (肺/纵隔窗)';
  if (z.includes('head')) {
    title = '颅脑 PACS CT 轴位 (脑实质窗)';
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx, cy, 56, 66, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, 52, 62, 0, 0, Math.PI * 2); ctx.stroke();
    const gr = ctx.createRadialGradient(cx, cy, 6, cx, cy, 58);
    gr.addColorStop(0, '#475569'); gr.addColorStop(0.7, '#334155'); gr.addColorStop(1, '#1e293b');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx, cy, 50, 60, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, cy - 58); ctx.lineTo(cx, cy + 58); ctx.stroke();
    ctx.fillStyle = '#090d16'; ctx.beginPath(); ctx.ellipse(cx - 10, cy - 4, 6, 17, -0.25, 0, Math.PI * 2); ctx.ellipse(cx + 10, cy - 4, 6, 17, 0.25, 0, Math.PI * 2); ctx.fill();
  } else if (z.includes('arm') || z.includes('leg')) {
    title = z.includes('arm') ? '上肢 PACS CT 轴位 (骨肌窗)' : '下肢 PACS CT 轴位 (骨肌窗)';
    ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, 58, 50, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.ellipse(cx, cy - 15, 38, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f3f46'; ctx.beginPath(); ctx.ellipse(cx, cy + 17, 36, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(cx - 4, cy + 2, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(cx - 4, cy + 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx + 22, cy - 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(cx + 30, cy + 4, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(cx + 24, cy + 10, 2.8, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 70, 50, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
    ctx.fillStyle = '#020617'; ctx.beginPath(); ctx.ellipse(cx - 26, cy, 24, 30, 0, 0, Math.PI * 2); ctx.ellipse(cx + 26, cy, 24, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 18, cy); ctx.lineTo(cx - 38, cy - 14); ctx.moveTo(cx + 18, cy); ctx.lineTo(cx + 38, cy - 14); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.ellipse(cx + 4, cy - 6, 16, 18, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(cx - 9, cy + 32, 18, 14); ctx.fillRect(cx - 7, cy - 48, 14, 8);
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(cx - 2, cy + 18, 5, 0, Math.PI * 2); ctx.fill();
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
  a = a + "\n" + pacs_ct
  open(app_path, 'w', encoding='utf-8').write(a)

# 3. Add 10 core Bone Landmarks & Muscle Attachment pins to www/data/anatomy_tcm_data.json
data_path = 'www/data/anatomy_tcm_data.json'
if os.path.exists(data_path):
  d = json.load(open(data_path, encoding='utf-8'))
  pts = d.get('points', [])
  names = {p.get('name') for p in pts}
  LANDMARKS = [
    ('LM_ACROMION', '肩峰 (Acromion)', 'arm_l', [0.195, 1.39, -0.01], '肩胛冈外侧端膨大，三角肌起点与肩锁关节标志', '肩髃穴取穴骨性标志', '避免在肩峰下滑囊急性炎症期暴力按压'),
    ('LM_CORACOID', '喙突 (Coracoid Process)', 'torso', [0.145, 1.34, 0.055], '肩胛骨前上方钩状突起，胸小肌止点与喙肱肌起点', '中府/云门穴内下方深层骨性标志', '深层紧邻臂丛神经与腋动脉，禁止深刺'),
    ('LM_DELTOID_TUB', '三角肌粗隆 (Deltoid Tuberosity)', 'arm_l', [0.23, 1.21, 0.01], '肱骨体中部外侧V形粗隆，三角肌止点', '臂臑穴定位骨性标志，上臂三角肌注射定位参考', '避开绕行肱骨外科颈后方的腋神经'),
    ('LM_OLECRANON', '尺骨鹰嘴 (Olecranon)', 'arm_l', [0.24, 1.09, -0.03], '尺骨近端后方突起，肱三头肌止点', '天井穴与奇穴肘尖定位标志', '尺骨鹰嘴滑囊炎高发处'),
    ('LM_ASIS', '髂前上棘 (ASIS)', 'torso', [0.115, 0.91, 0.085], '髂嵴前端骨性突起，缝匠肌与腹股沟韧带起点', '五枢/居髎取穴标志及骨盆测量基准点', '瘦弱患者卧位注意防局部压疮'),
    ('LM_PUBIC_SYMP', '耻骨联合 (Pubic Symphysis)', 'torso', [0.0, 0.83, 0.085], '左右耻骨联合面借纤维软骨连接处', '曲骨穴定位标志，骨度分寸脐下5寸基准', '下腹针刺前务必排空膀胱'),
    ('LM_GT_FEMUR', '股骨大转子 (Greater Trochanter)', 'leg_l', [0.155, 0.86, -0.01], '股骨颈与体交界外侧方形隆起，臀中/小肌止点', '环跳穴取穴核心骨性标志（大转子与骶管裂孔外1/3）', '坐骨神经自其后内侧下行，深刺需防触电损伤'),
    ('LM_TIBIAL_TUB', '胫骨粗隆 (Tibial Tuberosity)', 'leg_l', [0.10, 0.45, 0.062], '胫骨上端前下方隆起，髌韧带(股四头肌)止点', '足三里与阳陵泉取穴骨性标志', '青少年胫骨粗隆骨骺炎常见压痛点'),
    ('LM_STERNAL_ANGLE', '胸骨角 (Sternal Angle / Louis角)', 'torso', [0.0, 1.32, 0.095], '胸骨柄与胸骨体连接微向前凸，平对第2肋软骨及T4椎体', '膻中/紫宫/玉堂计数肋间隙的黄金骨性标志', '胸骨体发育异常者可能存在胸骨孔，平刺为宜'),
    ('LM_C7_SPINE', '第7颈椎棘突 (隆椎)', 'torso', [0.0, 1.41, -0.095], '低头时颈后最显著的单一隆起棘突', '大椎穴定位核心骨性标志', '深层为棘间韧带与脊髓，直刺勿过深')
  ]
  for pid, nm, zn, pos, ana, tcm, nurs in LANDMARKS:
    if nm not in names:
      pts.append({
        'id': pid, 'name': nm, 'sub': '临床骨性标志与肌附着点',
        'category': '骨性标志与沟窝', 'layer': 'Points', 'zone': zn,
        'gender': 'Common', 'ontology': 'TA2 Bone Landmark', 'pos': pos,
        'anatomy': ana, 'tcm': tcm, 'pharmacology': '骨性标志点可用于体表投影定位与局部阻滞/温针灸参考。', 'nursing': nurs
      })
      names.add(nm)
  d['points'] = pts
  open(data_path, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2))

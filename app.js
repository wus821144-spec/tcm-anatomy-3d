import {
  EXT_API, escapeHtml, saveNote, loadNote, getAllNotes,
  saveToolItem, loadAllToolItems, clearAllToolItems,
  translateAnatName, loadCoreDataset, loadMeshIndex, searchAll, loadMedicalKB, getExplanationMode, setExplanationMode, getGitHubKBUrl, syncGitHubCloudKB, mergeCachedCloudKB
} from './data_manager.js';
import {
  installGlobalErrorGuards, bindWebGLContextGuards, applyEcoMode, bindDynamicTouchResolution,
  scheduleStaggeredRegionLoads, bindResponsiveResize, bindAndroidBackHandler
} from './mobile_adapter.js';
import { create3DEngine } from './engine_3d.js';
import { createMeridianOverlay, resolveAll361Points, getPairedMeridianInfo } from './tcm_meridian_engine.js';
import { createBiomechEngine } from './biomech_kinematics_engine.js';
import { createMicroAnatomyEngine } from './micro_anatomy_engine.js';
import { createQuizCoach, extractCoursewareBookmarks, importNotesPackage, speakMedicalText } from './study_sync_engine.js';

window.TCM_EXT_API = EXT_API;

const toastEl = document.getElementById('toast');
const drillEl = document.getElementById('drill-level');
installGlobalErrorGuards(toastEl);

const engine = create3DEngine(document.getElementById('canvas-wrap'), toastEl);
const { THREE, camera, renderer, controls, clipPlaneZ, anatomyGroup, zoneGroup, toolGroup, focusRing, state } = engine;

bindWebGLContextGuards(renderer, toastEl);
bindResponsiveResize(camera, renderer);

let medicalKB = { systems: [], acupoint_details: {}, nursing_details: [] };
let detailMode = getExplanationMode();
let lastOpenedPoint = null;
let dataset = { meridians: [], zones: [], points: [], full_acupoints_catalog: [], muscles: [], nursing_protocols: [], tcm_prescriptions: [], glossary: [] };
let meshIndex = [];
let selectedPointId = null;
let selectedHlColor = 'none';
let activePickedMesh = null;
let quizTarget = null;
let quizScore = 0;
let quizTotal = 0;
let rulerMode = false;
let pinMode = false;
let drawMode = false;
let isDrawing = false;
let rulerPoints = [];
let activeStrokePts = [];
let activeStrokeLine = null;

// Splash & Bottom Nav
document.getElementById('btn-enter-app').addEventListener('click', () => {
  const sp = document.getElementById('splash');
  sp.style.opacity = '0';
  setTimeout(() => (sp.style.display = 'none'), 380);
});

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.view;
    if (engine.setViewActive) engine.setViewActive(target === 'view-3d');
    document.querySelectorAll('.app-view').forEach((v) => v.classList.toggle('active', v.id === target));
    if (target === 'view-study') renderAllNotes();
  });
});

function enterOverview() {
  if (typeof meridianOverlay !== 'undefined') meridianOverlay.clearMeridianPath();
  if (typeof biomechEngine !== 'undefined') biomechEngine.clearVectors();
  if (typeof microEngine !== 'undefined') microEngine.clearMicro();
  state.activeZone = null;
  zoneGroup.visible = true;
  state.pointMeshes.forEach((m) => (m.visible = false));
  ['region_skin', 'region_thorax', 'region_abdomen_pelvis', 'region_head', 'region_arm_l', 'region_arm_r', 'region_leg_l', 'region_leg_r'].forEach((r) => engine.loadRegion(r));
  Object.values(state.loadedRegions).forEach((g) => (g.visible = true));
  engine.smoothFlyTo([0, 0.90, 0], [0, 1.05, 2.35]);
  drillEl.innerText = '一级：全身大区';
  toastEl.innerText = '一级总览：请点击任意颜色大区或关节色块放大';
  document.getElementById('drawer').classList.remove('open');
}

function enterZone(zone) {
  state.activeZone = zone;
  zoneGroup.visible = false;
  const targetRegs = new Set(zone.regionFiles || [zone.regionFile]);
  targetRegs.add('region_skin');
  targetRegs.forEach((r) => engine.loadRegion(r));
  Object.entries(state.loadedRegions).forEach(([k, g]) => {
    g.visible = targetRegs.has(k);
  });
  const ecoEl = document.getElementById('chk-eco');
  engine.evictInactiveRegions(targetRegs, ecoEl ? ecoEl.checked : false);
  engine.refreshVisiblePoints();
  engine.smoothFlyTo(zone.target, zone.camPos);
  drillEl.innerText = `二级：${zone.name}`;
  toastEl.innerText = `已聚焦【${zone.name}】，点击小点查看详情`;
}

bindAndroidBackHandler(
  () => ({ drawerOpen: document.getElementById('drawer').classList.contains('open'), hasActiveZone: !!state.activeZone }),
  () => document.getElementById('drawer').classList.remove('open'),
  enterOverview
);

// Init Data & Staggered 3D Load
Promise.all([loadCoreDataset(), loadMeshIndex(), loadMedicalKB()]).then(([d, mIdx, kb]) => {
  medicalKB = kb || medicalKB;
  mergeCachedCloudKB(medicalKB);
  dataset = d;
  meshIndex = mIdx;
  engine.buildZones(dataset.zones || []);
  dataset.points = resolveAll361Points(dataset);
  engine.buildPoints(dataset.points || []);
  
function syncDetailModeUI() {
  const label = detailMode === 'detailed' ? '详细模式 (点切简易)' : '简易模式 (点切详细)';
  const b1 = document.getElementById('btn-detail-mode');
  const b2 = document.getElementById('btn-kb-detail-mode');
  if (b1) b1.innerText = label;
  if (b2) b2.innerText = detailMode === 'detailed' ? '详细模式' : '简易模式';
}
syncDetailModeUI();

  const inpGhUrl = document.getElementById('inp-gh-kb-url');
  const btnGhSync = document.getElementById('btn-sync-gh-kb');
  const ghStatus = document.getElementById('gh-kb-status');
  if (inpGhUrl) inpGhUrl.value = getGitHubKBUrl();
  async function runGhSync(isAuto) {
    const url = inpGhUrl ? inpGhUrl.value.trim() : getGitHubKBUrl();
    if (!url) return;
    if (ghStatus) ghStatus.innerText = '正在连接 GitHub 云端库...';
    try {
      const res = await syncGitHubCloudKB(url, medicalKB);
      if (res.ok && ghStatus) {
        ghStatus.innerText = `已同步云端库：${res.acuCount} 穴 + ${res.caseCount} 护理病案（已离线缓存）`;
        if (!isAuto) toastEl.innerText = `GitHub 云端库同步成功 (${res.acuCount} 穴)`;
      }
    } catch (err) {
      if (ghStatus) ghStatus.innerText = '离线或地址不可达，已使用本地缓存/内置核心库';
    }
  }
  if (btnGhSync) btnGhSync.addEventListener('click', () => runGhSync(false));
  if (navigator.onLine && getGitHubKBUrl()) runGhSync(true);


  // Offline TTS Voice Pronunciation
  const btnTts = document.getElementById('btn-tts-speak');
  if (btnTts) {
    btnTts.addEventListener('click', () => {
      if (!lastOpenedPoint) return;
      const txt = `${lastOpenedPoint.name}。${lastOpenedPoint.sub || ''}。${lastOpenedPoint.tcm || ''}`;
      if (!speakMedicalText(txt)) toastEl.innerText = '当前设备暂不支持语音朗读';
    });
  }

  // Acupuncture 3D Needle Penetration Slider
  const nSlider = document.getElementById('needle-depth-slider');
  const nVal = document.getElementById('needle-depth-val');
  const nMsg = document.getElementById('needle-layer-msg');
  if (nSlider) {
    nSlider.addEventListener('input', () => {
      const d = parseFloat(nSlider.value) || 0;
      if (nVal) nVal.innerText = d.toFixed(1) + ' 寸';
      const msg = meridianOverlay.updateNeedleSimulation(lastOpenedPoint, d);
      if (nMsg) nMsg.innerText = msg || '拖动滑块观察针尖逐层穿刺解剖位置';
    });
  }

  // Micro-Anatomy & Joint Kinematics Buttons
  document.querySelectorAll('.micro-btn').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelector('.nav-item[data-view="view-3d"]').click();
      Object.values(state.loadedRegions).forEach((g) => (g.visible = false));
      microEngine.showMicroModel(b.dataset.micro);
      engine.smoothFlyTo([0, 1.05, 0], [0, 1.15, 0.95]);
      toastEl.innerText = `已进入显微 3D 实验室：${b.innerText}（点「总览」返回人体）`;
    });
  });
  document.querySelectorAll('.joint-btn').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelector('.nav-item[data-view="view-3d"]').click();
      enterOverview();
      const lbl = biomechEngine.showJointKinematics(b.dataset.joint);
      if (lbl) toastEl.innerText = `关节运动演示：${lbl}`;
    });
  });

  // AR Real-World Camera Overlay Toggle
  let arStream = null;
  const btnAr = document.getElementById('btn-ar-bg');
  const arVideo = document.getElementById('ar-video');
  if (btnAr && arVideo) {
    btnAr.addEventListener('click', async () => {
      if (arStream) {
        arStream.getTracks().forEach((t) => t.stop());
        arStream = null;
        arVideo.style.display = 'none';
        btnAr.classList.remove('on');
        toastEl.innerText = '已关闭 AR 实景背景';
        return;
      }
      try {
        arStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        arVideo.srcObject = arStream;
        arVideo.style.display = 'block';
        btnAr.classList.add('on');
        toastEl.innerText = 'AR 实景透视已开启：可将 3D 经脉叠加到真实肢体对照取穴';
      } catch {
        toastEl.innerText = '未获取摄像头权限，无法开启 AR 实景背景';
      }
    });
  }

const btnDMode = document.getElementById('btn-detail-mode');
if (btnDMode) {
  btnDMode.addEventListener('click', () => {
    detailMode = setExplanationMode(detailMode === 'detailed' ? 'simple' : 'detailed');
    syncDetailModeUI();
    if (lastOpenedPoint) openDrawer(lastOpenedPoint);
  });
}
const btnKbMode = document.getElementById('btn-kb-detail-mode');
if (btnKbMode) {
  btnKbMode.addEventListener('click', () => {
    detailMode = setExplanationMode(detailMode === 'detailed' ? 'simple' : 'detailed');
    syncDetailModeUI();
    const activeChip = document.querySelector('.kb-chip.active');
    renderKnowledgeBase(activeChip ? activeChip.dataset.cat : 'all');
  });
}

  renderKnowledgeBase('all');

  quizCoach = createQuizCoach({ dataset, engine, focusZone, openDrawer, toastEl });
  const btnQuiz = document.getElementById('btn-start-quiz');
  if (btnQuiz) btnQuiz.addEventListener('click', () => quizCoach.startNextQuestion());
  const quizBox = document.getElementById('quiz-box');
  if (quizBox) {
    quizBox.addEventListener('click', (ev) => {
      const opt = ev.target.closest('.quiz-opt');
      if (opt) { quizCoach.handleAnswer(opt.dataset.id); return; }
      if (ev.target.id === 'btn-quiz-fly') { quizCoach.flyToCurrentTarget(); return; }
      if (ev.target.id === 'btn-quiz-review') { quizCoach.reviewLastWrong(); return; }
    });
  }
  const inpImport = document.getElementById('inp-import-file');
  if (inpImport) {
    inpImport.addEventListener('change', async (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      const txt = await f.text();
      if (f.name.endsWith('.json')) {
        const cnt = await importNotesPackage(txt);
        toastEl.innerText = `已成功导入 ${cnt} 条 3D 笔记标注`;
        if (typeof renderAllNotes === 'function') renderAllNotes();
      } else {
        const bms = extractCoursewareBookmarks(txt, dataset);
        const box = document.getElementById('courseware-bookmarks');
        if (box) {
          box.innerHTML = `<div class="card glass"><strong style="color:var(--accent);">课件自动识别 3D 书签 (${bms.length})</strong><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">` +
            bms.map((b) => `<button class="btn glass cw-bm" data-id="${escapeHtml(b.id)}">${escapeHtml(b.name)}</button>`).join('') +
            `</div></div>`;
          box.querySelectorAll('.cw-bm').forEach((btn) => {
            btn.addEventListener('click', () => {
              const p = (dataset.points || []).find((x) => x.id === btn.dataset.id);
              if (p) {
                document.querySelector('[data-view="view-3d"]').click();
                const z = (dataset.zones || []).find((zx) => zx.id === p.zone);
                if (z) focusZone(z);
                openDrawer(p);
              }
            });
          });
        }
        toastEl.innerText = `已从课件提取 ${bms.length} 个 3D 联动书签`;
      }
    });
  }

  enterOverview();
  scheduleStaggeredRegionLoads(engine.loadRegion);
});

// Load Saved Pins & Brush Strokes
function renderSavedPin(pos) {
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.01, 12, 12), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
  pin.position.set(pos[0], pos[1], pos[2]);
  toolGroup.add(pin);
}
function renderSavedStroke(pts) {
  if (!pts || pts.length < 2) return;
  const vecs = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vecs), new THREE.LineBasicMaterial({ color: 0xfbbf24 }));
  toolGroup.add(line);
}
loadAllToolItems().then((items) => {
  items.forEach((it) => {
    if (it.kind === 'pin') renderSavedPin(it.pos);
    else if (it.kind === 'stroke') renderSavedStroke(it.pts);
  });
});

// Knowledge Base Rendering
function renderKnowledgeBase(cat) {
  const el = document.getElementById('kb-list');
  if (cat === 'meridians') {
    el.innerHTML = (dataset.meridians || []).map((m) => `
      <div class="card glass kb-meridian-jump" data-meridian="${escapeHtml(m.name)}" style="cursor:pointer;">
        <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:700;color:var(--tcm);font-size:14px;">${escapeHtml(m.name)} <span style="font-size:11px;color:var(--muted);">(${escapeHtml(m.type)})</span></span><span style="font-size:11px;color:var(--accent);">3D 循行 →</span></div>
        <div style="font-size:12.5px;color:#e2e8f0;margin-top:4px;line-height:1.55;">${escapeHtml(m.flow)}</div>
      </div>
    `).join('');
    return;
  }
  if (cat === 'full_361') {
    el.innerHTML = (dataset.full_acupoints_catalog || []).map((a) => `
      <div class="card glass kb-361-jump" data-code="${escapeHtml(a.code)}" style="cursor:pointer;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:14px;">${escapeHtml(a.name)} <span style="font-size:11px;color:var(--tcm);">(${escapeHtml(a.code)})</span></strong>
          <span style="font-size:11px;color:var(--accent);">${escapeHtml(a.meridian)} →</span>
        </div>
        <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${escapeHtml(a.ontology)}</div>
      </div>
    `).join('');
    return;
  }
  if (cat === 'glossary') {
    el.innerHTML = (dataset.glossary || []).map((g) => `
      <div class="card glass">
        <div style="font-weight:700;color:#38bdf8;font-size:14px;">${escapeHtml(g.term)} <span style="font-size:11px;color:var(--muted);font-weight:400;">(${escapeHtml(g.cat)})</span></div>
        <div style="font-size:12.5px;color:#e2e8f0;margin-top:4px;line-height:1.55;">${escapeHtml(g.def)}</div>
      </div>
    `).join('');
    return;
  }
  if (cat === 'muscles') {
    el.innerHTML = (dataset.muscles || []).map((m) => `
      <div class="card glass">
        <div style="font-weight:700;color:#fb7185;font-size:14px;">${escapeHtml(m.name)}</div>
        <div style="font-size:12px;color:#e2e8f0;margin-top:4px;line-height:1.55;">
          <strong>起点：</strong>${escapeHtml(m.origin)}<br/>
          <strong>止点：</strong>${escapeHtml(m.insertion)}<br/>
          <strong>功能：</strong>${escapeHtml(m.action)}<br/>
          <strong>神经支配：</strong>${escapeHtml(m.nerve)}<br/>
          <span style="color:#38bdf8;"><strong>护理提示：</strong>${escapeHtml(m.nursing)}</span>
        </div>
      </div>
    `).join('');
    return;
  }
  if (cat === 'nursing_protocols') {
    el.innerHTML = (dataset.nursing_protocols || []).map((n) => `
      <div class="card glass">
        <div style="font-weight:700;color:#10b981;font-size:14px;">${escapeHtml(n.name)}</div>
        <div style="font-size:12px;color:#e2e8f0;margin-top:4px;line-height:1.55;">
          <strong>适应证：</strong>${escapeHtml(n.indications)}<br/>
          <strong>操作规范：</strong>${escapeHtml(n.params)}<br/>
          <span style="color:#fecaca;"><strong>禁忌与注意：</strong>${escapeHtml(n.cautions)}</span>
        </div>
      </div>
    `).join('');
    return;
  }
  if (cat === 'tcm_prescriptions') {
    el.innerHTML = (dataset.tcm_prescriptions || []).map((r) => `
      <div class="card glass">
        <div style="font-weight:700;color:var(--tcm);font-size:14px;">${escapeHtml(r.disease)}</div>
        <div style="font-size:12px;color:#e2e8f0;margin-top:4px;line-height:1.55;">
          <strong>主穴：</strong>${escapeHtml(r.mainPoints)}<br/>
          <strong>配穴：</strong>${escapeHtml(r.adjunct)}<br/>
          <span style="color:#38bdf8;"><strong>护理方案：</strong>${escapeHtml(r.care)}</span>
        </div>
      </div>
    `).join('');
    return;
  }

  const filtered = (dataset.points || []).filter((p) => {
    if (cat === 'all') return true;
    if (cat === '穴位') return p.category.includes('穴');
    if (cat === '脏腑中枢') return p.category.includes('脏腑');
    return p.category === cat;
  });
  el.innerHTML = filtered.map((p) => `
    <div class="card glass kb-jump" data-id="${escapeHtml(p.id)}" style="cursor:pointer;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:14px;">${escapeHtml(p.name)} <span style="font-size:11px;color:var(--tcm);">(${escapeHtml(p.category)})</span></strong>
        <span style="font-size:11px;color:var(--accent);">3D 定位 →</span>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px;">${escapeHtml(p.sub)}</div>
      <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">${escapeHtml(p.tcm)}</div>
    </div>
  `).join('');
}

document.getElementById('kb-filters').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#kb-filters .chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  renderKnowledgeBase(chip.dataset.cat);
});

document.getElementById('kb-list').addEventListener('click', (e) => {
  const merCard = e.target.closest('.kb-meridian-jump');
  if (merCard) {
    const mName = merCard.dataset.meridian;
    const pts = (dataset.points || []).filter((p) => p.meridian && p.meridian.includes(mName.replace('足', '').replace('手', '')) || p.meridian === mName);
    document.querySelector('[data-nav="3d"]').click();
    enterOverview();
    if (pts.length >= 2) {
      meridianOverlay.showMeridianForPoints(pts, '#fbbf24');
      toastEl.innerText = `已高亮 3D 经脉循行：${mName}（${pts.length} 个定位穴位）`;
    } else {
      toastEl.innerText = `已切换至 3D 视图：${mName}`;
    }
    return;
  }

  const card361 = e.target.closest('.kb-361-jump');
  if (card361) {
    const code = card361.dataset.code;
    const curated = dataset.points.find((p) => p.id === code);
    if (curated) {
      document.querySelector('.nav-item[data-view="view-3d"]').click();
      const z = dataset.zones.find((x) => x.id === curated.zone);
      if (z) enterZone(z);
      openDrawer(curated);
      return;
    }
    const a = (dataset.full_acupoints_catalog || []).find((x) => x.code === code);
    if (a) {
      document.querySelector('.nav-item[data-view="view-3d"]').click();
      const z = dataset.zones.find((x) => x.id === a.zone);
      if (z) enterZone(z);
      openDrawer({
        id: a.code, category: '国标十四经穴', name: `${a.name} (${a.code})`,
        sub: `${a.meridian} · ${a.ontology}`,
        anatomy: `已自动定位至【${z ? z.name : '对应解剖大区'}】。`,
        tcm: `归属 ${a.meridian}（国标 GB/T 12346-2021 标准收录穴位）。`,
        pharmacology: '支持在下方“我的笔记”中补充该穴位的临床/教材重点，离线永久保存。',
        nursing: '提示：该穴位已定位至所属大区，可结合骨性标志与经脉循行线进行体表取穴。'
      });
    }
    return;
  }

  const card = e.target.closest('.kb-jump');
  if (!card) return;
  const pt = dataset.points.find((p) => p.id === card.dataset.id);
  if (!pt) return;
  document.querySelector('.nav-item[data-view="view-3d"]').click();
  if (pt.gender !== 'Common' && pt.gender !== state.activeGender) {
    setGender(pt.gender);
  }
  const z = dataset.zones.find((x) => x.id === pt.zone);
  if (z) enterZone(z);
  openDrawer(pt);
});

function setGender(g) {
  state.activeGender = g;
  document.getElementById('btn-male').className = g === 'Male' ? 'seg-btn active-male' : 'seg-btn';
  document.getElementById('btn-female').className = g === 'Female' ? 'seg-btn active-female' : 'seg-btn';
  anatomyGroup.scale.set(1.0, 1.0, 1.0);
  engine.applyLayerAndGenderStyles();
  engine.refreshVisiblePoints();
  toastEl.innerText = g === 'Female' ? '已切换：女性模型与女性盆腔生殖结构' : '已切换：男性模型与解剖结构';
}

document.getElementById('btn-male').addEventListener('click', () => setGender('Male'));
document.getElementById('btn-female').addEventListener('click', () => setGender('Female'));

// Drawer & Dissection
async function openDrawer(pt) {
  const ns = document.getElementById('needle-depth-slider'); if (ns) ns.value = 0; const nv = document.getElementById('needle-depth-val'); if (nv) nv.innerText = '0.0 寸';
  lastOpenedPoint = pt;
  const isDetailed = detailMode === 'detailed';
  const modeBtn = document.getElementById('btn-detail-mode');
  if (modeBtn) modeBtn.innerText = isDetailed ? '详细模式 (点切简易)' : '简易模式 (点切详细)';
  selectedPointId = pt.id;
  if (!String(pt.id || '').startsWith('MESH_')) {
    activePickedMesh = null;
    document.getElementById('d-hide-mesh').style.display = 'none';
    document.getElementById('d-isolate-mesh').style.display = 'none';
  }
  document.getElementById('d-cat').innerText = pt.category;
  document.getElementById('d-name').innerText = pt.name;
  document.getElementById('d-sub').innerText = pt.sub + (pt.ontology ? `  [${pt.ontology}]` : '');
  let extraTcmHtml = '';
  const safetyInfo = meridianOverlay.showAcupunctureSafetyCone(pt);
  if (safetyInfo) {
    extraTcmHtml += `<p style="color:#fda4af;"><strong>进针安全预警：</strong>${escapeHtml(safetyInfo.depth)} — ${escapeHtml(safetyInfo.risk)}</p>`;
  }
  const bioInfo = biomechEngine.matchAndShowMuscleVector(pt.name || '');
  const pairedMer = getPairedMeridianInfo(pt.meridian);
  if (pairedMer) {
    extraTcmHtml += `<p style="color:#a7f3d0;"><strong>表里经关联：</strong>${escapeHtml(pairedMer)}</p>`;
  }
  if (bioInfo) {
    extraTcmHtml += `<p style="color:#7dd3fc;"><strong>十二经筋与力学矢量：</strong>${escapeHtml(bioInfo.sinew)}（已标出红起点→蓝止点拉力线）</p>`;
  }
  if (activePickedMesh && engine.highlightSelectedMesh) engine.highlightSelectedMesh(activePickedMesh);
  if (String(pt.id || '').startsWith('MESH_') && activePickedMesh) {
    const box = new engine.THREE.Box3().setFromObject(activePickedMesh);
    const ctr = new engine.THREE.Vector3();
    box.getCenter(ctr);
    const nearby = meridianOverlay.findNearbyAcupoints(ctr, dataset.points, 4);
    if (nearby.length) {
      extraTcmHtml = `<p style="color:#fde68a;"><strong>邻近穴位参考：</strong>${nearby.map((n) => `${escapeHtml(n.point.name)} (${Math.round(n.dist * 100)}cm)`).join('、')}</p>`;
    }
  } else if (pt.meridian) {
    const mPts = (dataset.points || []).filter((p) => p.meridian === pt.meridian);
    if (mPts.length >= 2) meridianOverlay.showMeridianForPoints(mPts, '#fbbf24');
  }
  const kbAcu = (medicalKB.acupoint_details || {})[pt.name];
  const sysKb = (medicalKB.systems || []).find((s) => s.id === pt.layer);
  let anaBody = pt.anatomy;
  let tcmBody = pt.tcm;
  if (kbAcu) {
    anaBody = isDetailed ? kbAcu.detailed : kbAcu.simple;
    tcmBody = `${kbAcu.meridian} · ${kbAcu.type} (${kbAcu.code})`;
  } else if (!isDetailed && String(anaBody || '').length > 68) {
    anaBody = String(anaBody).slice(0, 68) + '…（切换右上角「详细模式」查看完整解剖层次）';
  }
  const sysDetailHtml = (isDetailed && sysKb) ? `<p style="color:#cbd5e1;"><strong>系统百科：</strong>${escapeHtml(sysKb.detailed)}</p>` : '';
  document.getElementById('tab-ana').innerHTML = `<p><strong>${isDetailed ? '详细解剖与层次' : '简易要点'}：</strong>${anaBody}</p><p><strong>中医归属：</strong>${escapeHtml(tcmBody)}</p>${sysDetailHtml}${extraTcmHtml}`;
  document.getElementById('tab-care').innerHTML = `<p><strong>药理关联：</strong>${escapeHtml(pt.pharmacology)}</p><p style="color:#fecaca;"><strong>护理与禁忌：</strong>${escapeHtml(pt.nursing)}</p>`;
  const saved = await loadNote(pt.id);
  document.getElementById('note-input').value = saved.note || '';
  selectedHlColor = saved.color || 'none';
  document.querySelectorAll('.hl-dot').forEach((d) => d.classList.toggle('selected', d.dataset.color === selectedHlColor));
  document.getElementById('drawer').classList.add('open');
}

document.getElementById('d-hide-mesh').addEventListener('click', () => {
  if (!activePickedMesh) return;
  activePickedMesh.visible = false;
  state.hiddenDissectedMeshes.add(activePickedMesh);
  document.getElementById('drawer').classList.remove('open');
  toastEl.innerText = '已剥离隐藏该层结构，露出深层组织（点“恢复剥离”可还原）';
});

document.getElementById('d-isolate-mesh').addEventListener('click', () => {
  if (!activePickedMesh) return;
  anatomyGroup.traverse((c) => {
    if (c.isMesh && c !== activePickedMesh) {
      c.visible = false;
      state.hiddenDissectedMeshes.add(c);
    }
  });
  activePickedMesh.visible = true;
  toastEl.innerText = '已孤立显示该解剖结构（点“恢复剥离”可还原）';
});

document.getElementById('btn-restore-dissect').addEventListener('click', () => {
  state.hiddenDissectedMeshes.clear();
  engine.applyLayerAndGenderStyles();
  toastEl.innerText = '已恢复全部被剥离/孤立的解剖结构';
});

document.getElementById('d-close').addEventListener('click', () => document.getElementById('drawer').classList.remove('open'));
document.getElementById('btn-back-overview').addEventListener('click', enterOverview);

document.getElementById('btn-toggle-sliders').addEventListener('click', (e) => {
  const dock = document.getElementById('left-dock');
  dock.classList.toggle('open');
  e.currentTarget.classList.toggle('on', dock.classList.contains('open'));
});

document.getElementById('layer-dock').addEventListener('click', (e) => {
  const btn = e.target.closest('.layer-btn');
  if (!btn) return;
  btn.classList.toggle('on');
  const layer = btn.dataset.layer;
  state.visibleLayers[layer] = btn.classList.contains('on');
  if (layer === 'Points') engine.refreshVisiblePoints();
  else engine.applyLayerAndGenderStyles();
});

document.getElementById('btn-ghost').addEventListener('click', (e) => {
  state.ghostMode = !state.ghostMode;
  e.currentTarget.classList.toggle('on', state.ghostMode);
  engine.applyLayerAndGenderStyles();
});

document.getElementById('btn-phys').addEventListener('click', (e) => {
  state.physAnimEnabled = !state.physAnimEnabled;
  e.currentTarget.classList.toggle('on', state.physAnimEnabled);
  toastEl.innerText = state.physAnimEnabled ? '已开启：心脏搏动与肺呼吸生理动画' : '已暂停生理动画';
});

document.getElementById('clip-z').addEventListener('input', (e) => { clipPlaneZ.constant = parseFloat(e.target.value); });
document.getElementById('skin-alpha').addEventListener('input', (e) => {
  state.skinOpacity = parseFloat(e.target.value);
  engine.applyLayerAndGenderStyles();
});

// Tools: Ruler, Pin, Brush
function clearRuler() {
  rulerPoints = [];
  toolGroup.children.filter((c) => c.userData.isRuler).forEach((c) => toolGroup.remove(c));
}

document.getElementById('btn-ruler').addEventListener('click', (e) => {
  rulerMode = !rulerMode; pinMode = false; drawMode = false; controls.enabled = true;
  document.getElementById('btn-pin').classList.remove('on');
  document.getElementById('btn-draw').classList.remove('on');
  e.currentTarget.classList.toggle('on', rulerMode);
  clearRuler();
  toastEl.innerText = rulerMode ? '测距模式：请在 3D 模型表面点击两点测量距离 (cm)' : '已退出测距模式';
});

document.getElementById('btn-pin').addEventListener('click', (e) => {
  pinMode = !pinMode; rulerMode = false; drawMode = false; controls.enabled = true;
  document.getElementById('btn-ruler').classList.remove('on');
  document.getElementById('btn-draw').classList.remove('on');
  clearRuler();
  e.currentTarget.classList.toggle('on', pinMode);
  toastEl.innerText = pinMode ? '插旗标注：点击模型表面放置自定义 3D 重点旗帜' : '已退出插旗模式';
});

document.getElementById('btn-draw').addEventListener('click', (e) => {
  drawMode = !drawMode; pinMode = false; rulerMode = false;
  document.getElementById('btn-pin').classList.remove('on');
  document.getElementById('btn-ruler').classList.remove('on');
  clearRuler();
  e.currentTarget.classList.toggle('on', drawMode);
  controls.enabled = !drawMode;
  toastEl.innerText = drawMode ? '画笔模式：直接在模型表面拖动划重点（自动保存）' : '已退出画笔模式';
});

document.getElementById('btn-clear-tools').addEventListener('click', async () => {
  toolGroup.clear();
  await clearAllToolItems();
  toastEl.innerText = '已清除所有保存的 3D 旗帜与画笔标记';
});

// Raycasting
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downPos = { x: 0, y: 0 };

function formatMeshTitle(rawName) {
  const parts = (rawName || '').split('__');
  const sysMap = { Skin: '体表分层', LigamentJoint: '关节韧带', Muscular: '肌肉系统', Skeleton: '骨骼系统', Visceral: '脏腑器官', Neurovascular: '神经血管' };
  const sys = sysMap[parts[0]] || '解剖结构';
  const cleanName = (parts.length >= 3 ? parts.slice(2).join(' ') : rawName).replace(/\.[0-9]+$/, '').replace(/_/g, ' ');
  return { sys, cleanName };
}

function handleUniversalMeshClick(hit) {
  const mesh = hit.object;
  activePickedMesh = mesh;
  document.getElementById('d-hide-mesh').style.display = 'inline-block';
  document.getElementById('d-isolate-mesh').style.display = 'inline-block';
  const info = formatMeshTitle(mesh.name);
  const idxHit = meshIndex.find((x) => x.meshName === mesh.name || x.raw === info.cleanName);
  openDrawer({
    id: 'MESH_' + info.cleanName.replace(/\s+/g, '_').slice(0, 32),
    category: info.sys,
    name: `${info.cleanName} (${translateAnatName(info.cleanName)})`,
    sub: (idxHit && idxHit.ta2) || 'Z-Anatomy 真实三维网格结构（全量点选识别）',
    anatomy: (idxHit && idxHit.desc ? idxHit.desc + '<br/><br/>' : '') + `所属系统：${info.sys}。空间坐标：(${hit.point.x.toFixed(2)}, ${hit.point.y.toFixed(2)}, ${hit.point.z.toFixed(2)}) m。`,
    tcm: '可结合所属大区经络循行与骨性标志进行中医护理定位。',
    pharmacology: '支持在下方“我的笔记”中自行补充该结构的临床/药理重点，离线永久保存。',
    nursing: '提示：可点击右上角“剥离隐藏”移除当前表层结构，观察深层组织。'
  });
  toastEl.innerText = `识别结构：${info.cleanName} (${info.sys})`;
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY };
  if (drawMode) { isDrawing = true; activeStrokePts = []; activeStrokeLine = null; }
});

renderer.domElement.addEventListener('pointermove', (e) => {
  if (!drawMode || !isDrawing) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(anatomyGroup.children, true).filter((h) => h.object.visible);
  if (hits.length > 0) {
    const p = hits[0].point;
    activeStrokePts.push([p.x, p.y, p.z]);
    if (activeStrokeLine) {
      if (activeStrokeLine.geometry) activeStrokeLine.geometry.dispose();
      toolGroup.remove(activeStrokeLine);
    }
    if (activeStrokePts.length >= 2) {
      const vecs = activeStrokePts.map((pt) => new THREE.Vector3(pt[0], pt[1], pt[2]));
      activeStrokeLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vecs), new THREE.LineBasicMaterial({ color: 0xfbbf24 }));
      toolGroup.add(activeStrokeLine);
    }
  }
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (drawMode && isDrawing) {
    isDrawing = false;
    if (activeStrokePts.length >= 2) {
      saveToolItem({ id: 'stroke_' + Date.now(), kind: 'stroke', pts: activeStrokePts });
      toastEl.innerText = '3D 画笔重点已离线保存';
    }
    return;
  }
  if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 8) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  if (rulerMode || pinMode) {
    const meshHits = raycaster.intersectObjects(anatomyGroup.children, true).filter((h) => h.object.visible);
    if (meshHits.length > 0) {
      const p = meshHits[0].point;
      if (pinMode) {
        const arr = [p.x, p.y, p.z];
        renderSavedPin(arr);
        saveToolItem({ id: 'pin_' + Date.now(), kind: 'pin', pos: arr });
        toastEl.innerText = `已在 (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) 放置自定义 3D 重点旗帜`;
      } else if (rulerMode) {
        if (rulerPoints.length >= 2) clearRuler();
        rulerPoints.push(p.clone());
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 10), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        dot.position.copy(p);
        dot.userData.isRuler = true;
        toolGroup.add(dot);
        if (rulerPoints.length === 2) {
          const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rulerPoints), new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
          line.userData.isRuler = true;
          toolGroup.add(line);
          const cm = (rulerPoints[0].distanceTo(rulerPoints[1]) * 100).toFixed(1);
          toastEl.innerText = `空间测距结果：${cm} cm（约合 ${(cm / 2.2).toFixed(1)} 同身寸）`;
        } else {
          toastEl.innerText = '已选第 1 点，请点击第 2 点完成测距';
        }
      }
    }
    return;
  }

  if (!state.activeZone) {
    const hits = raycaster.intersectObjects(state.zoneMeshes, false);
    if (hits.length > 0) enterZone(hits[0].object.userData.data);
  } else {
    const visiblePts = state.pointMeshes.filter((m) => m.visible);
    const hits = raycaster.intersectObjects(visiblePts, false);
    if (hits.length > 0) {
      const pt = hits[0].object.userData.data;
      if (quizTarget) {
        quizTotal++;
        if (pt.id === quizTarget.id) { quizScore++; toastEl.innerText = `自测正确！${pt.name}`; quizTarget = null; }
        else { toastEl.innerText = `点中了 ${pt.name}，目标为 ${quizTarget.name}`; }
        document.getElementById('quiz-stat').innerText = `得分: ${quizScore} / ${quizTotal}`;
      }
      openDrawer(pt);
    } else {
      const meshHits = raycaster.intersectObjects(anatomyGroup.children, true).filter((h) => h.object.visible);
      if (meshHits.length > 0) handleUniversalMeshClick(meshHits[0]);
    }
  }
});

// Drawer Tabs, Notes & Export
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    ['tab-ana', 'tab-care', 'tab-note'].forEach((id) => {
      document.getElementById(id).style.display = id === btn.dataset.tab ? 'block' : 'none';
    });
  });
});

document.querySelectorAll('.hl-dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    selectedHlColor = dot.dataset.color;
    document.querySelectorAll('.hl-dot').forEach((d) => d.classList.remove('selected'));
    dot.classList.add('selected');
  });
});

document.getElementById('btn-save-note').addEventListener('click', async () => {
  if (!selectedPointId) return;
  await saveNote(selectedPointId, { note: document.getElementById('note-input').value.trim(), color: selectedHlColor });
  toastEl.innerText = '个人笔记与重点已离线保存';
});

async function renderAllNotes() {
  const notes = await getAllNotes();
  const el = document.getElementById('all-notes-list');
  if (!notes.length) {
    el.innerHTML = '<div class="card glass" style="font-size:12.5px;color:var(--muted);">暂无个人笔记，请在 3D 模型中点击任意部位添加。</div>';
    return;
  }
  el.innerHTML = notes.map((n) => {
    const pt = dataset.points.find((p) => p.id === n.id);
    return `<div class="card glass">
      <div style="font-weight:700;color:var(--student);">${escapeHtml(pt ? pt.name : n.id)}</div>
      <div style="font-size:12.5px;color:#e2e8f0;margin-top:4px;">${escapeHtml(n.note) || '（仅色标重点）'}</div>
    </div>`;
  }).join('');
}

document.getElementById('btn-export-notes').addEventListener('click', async () => {
  const all = await getAllNotes();
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `中医解剖笔记_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
});

document.getElementById('btn-start-quiz').addEventListener('click', () => {
  if (!dataset.points.length) return;
  quizTarget = dataset.points[Math.floor(Math.random() * dataset.points.length)];
  document.getElementById('quiz-box').innerHTML = `请在 3D 模型中找出：<strong style="color:var(--tcm);">${escapeHtml(quizTarget.name)}</strong><br/><span style="font-size:12px;color:var(--muted);">提示：${escapeHtml(quizTarget.category)} · ${escapeHtml(quizTarget.sub)}</span>`;
  document.querySelector('.nav-item[data-view="view-3d"]').click();
  toastEl.innerText = `自测目标：请进入对应大区点击【${quizTarget.name}】`;
});

const ecoChk = document.getElementById('chk-eco');
ecoChk.addEventListener('change', (e) => applyEcoMode(renderer, e.target.checked));
bindDynamicTouchResolution(controls, renderer, () => ecoChk.checked);

// Search Bar & Dropdown
document.getElementById('search-input').addEventListener('input', (e) => {
  const dd = document.getElementById('search-dropdown');
  const results = searchAll(e.target.value, dataset, meshIndex);
  if (!e.target.value.trim()) { dd.style.display = 'none'; return; }
  if (!results.length) {
    dd.innerHTML = '<div style="padding:8px;font-size:12px;color:#94a3b8;">未找到匹配学名</div>';
  } else {
    dd.innerHTML = results.map((r, idx) => `
      <div class="sr-item" data-idx="${idx}" style="padding:8px 10px;border-radius:8px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:13px;font-weight:600;color:#f8fafc;">${escapeHtml(r.label)}</div>
        <div style="font-size:11px;color:#38bdf8;">${escapeHtml(r.sub)}</div>
      </div>
    `).join('');
    dd._items = results;
  }
  dd.style.display = 'block';
});

document.getElementById('search-dropdown').addEventListener('click', (e) => {
  const itemEl = e.target.closest('.sr-item');
  if (!itemEl) return;
  const dd = document.getElementById('search-dropdown');
  const item = dd._items && dd._items[parseInt(itemEl.dataset.idx, 10)];
  if (!item) return;
  dd.style.display = 'none';
  if (item.isCatalog361) {
    const a = item.raw;
    const z = dataset.zones.find((x) => x.id === a.zone);
    if (z) enterZone(z);
    openDrawer({
      id: a.code, category: '国标十四经穴', name: `${a.name} (${a.code})`,
      sub: `${a.meridian} · ${a.ontology}`,
      anatomy: `已自动定位至【${z ? z.name : '对应解剖大区'}】。`,
      tcm: `归属 ${a.meridian}（国标 GB/T 12346-2021 标准收录穴位）。`,
      pharmacology: '支持在下方“我的笔记”中补充个人重点，离线永久保存。',
      nursing: '提示：可结合该大区骨性标志与经脉循行线进行体表定位。'
    });
  } else if (item.isCurated) {
    const z = dataset.zones.find((x) => x.id === item.raw.zone);
    if (z) enterZone(z);
    openDrawer(item.raw);
    focusRing.position.set(item.raw.pos[0], item.raw.pos[1], item.raw.pos[2]);
    focusRing.visible = true;
  } else {
    const m = item.raw;
    const z = dataset.zones.find((x) => (x.regionFiles || [x.regionFile]).includes(m.region));
    if (z) enterZone(z);
    engine.smoothFlyTo(m.pos, [m.pos[0] + 0.15, m.pos[1] + 0.08, m.pos[2] + 0.35]);
    focusRing.position.set(m.pos[0], m.pos[1], m.pos[2]);
    focusRing.visible = true;
    const zh = translateAnatName(m.raw);
    openDrawer({
      id: 'MESH_' + m.raw.replace(/\s+/g, '_').slice(0, 32),
      category: m.sys, name: `${m.raw} (${zh})`,
      sub: m.ta2 || 'Z-Anatomy 工业级全量索引结构',
      anatomy: (m.desc ? m.desc + '<br/><br/>' : '') + `系统归属：${m.sys}，位置坐标：(${m.pos.join(', ')})。`,
      tcm: '已定位至该解剖/骨性标志位置，可结合周围经络循行学习。',
      pharmacology: '支持在下方“我的笔记”中补充个人重点，离线永久保存。',
      nursing: '提示：蓝色定位光环已标出该结构的三维中心位置。'
    });
  }
});

document.addEventListener('click', (e) => {
  const dd = document.getElementById('search-dropdown');
  const si = document.getElementById('search-input');
  if (dd && si && !dd.contains(e.target) && e.target !== si) dd.style.display = 'none';
});

engine.startLoop((now) => { biomechEngine.animateJoints(now * 0.001); return true; });

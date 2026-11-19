import * as T from 'three';
import { getBone3DPins } from './r2-bone-landmarks';
import { buildFullLymphaticSystem, type ExtraAnatMeta } from './r2-lymphatic-builder';
import { buildFullLigamentSystem } from './r2-ligament-builder';
function makePinLabel(text: string, hexColor: number): T.Sprite { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const cx = cv.getContext('2d')!; cx.clearRect(0, 0, 256, 64); cx.fillStyle = 'rgba(10, 16, 30, 0.88)'; cx.beginPath(); if (typeof (cx as any).roundRect === 'function') { (cx as any).roundRect(4, 6, 248, 52, 26); } else { cx.rect(4, 6, 248, 52); } cx.fill(); cx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; cx.lineWidth = 2; cx.stroke(); cx.fillStyle = '#' + hexColor.toString(16).padStart(6, '0'); cx.beginPath(); cx.arc(30, 32, 8, 0, Math.PI * 2); cx.fill(); cx.fillStyle = '#ffffff'; cx.font = 'bold 26px sans-serif'; cx.textBaseline = 'middle'; cx.fillText(text.slice(0, 8), 48, 33, 196); const tex = new T.CanvasTexture(cv); tex.needsUpdate = true; const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false })); sp.renderOrder = 20; return sp; }
function makePinSpriteTex(hexColor: number, active = false): T.CanvasTexture { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const cx = cv.getContext('2d')!; const col = '#' + hexColor.toString(16).padStart(6, '0'); if (active) { cx.save(); cx.shadowColor = '#ffffff'; cx.shadowBlur = 16; cx.beginPath(); cx.arc(64, 64, 46, 0, Math.PI * 2); cx.strokeStyle = 'rgba(255, 255, 255, 0.95)'; cx.lineWidth = 7; cx.stroke(); cx.restore(); cx.beginPath(); cx.arc(64, 64, 38, 0, Math.PI * 2); cx.strokeStyle = col; cx.lineWidth = 5; cx.stroke(); } cx.beginPath(); cx.arc(64, 64, 31, 0, Math.PI * 2); cx.strokeStyle = 'rgba(15, 23, 42, 0.92)'; cx.lineWidth = 8; cx.stroke(); cx.beginPath(); cx.arc(64, 64, 25, 0, Math.PI * 2); cx.strokeStyle = '#ffffff'; cx.lineWidth = 5; cx.stroke(); cx.beginPath(); cx.arc(64, 64, 17, 0, Math.PI * 2); cx.fillStyle = col; cx.fill(); const tex = new T.CanvasTexture(cv); tex.needsUpdate = true; return tex; }

export interface R2SceneHandles {
  scene: T.Scene;
  camera: T.Camera;
  renderer: T.WebGLRenderer;
  controls: any;
}

export function createProceduralBump(fibrous: boolean): T.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const cx = cv.getContext('2d')!;
  const im = cx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4;
      const v = Math.max(0, Math.min(255, Math.floor(128 + (fibrous ? Math.sin(x * 0.35 + Math.sin(y * 0.08) * 3) * 42 : Math.sin(x * 0.4) * Math.cos(y * 0.4) * 26))));
      im.data[i] = v; im.data[i + 1] = v; im.data[i + 2] = v; im.data[i + 3] = 255;
    }
  }
  cx.putImageData(im, 0, 0);
  const tx = new T.CanvasTexture(cv);
  tx.wrapS = tx.wrapT = T.RepeatWrapping;
  tx.repeat.set(8, 8);
  return tx;
}

export function setupStudioLighting(scene: T.Scene, renderer: T.WebGLRenderer): void {
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
  try {
    const pmrem = new T.PMREMGenerator(renderer);
    const envScene = new T.Scene();
    envScene.background = new T.Color(0x0b1220);
    const l1 = new T.PointLight(0xffffff, 18, 20); l1.position.set(4, 6, 5); envScene.add(l1);
    const l2 = new T.PointLight(0x38bdf8, 12, 20); l2.position.set(-5, 3, -4); envScene.add(l2);
    const l3 = new T.PointLight(0xf59e0b, 10, 20); l3.position.set(0, -4, 4); envScene.add(l3);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
  } catch { /* fallback */ }
}

export class R2OverlayEngine {
  acuGroup = new T.Group();
  extraGroup = new T.Group();
  lymphGroup = new T.Group();
  endoGroup = new T.Group();
  connGroup = new T.Group(); bonePinGroup = new T.Group(); lastPinKey = ''; activePinMesh: T.Object3D | null = null; boneQuizMode = false; quizTargetName = '';
  tubeMats: T.MeshStandardMaterial[] = [];
  ligGroup = new T.Group(); extraHitTargets: T.Object3D[] = []; extraCatalog: ExtraAnatMeta[] = []; lastFocusExtraId = ''; extraCatalogSent = false; flyCamPos: T.Vector3 | null = null; flyCamTarget: T.Vector3 | null = null; highlightMesh: T.Mesh | null = null;
  lastAcuKey = '';
  lastFocusKey = '';
  lastExtraKey = '';
  lastXray = false;
  lastPulse = 0;
  tapCb: ((pt: any) => void) | null = null;
  extraCb: ((info: { name: string; system: string; desc: string }) => void) | null = null;
  private pdX = 0;
  private pdY = 0;
  private handles: R2SceneHandles;

  constructor(handles: R2SceneHandles) {
    this.handles = handles;
    this.acuGroup.name = 'r2_acupoint_group';
    this.extraGroup.name = 'r2_extra_anatomy_group';
    this.lymphGroup.name = 'r2_lymph_group';
    this.endoGroup.name = 'r2_endo_group';
    this.connGroup.name = 'r2_conn_group';
    this.extraGroup.add(this.lymphGroup, this.endoGroup, this.connGroup);
   this.ligGroup.name = 'r2_lig_group'; this.extraGroup.add(this.ligGroup);
    handles.scene.add(this.acuGroup);
    handles.scene.add(this.extraGroup); this.bonePinGroup.name = 'r2_bone_pin_group'; handles.scene.add(this.bonePinGroup);
    const dom = handles.renderer.domElement;
    dom.addEventListener('pointerdown', (ev: PointerEvent) => { this.pdX = ev.clientX; this.pdY = ev.clientY; });
    dom.addEventListener('pointerup', (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - this.pdX, ev.clientY - this.pdY) > 8) return;
      const r = dom.getBoundingClientRect();
      const ndc = new T.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      const tr = new T.Raycaster();
      tr.setFromCamera(ndc, this.handles.camera); if (this.bonePinGroup.visible && this.bonePinGroup.children.length) { const wp = new T.Vector3(); let bestPin: T.Object3D | null = null; let bestDist = 28; for (const ch of this.bonePinGroup.children) { if (!ch.userData?.pinInfo) continue; ch.getWorldPosition(wp); wp.project(this.handles.camera); if (wp.z > 1) continue; const sx = r.left + (wp.x * 0.5 + 0.5) * r.width; const sy = r.top + (-wp.y * 0.5 + 0.5) * r.height; const dist = Math.hypot(ev.clientX - sx, ev.clientY - sy); if (dist < bestDist) { bestDist = dist; bestPin = ch; } } if (!bestPin) { const phs = tr.intersectObjects(this.bonePinGroup.children, true); const hp = phs.find((h) => h.object?.userData?.pinInfo); if (hp) bestPin = hp.object; } if (bestPin) { ev.stopPropagation(); const pm = (bestPin as any).userData?.pinCore || bestPin; if (this.activePinMesh && this.activePinMesh !== pm) { const prev = this.activePinMesh as any; const bs = prev.userData?.baseScale; if (bs) prev.scale.set(bs, bs, 1); else prev.scale.setScalar(1); if (prev.material && prev.userData?.normalTex) { prev.material.map = prev.userData.normalTex; prev.material.needsUpdate = true; } if (prev.userData?.pinLabel) prev.userData.pinLabel.visible = false; } const pmAny = pm as any; const bs = pmAny.userData?.baseScale; if (bs) pmAny.scale.set(bs * 1.38, bs * 1.38, 1); else pmAny.scale.setScalar(1.55); if (pmAny.material && pmAny.userData?.activeTex) { pmAny.material.map = pmAny.userData.activeTex; pmAny.material.needsUpdate = true; } if (pmAny.userData?.pinLabel) pmAny.userData.pinLabel.visible = true; this.activePinMesh = pm; const pin = bestPin.userData.pinInfo; if (this.boneQuizMode && this.quizTargetName) { this.extraCb?.({ name: pin.name, system: pin.name === this.quizTargetName ? '测验正确 ✓' : '测验提示 (目标：' + this.quizTargetName + ')', desc: pin.desc, isQuizHit: pin.name === this.quizTargetName } as any); } else { this.extraCb?.(pin); } return; } }
      if (this.acuGroup.visible && this.acuGroup.children.length) {
        const hs = tr.intersectObjects(this.acuGroup.children, true);
        const ha = hs.find((h) => h.object?.userData?.acupoint);
        if (ha) { this.tapCb?.(ha.object.userData.acupoint); return; }
      }
   if (this.extraGroup.visible && this.extraHitTargets.length) { const wp = new T.Vector3(); let bestObj: any = null, bestD = 36; for (const obj of this.extraHitTargets) { if (!obj.visible) continue; obj.getWorldPosition(wp); const p = wp.clone().project(this.handles.camera); const sx = (p.x * 0.5 + 0.5) * r.width + r.left, sy = (-p.y * 0.5 + 0.5) * r.height + r.top; const d = Math.hypot(sx - ev.clientX, sy - ev.clientY); if (d < bestD) { bestD = d; bestObj = obj; } } if (bestObj?.userData?.extraInfo) { this.extraCb?.(bestObj.userData.extraInfo); return; } }
      if (this.extraGroup.visible && this.extraGroup.children.length) {
        const hs = tr.intersectObjects(this.extraGroup.children, true);
        const he = hs.find((h) => h.object?.userData?.extraInfo);
        if (he) { this.extraCb?.(he.object.userData.extraInfo); }
      }
    }), true;
  }

  private rebuildExtraAnatomy(bodyBox: T.Box3): void {
   this.lymphGroup.clear();
    this.endoGroup.clear();
    this.connGroup.clear();
    const minY = bodyBox.isEmpty() ? 0 : bodyBox.min.y;
    const spanY = Math.max(0.5, bodyBox.isEmpty() ? 1.7 : bodyBox.max.y - bodyBox.min.y);
    const c = bodyBox.isEmpty() ? new T.Vector3(0, 0.85, 0) : bodyBox.getCenter(new T.Vector3());
    const sz = bodyBox.isEmpty() ? new T.Vector3(0.5, 1.7, 0.28) : bodyBox.getSize(new T.Vector3());
    const pos = (rx: number, ry: number, rz: number) => new T.Vector3(c.x + rx * sz.x, minY + ry * spanY, c.z + rz * sz.z);
    const addNode = (group: T.Group, geo: T.BufferGeometry, color: number, p: T.Vector3, info: { name: string; system: string; desc: string }, opacity = 0.9) => {
      const m = new T.Mesh(geo, new T.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.4, transparent: opacity < 1, opacity }));
      m.position.copy(p);
      m.userData = { extraInfo: info };
      group.add(m);
    };
    const addTube = (group: T.Group, pts: T.Vector3[], r: number, color: number, info: { name: string; system: string; desc: string }, opts?: { seg?: number; radSeg?: number; opacity?: number; emissive?: number; ei?: number }) => {
      const m = new T.Mesh(
        new T.TubeGeometry(new T.CatmullRomCurve3(pts), opts?.seg ?? 20, r, opts?.radSeg ?? 8, false),
        new T.MeshPhysicalMaterial({ color, emissive: opts?.emissive ?? 0x000000, emissiveIntensity: opts?.ei ?? 0, roughness: 0.35, clearcoat: 0.4, transparent: (opts?.opacity ?? 0.9) < 1, opacity: opts?.opacity ?? 0.9 })
      );
      m.userData = { extraInfo: info };
      group.add(m);
    };
    // Lymphatic: Thoracic duct + Tributaries + Right lymphatic duct + Cisterna chyli + Lymph nodes
    addTube(this.lymphGroup, [pos(0.01, 0.56, -0.04), pos(0.01, 0.65, -0.05), pos(-0.015, 0.74, -0.04), pos(-0.055, 0.81, 0.03)], 0.0024, 0x4ade80, { name: '胸导管 · Thoracic Duct', system: '淋巴系统', desc: '人体最大淋巴导管，起自乳糜池，沿脊柱前方上行注入左静脉角，收集下半身及左上半身淋巴。' }, { seg: 24, emissive: 0x15803d, ei: 0.25 });
    addTube(this.lymphGroup, [pos(-0.04, 0.77, -0.02), pos(-0.08, 0.79, 0.01), pos(-0.12, 0.76, 0.02)], 0.0016, 0x4ade80, { name: '胸导管分支 · Thoracic Duct Tributary', system: '淋巴系统', desc: '汇入胸导管的左锁骨下干与支气管纵隔干分支，引流左胸及左上肢淋巴。' }, { seg: 16, emissive: 0x15803d, ei: 0.2 });
    addTube(this.lymphGroup, [pos(0.06, 0.77, -0.02), pos(0.055, 0.80, 0.01), pos(0.05, 0.81, 0.03)], 0.0016, 0x4ade80, { name: '右淋巴导管 · Right Lymphatic Duct', system: '淋巴系统', desc: '短而粗的淋巴导管，注入右静脉角，收集右上半身（右头颈、右上肢、右半胸）淋巴。' }, { seg: 16, emissive: 0x15803d, ei: 0.2 });
    addNode(this.lymphGroup, new T.SphereGeometry(0.0045, 12, 12), 0x4ade80, pos(0.01, 0.56, -0.04), { name: '乳糜池 · Cisterna Chyli', system: '淋巴系统', desc: '位于第1-2腰椎前方，胸导管起始处的囊状膨大。' });
    for (const sgn of [-1, 1]) {
      const side = sgn > 0 ? '左' : '右';
      addNode(this.lymphGroup, new T.SphereGeometry(0.003, 10, 10), 0x22c55e, pos(sgn * 0.07, 0.84, 0.02), { name: `${side}侧颈深淋巴结群`, system: '淋巴系统', desc: '沿颈内静脉排列，收集头颈部淋巴回流。' });
      addNode(this.lymphGroup, new T.SphereGeometry(0.0038, 10, 10), 0x22c55e, pos(sgn * 0.22, 0.74, 0.02), { name: `${side}侧腋窝淋巴结群`, system: '淋巴系统', desc: '分外侧、胸肌、肩胛下等群，引流上肢及胸壁乳房淋巴。' });
      addNode(this.lymphGroup, new T.SphereGeometry(0.0035, 10, 10), 0x22c55e, pos(sgn * 0.12, 0.49, 0.14), { name: `${side}侧腹股沟淋巴结群`, system: '淋巴系统', desc: '位于腹股沟韧带下方，引流下肢及会阴部淋巴。' });
        for (const smx of [0.038, 0.055]) { addNode(this.lymphGroup, new T.SphereGeometry(0.0024, 8, 8), 0x34d399, pos(sgn * smx, 0.878, 0.058), { name: `${side}下颌下淋巴结群 · Submandibular Nodes`, system: '淋巴系统', desc: '位于下颌骨体下方，收集面部、口腔、鼻腔及舌前部淋巴回流。' }); }
      const cPts: T.Vector3[] = []; for (let ci = 0; ci < 7; ci++) { const cy = 0.868 - ci * 0.01; const cx = sgn * (0.062 + ci * 0.0025); const cz = 0.015 + (ci % 2) * 0.012; const cp = pos(cx, cy, cz); cPts.push(cp); addNode(this.lymphGroup, new T.SphereGeometry(0.0024, 8, 8), 0x22c55e, cp, { name: `${side}颈前/颈外侧浅深淋巴结链 · Cervical Lymph Nodes`, system: '淋巴系统', desc: '沿颈内外静脉串联排列（每侧6-8枚），汇集头颈部淋巴并经颈干注入静脉角。' }); } addTube(this.lymphGroup, cPts, 0.0014, 0x4ade80, { name: `${side}颈干 · Jugular Trunk`, system: '淋巴系统', desc: '由颈外侧深淋巴结输出管汇合而成，分别注入胸导管或右淋巴导管。' });
      const axOffsets: [number, number, number][] = [[0.185, 0.76, 0.025], [0.20, 0.75, 0.035], [0.215, 0.74, 0.015], [0.23, 0.735, -0.01], [0.195, 0.77, 0.01], [0.175, 0.785, 0.02]]; for (const [ax, ay, az] of axOffsets) { addNode(this.lymphGroup, new T.SphereGeometry(0.0026, 8, 8), 0x22c55e, pos(sgn * ax, ay, az), { name: `${side}腋窝淋巴结群 · Axillary Lymph Nodes`, system: '淋巴系统', desc: '分胸肌、外侧、肩胛下、中央与尖群（6枚），引流上肢、胸壁及乳房淋巴。' }); } addTube(this.lymphGroup, [pos(sgn * 0.22, 0.74, 0.02), pos(sgn * 0.175, 0.785, 0.02), pos(sgn * 0.055, 0.808, 0.025)], 0.0015, 0x4ade80, { name: `${side}锁骨下干 · Subclavian Trunk`, system: '淋巴系统', desc: '收集腋窝尖淋巴结输出管，引流上肢及胸壁淋巴至静脉角。' });
      addNode(this.lymphGroup, new T.SphereGeometry(0.0024, 8, 8), 0x34d399, pos(sgn * 0.272, 0.605, 0.008), { name: `${side}肘窝滑车上淋巴结 · Cubital / Epitrochlear Nodes`, system: '淋巴系统', desc: '位于肱骨内上髁上方肘窝内侧，引流前臂尺侧与手掌内侧淋巴。' }); addTube(this.lymphGroup, [pos(sgn * 0.31, 0.50, 0.015), pos(sgn * 0.272, 0.605, 0.008), pos(sgn * 0.23, 0.735, -0.01)], 0.0012, 0x34d399, { name: `${side}上肢淋巴管 · Upper Limb Lymphatics`, system: '淋巴系统', desc: '沿贵要静脉与肱静脉上行汇入腋窝淋巴结群。' });
      const lumPts: T.Vector3[] = []; for (const ly of [0.56, 0.59, 0.62]) { const lp = pos(sgn * 0.028, ly, -0.025); lumPts.push(lp); addNode(this.lymphGroup, new T.SphereGeometry(0.0025, 8, 8), 0x22c55e, lp, { name: `${side}腹主动脉旁腰淋巴结链 · Para-aortic Lumbar Nodes`, system: '淋巴系统', desc: '沿腹主动脉及下腔静脉排列，收纳盆腔、下肢及腹膜后器官淋巴。' }); } lumPts.push(pos(0.01, 0.56, -0.04)); addTube(this.lymphGroup, lumPts, 0.0016, 0x4ade80, { name: `${side}腰干 · Lumbar Trunk`, system: '淋巴系统', desc: '由腰淋巴结输出管汇合而成，向上注入乳糜池。' });
      const ilPts: T.Vector3[] = [pos(sgn * 0.085, 0.505, 0.02), pos(sgn * 0.065, 0.522, 0.005), pos(sgn * 0.045, 0.542, -0.015)]; ilPts.forEach((ip, idx) => addNode(this.lymphGroup, new T.SphereGeometry(0.0025, 8, 8), 0x34d399, ip, { name: `${side}${['髂外','髂内','髂总'][idx]}淋巴结链 · Iliac Lymph Nodes`, system: '淋巴系统', desc: '沿髂外、髂内与髂总血管分布，向上汇入腰淋巴结链。' })); addTube(this.lymphGroup, [ilPts[0], ilPts[1], ilPts[2], pos(sgn * 0.028, 0.56, -0.025)], 0.0014, 0x4ade80, { name: `${side}髂淋巴干 · Iliac Lymphatic Chain`, system: '淋巴系统', desc: '连接下肢腹股沟淋巴结与腰淋巴结的主干通道。' });
      const ingT: [number, number, number][] = [[0.095, 0.498, 0.135], [0.12, 0.495, 0.14], [0.145, 0.492, 0.13], [0.12, 0.475, 0.135], [0.118, 0.455, 0.128]]; for (const [ix, iy, iz] of ingT) { addNode(this.lymphGroup, new T.SphereGeometry(0.0026, 8, 8), 0x22c55e, pos(sgn * ix, iy, iz), { name: `${side}腹股沟浅/深淋巴结群 · Inguinal Nodes (T形)`, system: '淋巴系统', desc: '呈T形分布于腹股沟韧带下方及大隐静脉末端（5枚），引流下肢、会阴及下腹壁淋巴。' }); }
      addNode(this.lymphGroup, new T.SphereGeometry(0.0024, 8, 8), 0x34d399, pos(sgn * 0.155, 0.28, -0.03), { name: `${side}腘窝淋巴结群 · Popliteal Lymph Nodes`, system: '淋巴系统', desc: '位于腘窝深部脂肪内，收纳小腿及足外侧淋巴回流。' }); addTube(this.lymphGroup, [pos(sgn * 0.148, 0.08, -0.01), pos(sgn * 0.155, 0.28, -0.03), pos(sgn * 0.12, 0.475, 0.135), ilPts[0]], 0.0014, 0x34d399, { name: `${side}下肢深淋巴管干 · Lower Limb Deep Lymphatics`, system: '淋巴系统', desc: '经腘窝淋巴结上行汇入腹股沟深/浅淋巴结及髂外淋巴结。' });
      if (sgn === 1) { addNode(this.lymphGroup, new T.SphereGeometry(0.0024, 8, 8), 0x34d399, pos(0, 0.875, 0.075), { name: '颏下淋巴结 · Submental Nodes', system: '淋巴系统', desc: '位于下颌联合下方，收集下唇、颏部及舌尖淋巴。' }); for (const my of [0.755, 0.735, 0.715]) { addNode(this.lymphGroup, new T.SphereGeometry(0.0026, 8, 8), 0x22c55e, pos(0.018, my, 0.015), { name: '纵隔淋巴结群（气管支气管旁）· Mediastinal Nodes', system: '淋巴系统', desc: '分布于气管两侧及支气管分叉周围，引流肺、支气管及纵隔淋巴。' }); addNode(this.lymphGroup, new T.SphereGeometry(0.0026, 8, 8), 0x22c55e, pos(-0.018, my, 0.015), { name: '纵隔淋巴结群（气管支气管旁）· Mediastinal Nodes', system: '淋巴系统', desc: '分布于气管两侧及支气管分叉周围，引流肺、支气管及纵隔淋巴。' }); } addNode(this.lymphGroup, new T.SphereGeometry(0.003, 8, 8), 0x34d399, pos(0.01, 0.615, 0.055), { name: '肠系膜上淋巴结群 · Superior Mesenteric Nodes', system: '淋巴系统', desc: '沿肠系膜上动脉排列，收集小肠乳糜管及升结肠淋巴汇入乳糜池。' }); addNode(this.lymphGroup, new T.SphereGeometry(0.0028, 8, 8), 0x34d399, pos(0.015, 0.568, 0.05), { name: '肠系膜下淋巴结群 · Inferior Mesenteric Nodes', system: '淋巴系统', desc: '沿肠系膜下动脉排列，收集降结肠、乙状结肠及直肠上部淋巴。' }); addTube(this.lymphGroup, [pos(0.01, 0.615, 0.055), pos(0.01, 0.585, 0.01), pos(0.01, 0.56, -0.04)], 0.0016, 0x4ade80, { name: '肠干 · Intestinal Trunk', system: '淋巴系统', desc: '汇集胃肠道乳糜淋巴液注入乳糜池。' }); }
      } addNode(this.endoGroup, new T.SphereGeometry(0.0035, 12, 12), 0xf43f5e, pos(0, 0.925, 0.07), { name: '脑垂体 · Pituitary Gland', system: '内分泌系统', desc: '位于蝶鞍垂体窝内，分泌生长激素、促甲状腺激素等，为内分泌调控中枢。' }); addNode(this.endoGroup, new T.SphereGeometry(0.0028, 10, 10), 0xfb7185, pos(0, 0.935, -0.02), { name: '松果体 · Pineal Gland', system: '内分泌系统', desc: '位于丘脑后上方，分泌褪黑素调节昼夜节律。' });
  for (const sgn of [-1, 1]) {
      const side = sgn > 0 ? '左' : '右';
      addNode(this.endoGroup, new T.SphereGeometry(0.0022, 8, 8), 0xf59e0b, pos(sgn * 0.028, 0.835, 0.01), { name: `${side}侧甲状旁腺`, system: '内分泌系统', desc: '位于甲状腺侧叶后面，分泌甲状旁腺素调节血钙平衡。' });
      addNode(this.endoGroup, new T.ConeGeometry(0.007, 0.011, 10), 0xf97316, pos(sgn * 0.095, 0.625, -0.05), { name: `${side}侧肾上腺 · Adrenal`, system: '内分泌系统', desc: '位于肾脏上方，皮质分泌皮质醇/醛固酮，髓质分泌肾上腺素。' });
    }
    // Connective / Fascia / Ligaments (smooth anatomical TubeGeometry curves)
    for (const sgn of [-1, 0, 1]) {
      addTube(this.connGroup, [pos(sgn * 0.05, 0.68, -0.115), pos(sgn * 0.08, 0.61, -0.125), pos(sgn * 0.04, 0.54, -0.115)], 0.005, 0xe2e8f0, { name: '胸腰筋膜 · Thoracolumbar Fascia', system: '结缔组织与筋膜', desc: '覆盖腰背深层肌群的致密纤维膜，连接背阔肌与腹横肌，稳定腰椎。' }, { opacity: 0.72 });
    }
    addTube(this.connGroup, [pos(0, 0.90, -0.09), pos(0, 0.86, -0.095), pos(0, 0.82, -0.09)], 0.0032, 0xcbd5e1, { name: '项韧带 · Nuchal Ligament', system: '结缔组织与韧带', desc: '位于颈椎棘突后方的矢状位弹性纤维膜，协助维持头部直立姿势。' }, { opacity: 0.85 });
    addTube(this.connGroup, [pos(0, 0.81, 0.03), pos(0, 0.68, 0.035), pos(0, 0.54, 0.03)], 0.0036, 0xe2e8f0, { name: '脊柱前纵韧带 · Anterior Longitudinal Ligament', system: '结缔组织与韧带', desc: '纵行于椎体与椎间盘前面，上起枕骨基底部，下至骶骨前面，限制脊柱过度后伸。' }, { opacity: 0.86 }); addTube(this.connGroup, [pos(0, 0.81, -0.09), pos(0, 0.68, -0.095), pos(0, 0.54, -0.085)], 0.003, 0xcbd5e1, { name: '脊柱棘上韧带 · Supraspinous Ligament', system: '结缔组织与韧带', desc: '连结胸腰椎各棘突尖端的强韧纵行纤维索，向上延续为项韧带，限制脊柱过度前屈。' }, { opacity: 0.85 }); for (const sgn of [-1, 1]) {
      const side = sgn > 0 ? '左' : '右'; addTube(this.connGroup, [pos(sgn * 0.22, 0.785, 0.01), pos(sgn * 0.24, 0.77, 0.015), pos(sgn * 0.25, 0.755, 0.005)], 0.0055, 0xf1f5f9, { name: `${side}侧肩关节囊 · Shoulder Joint Capsule`, system: '结缔组织与韧带', desc: '包绕肩胛骨关节盂与肱骨头之间的薄而松弛关节囊，赋予肩关节极大活动度。' }, { opacity: 0.65 }); addTube(this.connGroup, [pos(sgn * 0.19, 0.79, 0.035), pos(sgn * 0.215, 0.795, 0.015), pos(sgn * 0.24, 0.79, -0.005)], 0.0024, 0xe2e8f0, { name: `${side}侧喙肩韧带 · Coracoacromial Ligament`, system: '结缔组织与韧带', desc: '架于喙突与肩峰之间的强韧三角形韧带，构成喙肩弓以防止肱骨头向上脱位。' }, { opacity: 0.88 }); addTube(this.connGroup, [pos(sgn * 0.19, 0.79, 0.03), pos(sgn * 0.185, 0.805, 0.025), pos(sgn * 0.18, 0.818, 0.02)], 0.0024, 0xcbd5e1, { name: `${side}侧喙锁韧带 · Coracoclavicular Ligament`, system: '结缔组织与韧带', desc: '连结锁骨外侧端下面与肩胛骨喙突，是悬吊上肢、维持肩锁关节稳定的关键韧带。' }, { opacity: 0.88 }); addTube(this.connGroup, [pos(sgn * 0.275, 0.625, 0.0), pos(sgn * 0.278, 0.608, -0.005), pos(sgn * 0.28, 0.59, -0.01)], 0.0022, 0xe2e8f0, { name: `${side}侧肘关节尺侧副韧带 · Ulnar Collateral Ligament`, system: '结缔组织与韧带', desc: '位于肘关节内侧，连结肱骨内上髁与尺骨滑车切迹内侧缘，防止肘外翻。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.31, 0.625, 0.005), pos(sgn * 0.313, 0.608, 0.005), pos(sgn * 0.315, 0.59, 0.0)], 0.0022, 0xe2e8f0, { name: `${side}侧肘关节桡侧副韧带 · Radial Collateral Ligament`, system: '结缔组织与韧带', desc: '位于肘关节外侧，起自肱骨外上髁向下附着于桡骨环状韧带，防止肘内翻。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.30, 0.602, 0.012), pos(sgn * 0.315, 0.602, 0.0), pos(sgn * 0.30, 0.602, -0.012)], 0.002, 0xf8fafc, { name: `${side}侧桡骨环状韧带 · Annular Ligament`, system: '结缔组织与韧带', desc: '环绕桡骨头并附着于尺骨桡切迹前后缘，固定桡骨头并允许前臂旋前旋后。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.17, 0.51, 0.055), pos(sgn * 0.185, 0.485, 0.05), pos(sgn * 0.20, 0.46, 0.04)], 0.0032, 0xf1f5f9, { name: `${side}侧髋关节髂股韧带 · Iliofemoral Ligament`, system: '结缔组织与韧带', desc: '呈倒Y字形位于髋关节前方，人体最坚韧的韧带之一，限制髋关节过度后伸。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.09, 0.47, 0.065), pos(sgn * 0.135, 0.465, 0.055), pos(sgn * 0.175, 0.46, 0.045)], 0.0026, 0xe2e8f0, { name: `${side}侧髋关节耻股韧带 · Pubofemoral Ligament`, system: '结缔组织与韧带', desc: '起自耻骨上支与闭孔嵴，向外下方附着于髋关节囊下部，限制髋关节过度外展与外旋。' }, { opacity: 0.88 }); addTube(this.connGroup, [pos(sgn * 0.125, 0.295, 0.01), pos(sgn * 0.122, 0.275, 0.01), pos(sgn * 0.125, 0.252, 0.008)], 0.0026, 0xe2e8f0, { name: `${side}侧膝关节内侧副韧带 · MCL`, system: '结缔组织与韧带', desc: '宽扁带状韧带，连结股骨内上髁与胫骨内侧髁，防止膝外翻及胫骨过度外旋。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.185, 0.292, 0.0), pos(sgn * 0.188, 0.272, -0.005), pos(sgn * 0.185, 0.252, -0.01)], 0.0024, 0xe2e8f0, { name: `${side}侧膝关节外侧副韧带 · LCL`, system: '结缔组织与韧带', desc: '圆索状强韧纤维束，起自股骨外上髁止于腓骨头，防止膝内翻。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.155, 0.285, 0.045), pos(sgn * 0.155, 0.268, 0.046), pos(sgn * 0.155, 0.248, 0.042)], 0.0034, 0xf8fafc, { name: `${side}侧髌韧带 · Patellar Ligament`, system: '结缔组织与韧带', desc: '股四头肌腱向下延续，起自髌骨尖止于胫骨粗隆，传递伸膝力量。' }, { opacity: 0.92 }); addTube(this.connGroup, [pos(sgn * 0.125, 0.072, 0.005), pos(sgn * 0.122, 0.055, 0.01), pos(sgn * 0.125, 0.042, 0.015)], 0.0026, 0xe2e8f0, { name: `${side}侧踝关节三角韧带 · Deltoid Ligament`, system: '结缔组织与韧带', desc: '呈三角形位于踝关节内侧，连结内踝与距骨、跟骨及足舟骨，防止足过度外翻。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.175, 0.068, -0.005), pos(sgn * 0.178, 0.052, 0.008), pos(sgn * 0.172, 0.042, 0.02)], 0.0023, 0xcbd5e1, { name: `${side}侧踝关节外侧副韧带 · Lateral Ligament`, system: '结缔组织与韧带', desc: '包括距腓前/后韧带与跟腓韧带，连结外踝与距骨跟骨，维持踝关节外侧稳定。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.045, 0.515, -0.085), pos(sgn * 0.075, 0.49, -0.075), pos(sgn * 0.10, 0.465, -0.065)], 0.0026, 0xdbeafe, { name: `${side}侧骶结节韧带 · Sacrotuberous Ligament`, system: '结缔组织与韧带', desc: '起自骶尾骨外侧缘与髂后下棘，斜向外下止于坐骨结节内侧缘，稳定骨盆并围成坐骨大/小孔。' }, { opacity: 0.88 }); addTube(this.connGroup, [pos(sgn * 0.045, 0.495, -0.075), pos(sgn * 0.07, 0.485, -0.068), pos(sgn * 0.095, 0.478, -0.058)], 0.0023, 0xcbd5e1, { name: `${side}侧骶棘韧带 · Sacrospinous Ligament`, system: '结缔组织与韧带', desc: '位于骶结节韧带深面，连结骶尾骨外侧缘与坐骨棘，分隔坐骨大孔与坐骨小孔。' }, { opacity: 0.88 });
      addTube(this.connGroup, [pos(sgn * 0.21, 0.49, 0.01), pos(sgn * 0.22, 0.39, 0.0), pos(sgn * 0.19, 0.29, 0.01)], 0.0045, 0xdbeafe, { name: `${side}侧髂胫束 · Iliotibial Band`, system: '结缔组织与筋膜', desc: '大腿外侧阔筋膜增厚形成的强韧纤维带，起自髂嵴止于胫骨外侧髁。' }, { opacity: 0.82 });
      addTube(this.connGroup, [pos(sgn * 0.31, 0.48, 0.025), pos(sgn * 0.33, 0.475, 0.03), pos(sgn * 0.35, 0.48, 0.025)], 0.0025, 0xe2e8f0, { name: `${side}侧腕横韧带 · Flexor Retinaculum`, system: '结缔组织与韧带', desc: '跨越腕骨掌侧形成腕管顶部，保护正中神经及屈肌腱。' }, { opacity: 0.88 });
      addTube(this.connGroup, [pos(sgn * 0.19, 0.52, 0.09), pos(sgn * 0.12, 0.49, 0.125), pos(sgn * 0.05, 0.47, 0.135)], 0.0028, 0xf1f5f9, { name: `${side}侧腹股沟韧带 · Inguinal Ligament`, system: '结缔组织与韧带', desc: '起自髂前上棘止于耻骨结节，构成腹股沟管下壁与股三角上界。' }, { opacity: 0.88 });
      addTube(this.connGroup, [pos(sgn * 0.145, 0.29, -0.01), pos(sgn * 0.155, 0.275, 0.01), pos(sgn * 0.165, 0.26, 0.025)], 0.0022, 0xf8fafc, { name: `${side}侧前交叉韧带 · ACL`, system: '结缔组织与韧带', desc: '起自股骨外侧髁内侧面，斜向前下止于胫骨髁间前区，防止胫骨前移。' }, { opacity: 0.92 });
      addTube(this.connGroup, [pos(sgn * 0.165, 0.29, 0.015), pos(sgn * 0.155, 0.275, -0.005), pos(sgn * 0.145, 0.26, -0.02)], 0.0022, 0xe2e8f0, { name: `${side}侧后交叉韧带 · PCL`, system: '结缔组织与韧带', desc: '起自股骨内侧髁外侧面，斜向后下止于胫骨髁间后区，防止胫骨后移。' }, { opacity: 0.92 });
      addTube(this.connGroup, [pos(sgn * 0.15, 0.14, -0.045), pos(sgn * 0.15, 0.09, -0.052), pos(sgn * 0.15, 0.04, -0.055)], 0.0036, 0xf1f5f9, { name: `${side}侧跟腱 · Achilles Tendon`, system: '结缔组织与韧带', desc: '人体最粗壮的肌腱，由腓肠肌与比目鱼肌腱向下融合止于跟骨结节。' }, { opacity: 0.9 });
        addTube(this.connGroup, [pos(sgn * 0.11, 0.905, 0.02), pos(sgn * 0.10, 0.892, 0.03), pos(sgn * 0.095, 0.882, 0.025)], 0.002, 0xf1f5f9, { name: `${side}颞下颌韧带 · Temporomandibular Ligament`, system: '结缔组织与韧带', desc: '位于颞下颌关节外侧，起自颧弓下缘止于下颌颈外侧，限制下颌过度后退与脱位。' }, { opacity: 0.9 }); for (const ty of [0.76, 0.72, 0.68, 0.64]) { addTube(this.connGroup, [pos(sgn * 0.03, ty, -0.065), pos(sgn * 0.06, ty - 0.003, -0.072), pos(sgn * 0.09, ty - 0.006, -0.075)], 0.0018, 0xcbd5e1, { name: `${side}肋横突/肋椎韧带 · Costotransverse & Costovertebral Ligaments`, system: '结缔组织与韧带', desc: '连结胸椎横突/椎体与肋骨结节及肋头，稳固肋椎关节并协助呼吸运动。' }, { opacity: 0.86 }); } addTube(this.connGroup, [pos(sgn * 0.02, 0.805, 0.065), pos(sgn * 0.035, 0.808, 0.063), pos(sgn * 0.05, 0.81, 0.06)], 0.0022, 0xe2e8f0, { name: `${side}胸锁前/后韧带 · Sternoclavicular Ligaments`, system: '结缔组织与韧带', desc: '包绕并加固胸锁关节前后面，限制锁骨过度上下及前后移位。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.045, 0.79, 0.055), pos(sgn * 0.052, 0.799, 0.054), pos(sgn * 0.06, 0.808, 0.052)], 0.0022, 0xf1f5f9, { name: `${side}肋锁韧带 · Costoclavicular Ligament`, system: '结缔组织与韧带', desc: '起自第一肋软骨上面止于锁骨内侧端下面，是稳定胸锁关节的最强韧带。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.05, 0.52, -0.02), pos(sgn * 0.07, 0.518, -0.025), pos(sgn * 0.09, 0.515, -0.03)], 0.0024, 0xe2e8f0, { name: `${side}骶髂前韧带 · Anterior Sacroiliac Ligament`, system: '结缔组织与韧带', desc: '覆盖骶髂关节前面，连结骶骨前面与髂骨耳状面前缘，维持骨盆环前侧稳定。' }, { opacity: 0.88 }); addTube(this.connGroup, [pos(sgn * 0.045, 0.525, -0.085), pos(sgn * 0.065, 0.522, -0.082), pos(sgn * 0.085, 0.518, -0.08)], 0.0026, 0xcbd5e1, { name: `${side}骶髂后韧带 · Posterior Sacroiliac Ligament`, system: '结缔组织与韧带', desc: '强韧纤维束连结骶骨背面与髂后上棘，承受躯干重力并防止骶骨前倾。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.11, 0.465, -0.045), pos(sgn * 0.155, 0.47, -0.035), pos(sgn * 0.19, 0.475, -0.02)], 0.0028, 0xf1f5f9, { name: `${side}坐骨股骨韧带 · Ischiofemoral Ligament`, system: '结缔组织与韧带', desc: '起自坐骨体后上方，螺旋状斜向外上止于股骨大转子基底部，限制髋关节内旋与过伸。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.135, 0.275, -0.025), pos(sgn * 0.155, 0.285, -0.028), pos(sgn * 0.175, 0.295, -0.022)], 0.0024, 0xe2e8f0, { name: `${side}腘斜韧带 · Oblique Popliteal Ligament`, system: '结缔组织与韧带', desc: '半膜肌腱延续至膝关节后壁，斜向外上止于股骨外侧髁，配合胫侧/腓侧副韧带防止膝过伸。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.31, 0.49, 0.022), pos(sgn * 0.325, 0.482, 0.025), pos(sgn * 0.34, 0.475, 0.028)], 0.002, 0xf8fafc, { name: `${side}腕掌/腕背韧带 · Palmar & Dorsal Radiocarpal Ligaments`, system: '结缔组织与韧带', desc: '连结桡骨下端与近侧列腕骨掌背面，稳固桡腕关节并限制腕部过度屈伸。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.345, 0.445, 0.02), pos(sgn * 0.35, 0.435, 0.021), pos(sgn * 0.355, 0.425, 0.022)], 0.0018, 0xcbd5e1, { name: `${side}掌指侧副韧带 · MCP Collateral Ligaments`, system: '结缔组织与韧带', desc: '位于掌指关节两侧，屈曲时紧张、伸直时松弛，防止手指过度侧偏。' }, { opacity: 0.88 }); addTube(this.connGroup, [pos(sgn * 0.14, 0.022, -0.02), pos(sgn * 0.145, 0.018, 0.04), pos(sgn * 0.15, 0.016, 0.08)], 0.0024, 0xf1f5f9, { name: `${side}足底长/短韧带 · Long & Short Plantar Ligaments`, system: '结缔组织与韧带', desc: '连结跟骨与骰骨及跖骨基底，是维持足外侧纵弓的关键深层韧带。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(sgn * 0.14, 0.012, -0.03), pos(sgn * 0.145, 0.01, 0.05), pos(sgn * 0.155, 0.008, 0.12)], 0.0032, 0xdbeafe, { name: `${side}跖腱膜 · Plantar Aponeurosis`, system: '结缔组织与筋膜', desc: '覆盖足底的致密三角形纤维膜，起自跟骨结节止于各趾，维持足弓并缓冲步态冲击。' }, { opacity: 0.85 }); addTube(this.connGroup, [pos(sgn * 0.295, 0.60, 0.005), pos(sgn * 0.315, 0.54, 0.01), pos(sgn * 0.325, 0.495, 0.012)], 0.0036, 0x93c5fd, { name: `${side}前臂骨间膜 · Forearm Interosseous Membrane`, system: '结缔组织与筋膜', desc: '连接尺骨与桡骨骨间嵴的坚韧纤维膜，将腕部冲击力传导至尺骨与肱骨。' }, { opacity: 0.72 }); addTube(this.connGroup, [pos(sgn * 0.148, 0.25, 0.005), pos(sgn * 0.15, 0.17, 0.004), pos(sgn * 0.148, 0.09, 0.005)], 0.0036, 0x93c5fd, { name: `${side}小腿骨间膜 · Crural Interosseous Membrane`, system: '结缔组织与筋膜', desc: '连接胫骨与腓骨骨间嵴的强韧纤维膜，分隔小腿前后肌群并稳固下胫腓联合。' }, { opacity: 0.72 });
    } for (const vy of [0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.56]) { addTube(this.connGroup, [pos(0, vy, -0.068), pos(0, vy - 0.028, -0.068)], 0.0024, 0xfef08a, { name: '黄韧带 · Ligamentum Flavum', system: '结缔组织与韧带', desc: '连结相邻椎弓板的弹性纤维韧带，呈淡黄色，构成椎管后壁并协助脊柱伸直。' }, { opacity: 0.9 }); addTube(this.connGroup, [pos(0, vy, -0.085), pos(0, vy - 0.028, -0.085)], 0.002, 0xe2e8f0, { name: '棘间韧带 · Interspinous Ligament', system: '结缔组织与韧带', desc: '连结相邻椎骨棘突之间的薄层韧带，限制脊柱过度前屈。' }, { opacity: 0.88 }); }
    this.lymphGroup.clear(); this.ligGroup.clear(); this.extraHitTargets = []; this.extraCatalog = []; this.extraCatalogSent = false; const lymph = buildFullLymphaticSystem(bodyBox, 'male'); this.lymphGroup.add(lymph.group); this.extraHitTargets.push(...lymph.hitTargets); this.extraCatalog.push(...lymph.metas); const lig = buildFullLigamentSystem(bodyBox, 'male'); this.ligGroup.add(lig.group); this.extraHitTargets.push(...lig.hitTargets); this.extraCatalog.push(...lig.metas); for (const ht of this.extraHitTargets) { ht.renderOrder = 998; const mat = (ht as any).material; if (mat) { mat.depthTest = false; } }
    
    /*
      this.extraGroup.clear();
    const minY = bodyBox.isEmpty() ? 0 : bodyBox.min.y;
    const spanY = Math.max(0.5, bodyBox.isEmpty() ? 1.7 : bodyBox.max.y - bodyBox.min.y);
    const c = bodyBox.isEmpty() ? new T.Vector3(0, 0.85, 0) : bodyBox.getCenter(new T.Vector3());
    const sz = bodyBox.isEmpty() ? new T.Vector3(0.5, 1.7, 0.28) : bodyBox.getSize(new T.Vector3());
    const pos = (rx: number, ry: number, rz: number) => new T.Vector3(c.x + rx * sz.x, minY + ry * spanY, c.z + rz * sz.z);
    const addNode = (geo: T.BufferGeometry, color: number, p: T.Vector3, info: { name: string; system: string; desc: string }, opacity = 0.9) => {
      const m = new T.Mesh(geo, new T.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.4, transparent: opacity < 1, opacity }));
      m.position.copy(p);
      m.userData = { extraInfo: info };
      this.extraGroup.add(m);
    };

    // Lymphatic: Thoracic duct + Cisterna chyli + Cervical/Axillary/Inguinal nodes
    const ductPts = [pos(0.01, 0.56, -0.04), pos(0.01, 0.65, -0.05), pos(-0.015, 0.74, -0.04), pos(-0.055, 0.81, 0.03)];
    const ductMesh = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(ductPts), 24, 0.0032, 8, false), new T.MeshPhysicalMaterial({ color: 0x4ade80, emissive: 0x16a34a, emissiveIntensity: 0.25, roughness: 0.3 }));
    ductMesh.userData = { extraInfo: { name: '胸导管 · Thoracic Duct', system: '淋巴系统', desc: '人体最大淋巴导管，起自乳糜池，沿脊柱前方上行注入左静脉角，收集下半身及左上身淋巴液。' } };
    this.extraGroup.add(ductMesh);
    addNode(new T.SphereGeometry(0.008, 12, 12), 0x4ade80, pos(0.01, 0.56, -0.04), { name: '乳糜池 · Cisterna Chyli', system: '淋巴系统', desc: '位于第1–2腰椎前方，汇集左右腰干与肠干淋巴液，向上续为胸导管。' });
    for (const sgn of [-1, 1]) {
      const side = sgn > 0 ? '左' : '右';
      addNode(new T.SphereGeometry(0.0055, 10, 10), 0x22c55e, pos(sgn * 0.07, 0.84, 0.02), { name: `${side}侧颈深淋巴结群`, system: '淋巴系统', desc: '沿颈内静脉排列，收集头颈部淋巴回流，临床常用于头颈炎症与肿瘤分期触诊。' });
      addNode(new T.SphereGeometry(0.007, 10, 10), 0x22c55e, pos(sgn * 0.22, 0.74, 0.02), { name: `${side}侧腋窝淋巴结群`, system: '淋巴系统', desc: '分外侧、胸肌、肩胛下、中央与尖群，收集上肢、胸壁及乳腺淋巴回流。' });
      addNode(new T.SphereGeometry(0.0065, 10, 10), 0x22c55e, pos(sgn * 0.12, 0.49, 0.14), { name: `${side}侧腹股沟淋巴结群`, system: '淋巴系统', desc: '位于腹股沟韧带下方与大隐静脉末端，收集下肢、会阴及下腹壁淋巴液。' });
    }

    // Endocrine: Pituitary, Pineal, Parathyroids, Adrenals
    addNode(new T.SphereGeometry(0.006, 12, 12), 0xc084fc, pos(0, 0.925, 0.05), { name: '脑垂体 · Pituitary Gland', system: '内分泌系统', desc: '位于蝶骨垂体窝（蝶鞍）内，分泌生长激素、促甲状腺素等多种核心内分泌激素。' });
    addNode(new T.SphereGeometry(0.0045, 10, 10), 0xa855f7, pos(0, 0.935, -0.03), { name: '松果体 · Pineal Gland', system: '内分泌系统', desc: '位于上丘间凹陷处，分泌褪黑素调节昼夜节律与睡眠周期。' });
    for (const sgn of [-1, 1]) {
      const side = sgn > 0 ? '左' : '右';
      addNode(new T.SphereGeometry(0.0032, 8, 8), 0xd8b4fe, pos(sgn * 0.03, 0.825, 0.06), { name: `${side}侧甲状旁腺`, system: '内分泌系统', desc: '位于甲状腺侧叶后方，分泌甲状旁腺素（PTH）精密调节血钙与血磷平衡。' });
      addNode(new T.ConeGeometry(0.011, 0.016, 10), 0xe879f9, pos(sgn * 0.085, 0.62, -0.05), { name: `${side}侧肾上腺 · Adrenal Gland`, system: '内分泌系统', desc: '位于肾脏上极内上方，皮质分泌糖/盐皮质激素，髓质分泌肾上腺素与去甲肾上腺素。' });
    }

    // Connective tissue: Thoracolumbar fascia, Iliotibial bands, Nuchal ligament, Flexor retinaculum
    addNode(new T.BoxGeometry(sz.x * 0.24, spanY * 0.12, 0.006), 0xe2e8f0, pos(0, 0.59, -0.22), { name: '胸腰筋膜 · Thoracolumbar Fascia', system: '结缔筋膜系统', desc: '腰背部致密多层腱膜结构，包裹竖脊肌并连接背阔肌与腹横肌，维系躯干核心稳定。' }, 0.65);
    addNode(new T.BoxGeometry(0.008, spanY * 0.08, 0.018), 0xcbd5e1, pos(0, 0.86, -0.18), { name: '项韧带 · Nuchal Ligament', system: '结缔筋膜系统', desc: '起自枕外隆凸至第7颈椎棘突，限制颈椎过度前屈并为斜方肌、夹肌提供附着。' }, 0.78);
    for (const sgn of [-1, 1]) {
      const side = sgn > 0 ? '左' : '右';
      addNode(new T.BoxGeometry(0.01, spanY * 0.24, 0.022), 0xe2e8f0, pos(sgn * 0.21, 0.38, 0.01), { name: `${side}侧髂胫束 · Iliotibial Band`, system: '结缔筋膜系统', desc: '阔筋膜外侧增厚纵行纤维带，起自髂嵴止于胫骨外侧髁，稳定髋膝关节外侧。' }, 0.65);
      addNode(new T.BoxGeometry(0.026, 0.014, 0.008), 0xcbd5e1, pos(sgn * 0.44, 0.49, 0.04), { name: `${side}侧腕横韧带 · Flexor Retinaculum`, system: '结缔筋膜系统', desc: '跨过腕骨沟构成腕管顶壁，保护正中神经与屈指肌腱。' }, 0.78);
    }
  }
    */
  }

  tick(opts: {
    ready: boolean;
    sex: string;
    state: any;
    amount: number;
    atlas: any;
    pickers: any[];
    bounds: T.Box3[];
    sysMats: Record<string, any>;
  }): boolean {
    let dirty = false;
    const { ready, sex, state: s, amount, atlas, pickers, bounds, sysMats } = opts;
    this.tapCb = s.onAcupointTap || null;
    this.extraCb = s.onExtraTap || null; this.boneQuizMode = !!s.boneQuizMode; this.quizTargetName = String(s.boneQuizTarget || '');
if (!this.extraCatalogSent && this.extraCatalog.length && s.onExtraCatalog) { this.extraCatalogSent = true; s.onExtraCatalog(this.extraCatalog); } this.ligGroup.visible = !!(s.showLigaments ?? s.showConnective); const exp = Number(s.explode ?? amount ?? 0); const applyExp = (g: T.Group) => g.traverse((o: any) => { if (o.userData?.explodeOffset) { if (!o.userData.basePos) o.userData.basePos = o.position.clone(); o.position.copy(o.userData.basePos).addScaledVector(o.userData.explodeOffset, exp); } }); applyExp(this.lymphGroup); applyExp(this.ligGroup); const fid = String(s.focusExtraId || ''); if (fid && fid !== this.lastFocusExtraId) { this.lastFocusExtraId = fid; let targetObj: any = this.extraHitTargets.find((o: any) => o.userData?.extraInfo?.id === fid || o.userData?.id === fid); if (!targetObj) { this.extraGroup.traverse((o: any) => { if (!targetObj && (o.userData?.extraInfo?.id === fid || o.userData?.id === fid)) targetObj = o; }); } if (targetObj) { const wp = new T.Vector3(); targetObj.getWorldPosition(wp); this.flyCamTarget = wp.clone(); this.flyCamPos = wp.clone().add(new T.Vector3(0, 0.06, 0.42)); if (!this.highlightMesh) { this.highlightMesh = new T.Mesh(new T.SphereGeometry(0.016, 16, 16), new T.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.75, depthTest: false })); this.highlightMesh.renderOrder = 999; this.handles.scene.add(this.highlightMesh); } this.highlightMesh.position.copy(wp); this.highlightMesh.visible = true; const info = targetObj.userData?.extraInfo || this.extraCatalog.find((m) => m.id === fid); if (info) this.extraCb?.(info); } } if (this.flyCamTarget && this.flyCamPos) { this.handles.camera.position.lerp(this.flyCamPos, 0.12); if (this.handles.controls?.target) this.handles.controls.target.lerp(this.flyCamTarget, 0.12); if (this.handles.camera.position.distanceTo(this.flyCamPos) < 0.005) { this.flyCamPos = null; this.flyCamTarget = null; } dirty = true; }
    
    const nx = !!s.needleXray;
    if (nx !== this.lastXray) {
      this.lastXray = nx;
      for (const k of ['muscular', 'integumentary']) {
        const mat = sysMats[k];
        if (mat) {
          mat.transparent = nx;
          mat.opacity = nx ? 0.22 : 1;
          mat.depthWrite = !nx;
          mat.needsUpdate = true;
        }
      }
      dirty = true;
    }

    const bodyBox = new T.Box3();
    if (ready) {
      bounds.forEach((b, idx) => {
        if (atlas.parts[idx]?.system !== 'integumentary') bodyBox.union(b);
      });
    }

    const extraKey = (ready ? 'R' : 'W') + '|' + (sex || 'm');
    if (ready && extraKey !== this.lastExtraKey) {
      this.lastExtraKey = extraKey;
      this.rebuildExtraAnatomy(bodyBox);
      dirty = true;
    }const visArr = Array.isArray((s as any).visible) ? (s as any).visible as string[] : null; const anyVis = visArr ? visArr.length > 0 : true; const sysOn = (id: string) => visArr ? visArr.includes(id) : true; const baseVis = ready && amount < 0.08 && !s.isolate; if (!baseVis || !anyVis) { this.extraGroup.visible = false; this.lymphGroup.visible = false; this.endoGroup.visible = false; this.connGroup.visible = false; } else { this.lymphGroup.visible = sysOn('lymphatic'); this.endoGroup.visible = sysOn('endocrine'); this.connGroup.visible = !!(s as any).showLigaments && anyVis && !s.isolate && amount < 0.08; this.extraGroup.visible = this.lymphGroup.visible || this.endoGroup.visible || this.connGroup.visible; } const sel = Array.isArray(s.selected) ? s.selected : []; const pinKey = (ready && anyVis && sel.length > 0 && amount <= 0.08) ? (String(sel[0]) + '|' + (s.isolate ? 'I' : 'N') + '|' + ((s as any).boneQuizMode ? 'Q' : 'L')) : ''; if (pinKey !== this.lastPinKey) { this.lastPinKey = pinKey; this.bonePinGroup.clear(); this.activePinMesh = null; if (pinKey) { const rawSel = sel[0]; const partIdx = typeof rawSel === 'number' ? rawSel : atlas.parts.findIndex((pt: any) => pt.id === rawSel || pt.concept === rawSel || pt.name === rawSel); const part = atlas.parts[partIdx]; const mesh = pickers[partIdx]; const box = bounds[partIdx]; if (part && mesh && box && !box.isEmpty()) { const pins = getBone3DPins(part.name, part.system); if (pins.length > 0) { const bMin = box.min; const bSize = box.getSize(new T.Vector3()); const bCenter = box.getCenter(new T.Vector3()); const maxDim = Math.max(bSize.x, bSize.y, bSize.z, 0.05); const rDot = s.isolate ? Math.max(0.0022, Math.min(0.0052, maxDim * 0.011)) : Math.max(0.0025, Math.min(0.0055, maxDim * 0.013)); const pinRc = new T.Raycaster(); for (const pin of pins) { const rawPos = new T.Vector3(bMin.x + (0.5 + pin.rel[0]) * bSize.x, bMin.y + pin.rel[1] * bSize.y, bMin.z + (0.5 + pin.rel[2]) * bSize.z); const dirToCenter = bCenter.clone().sub(rawPos); if (dirToCenter.lengthSq() < 1e-6) dirToCenter.set(0, 0, -1); dirToCenter.normalize(); const origin = rawPos.clone().sub(dirToCenter.clone().multiplyScalar(maxDim * 0.6)); pinRc.set(origin, dirToCenter); const hits = pinRc.intersectObject(mesh, false); const surfPos = hits.length > 0 ? hits[0].point.clone().addScaledVector(dirToCenter, -rDot * 0.35) : rawPos; const outDir = dirToCenter.clone().negate(); const normalTex = makePinSpriteTex(pin.color, false); const activeTex = makePinSpriteTex(pin.color, true); const core = new T.Sprite(new T.SpriteMaterial({ map: normalTex, transparent: true, depthTest: true, depthWrite: false })); const pinSz = s.isolate ? Math.max(0.011, Math.min(0.025, maxDim * 0.052)) : Math.max(0.013, Math.min(0.028, maxDim * 0.058)); core.scale.set(pinSz, pinSz, 1); core.renderOrder = 20; core.position.copy(surfPos).addScaledVector(outDir, Math.max(0.002, rDot * 0.4)); core.userData.pinInfo = { name: pin.name, system: part.name + ' · 骨骼标志', desc: pin.desc }; core.userData.normalTex = normalTex; core.userData.activeTex = activeTex; core.userData.baseScale = pinSz; if (s.isolate && !(s as any).boneQuizMode) { const lbl = makePinLabel(pin.name, pin.color); const lblH = Math.max(0.012, Math.min(0.026, maxDim * 0.055)); lbl.scale.set(lblH * 4, lblH, 1); lbl.position.copy(outDir.clone().multiplyScalar(rDot * 2.8)).add(new T.Vector3(0, lblH * 0.45, 0)); lbl.visible = false; lbl.userData.pinInfo = core.userData.pinInfo; lbl.userData.pinCore = core; core.userData.pinLabel = lbl; core.add(lbl); } this.bonePinGroup.add(core); } s.onBonePinsLoaded?.(pins); } } } else { s.onBonePinsLoaded?.([]); } dirty = true; } this.bonePinGroup.visible = !!pinKey && this.bonePinGroup.children.length > 0;

    // 
    const fpt = s.focusPoint3D;
    const fKey = fpt ? (fpt.code || fpt.name || '') : '';
    const acuKey = `${ready ? 'R' : 'W'}|${sex || 'm'}|${s.showPoints3D ? '1' : '0'}|${s.activeMeridian || ''}|${s.points3D?.length || 0}|${fKey}|${nx ? 'X' : 'N'}`;

    if (acuKey !== this.lastAcuKey) {
      this.lastAcuKey = acuKey;
      this.acuGroup.clear();
      this.tubeMats.length = 0;

      if (ready && s.showPoints3D && s.points3D && s.points3D.length) {
        const pts = s.points3D.filter((p: any) => !s.activeMeridian || s.activeMeridian === '全部' || p.meridian === s.activeMeridian || (fpt && p.name === fpt.name));
        const sg = new T.SphereGeometry(0.0095, 12, 12);
        const byMer = new Map<string, T.Vector3[]>();
        const solidTargets = pickers.filter((m, idx) => !!m && atlas.parts[idx]?.system !== 'integumentary');
        const minY = bodyBox.isEmpty() ? 0 : bodyBox.min.y;
        const maxY = bodyBox.isEmpty() ? 1.7 : bodyBox.max.y;
        const spanY = Math.max(0.5, maxY - minY);
        const bCenter = bodyBox.isEmpty() ? new T.Vector3(0, 0.85, 0) : bodyBox.getCenter(new T.Vector3());
        const bSize = bodyBox.isEmpty() ? new T.Vector3(0.75, 1.7, 0.28) : bodyBox.getSize(new T.Vector3());
        const rc = new T.Raycaster();
        let focusPos: T.Vector3 | null = null;
        let focusOut = new T.Vector3(0, 0, 1);

        for (const p of pts) {
          const sides = Math.abs(p.pos[0]) > 0.012 ? [1, -1] : [1];
          for (const side of sides) {
            const pxx: number = p.pos[0] * side;
            const isFocus = !!(fpt && side === 1 && (p.name === fpt.name || (fpt.code && p.code === fpt.code)));
            const hi = isFocus || (s.activeMeridian && s.activeMeridian !== '全部');
            const m = new T.Mesh(sg, new T.MeshStandardMaterial({
              color: isFocus ? 0xf59e0b : (hi ? 0x38bdf8 : 0x22d3ee),
              emissive: isFocus ? 0xf59e0b : (hi ? 0x0ea5e9 : 0x0891b2),
              emissiveIntensity: isFocus ? 1.15 : 0.65,
              roughness: 0.25,
            }));
            if (isFocus) m.scale.setScalar(1.85);
            const sy = minY + (p.pos[1] / 1.72) * spanY;
            const sx = bCenter.x + pxx * (bSize.x / 0.84);
            const sz = bCenter.z + p.pos[2] * (bSize.z / 0.28);
            const zone = p.zone || 'torso_front';
            const origin = new T.Vector3(sx, sy, sz);
            const dir = new T.Vector3(0, 0, -1);
            if (zone === 'torso_back' || zone === 'leg_back') { origin.z = bCenter.z - bSize.z * 0.95; dir.set(0, 0, 1); }
            else if (zone === 'arm') { const sgn = pxx >= 0 ? 1 : -1; origin.x = bCenter.x + sgn * bSize.x * 0.9; dir.set(-sgn, 0, 0); }
            else if (zone === 'hand') { origin.z = bCenter.z + bSize.z * 0.75; dir.set(0, 0, -1); }
            else if (zone === 'foot') { origin.y = minY + bSize.y * 0.14; dir.set(0, -1, 0); }
            else if (zone === 'head') { const hc = new T.Vector3(bCenter.x, sy, bCenter.z); dir.copy(hc).sub(origin); if (dir.lengthSq() < 1e-5) dir.set(0, 0, -1); dir.normalize(); origin.addScaledVector(dir, -bSize.x * 0.45); }
            else { origin.z = bCenter.z + bSize.z * 0.95; dir.set(0, 0, -1); }

            rc.set(origin, dir);
            const hits = solidTargets.length ? rc.intersectObjects(solidTargets as T.Object3D[], false) : [];
            let chosenHit: T.Vector3 | null = null;
            for (const h of hits) {
              const dx = Math.abs(h.point.x - bCenter.x);
              if ((zone === 'torso_front' || zone === 'torso_back') && dx > bSize.x * 0.26) continue;
              if (zone === 'arm' && dx < bSize.x * 0.14) continue;
              chosenHit = h.point.clone().addScaledVector(dir, -0.004);
              break;
            }
            if (!chosenHit && solidTargets.length) {
              const radDir = new T.Vector3(bCenter.x - sx, 0, bCenter.z - sz);
              if (radDir.lengthSq() < 1e-5) radDir.set(0, 0, -1);
              radDir.normalize();
              rc.set(new T.Vector3(sx, sy, sz).addScaledVector(radDir, -0.35), radDir);
              const rh = rc.intersectObjects(solidTargets as T.Object3D[], false);
              if (rh.length) chosenHit = rh[0].point.clone().addScaledVector(radDir, -0.004);
            }
            m.userData = { acupoint: p };
            if (chosenHit) m.position.copy(chosenHit); else m.position.set(sx, sy, sz);
            if (isFocus) { focusPos = m.position.clone(); focusOut = dir.clone().negate(); }
            this.acuGroup.add(m);
            const key = `${p.meridian}:${side}`;
            const arr = byMer.get(key) || [];
            arr.push(m.position.clone());
            byMer.set(key, arr);
          }
        }

        if (s.activeMeridian && s.activeMeridian !== '全部') {
          byMer.forEach((arr) => {
            if (arr.length >= 2) {
              const tm = new T.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.75, roughness: 0.25 });
              this.tubeMats.push(tm);
              this.acuGroup.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(arr), Math.max(12, arr.length * 3), 0.0026, 8, false), tm));
            }
          });
        }

        if (focusPos && nx) {
          const ang = fpt?.angle || 'perp';
          const ndDir = focusOut.clone().normalize();
          if (ang === 'flat') ndDir.lerp(new T.Vector3(0, 1, 0), 0.78).normalize();
          else if (ang === 'oblique') ndDir.lerp(new T.Vector3(0, 1, 0), 0.45).normalize();
          const nd = new T.Group();
          const sh = new T.Mesh(new T.CylinderGeometry(0.0008, 0.0004, 0.055, 8), new T.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 }));
          sh.position.y = 0.02;
          const hd = new T.Mesh(new T.CylinderGeometry(0.002, 0.002, 0.018, 8), new T.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 }));
          hd.position.y = 0.054;
          const r1 = new T.Mesh(new T.TorusGeometry(0.0024, 0.0005, 8, 16), new T.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.9 }));
          r1.rotation.x = Math.PI / 2; r1.position.y = 0.015;
          const r2 = new T.Mesh(new T.TorusGeometry(0.0024, 0.0005, 8, 16), new T.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.9 }));
          r2.rotation.x = Math.PI / 2; r2.position.y = 0.030;
          nd.add(sh, hd, r1, r2);
          nd.position.copy(focusPos);
          nd.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), ndDir);
          this.acuGroup.add(nd);
        }

        if (focusPos && fKey && fKey !== this.lastFocusKey) {
          this.lastFocusKey = fKey;
          this.handles.controls.target.copy(focusPos);
          this.handles.camera.position.copy(focusPos).addScaledVector(focusOut, 0.52);
          this.handles.controls.update();
        }
      }
      dirty = true;
    }

    this.acuGroup.visible = !!s.showPoints3D && amount < 0.08 && !s.isolate;
    if (this.acuGroup.visible && this.tubeMats.length) {
      const now = performance.now();
      if (now - this.lastPulse > 60) {
        this.lastPulse = now;
        const pulse = 0.65 + 0.45 * Math.sin(now * 0.0045);
        this.tubeMats.forEach((tm) => { tm.emissiveIntensity = pulse; });
        dirty = true;
      }
    }
    return dirty;
  }
            }

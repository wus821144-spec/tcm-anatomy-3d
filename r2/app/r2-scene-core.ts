import * as T from 'three';
import { getBone3DPins } from './r2-bone-landmarks';

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
  connGroup = new T.Group(); bonePinGroup = new T.Group(); lastPinKey = ''; activePinMesh: T.Mesh | null = null;
  
  tubeMats: T.MeshStandardMaterial[] = [];
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
    handles.scene.add(this.acuGroup);
    handles.scene.add(this.extraGroup); this.bonePinGroup.name = 'r2_bone_pin_group'; handles.scene.add(this.bonePinGroup);
    const dom = handles.renderer.domElement;
    dom.addEventListener('pointerdown', (ev: PointerEvent) => { this.pdX = ev.clientX; this.pdY = ev.clientY; });
    dom.addEventListener('pointerup', (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - this.pdX, ev.clientY - this.pdY) > 8) return;
      const r = dom.getBoundingClientRect();
      const ndc = new T.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      const tr = new T.Raycaster();
      tr.setFromCamera(ndc, this.handles.camera); if (this.bonePinGroup.visible && this.bonePinGroup.children.length) { const phs = tr.intersectObjects(this.bonePinGroup.children, true); const hp = phs.find((h) => h.object?.userData?.pinInfo); if (hp) { if (this.activePinMesh && this.activePinMesh !== hp.object) this.activePinMesh.scale.setScalar(1); hp.object.scale.setScalar(1.55); this.activePinMesh = hp.object as T.Mesh; this.extraCb?.(hp.object.userData.pinInfo); return; } }
      if (this.acuGroup.visible && this.acuGroup.children.length) {
        const hs = tr.intersectObjects(this.acuGroup.children, true);
        const ha = hs.find((h) => h.object?.userData?.acupoint);
        if (ha) { this.tapCb?.(ha.object.userData.acupoint); return; }
      }
      if (this.extraGroup.visible && this.extraGroup.children.length) {
        const hs = tr.intersectObjects(this.extraGroup.children, true);
        const he = hs.find((h) => h.object?.userData?.extraInfo);
        if (he) { this.extraCb?.(he.object.userData.extraInfo); }
      }
    });
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
    }
   // Endocrine: Pituitary, Pineal, Parathyroids, Adrenals
    addNode(this.endoGroup, new T.SphereGeometry(0.0035, 12, 12), 0xf43f5e, pos(0, 0.925, 0.07), { name: '脑垂体 · Pituitary Gland', system: '内分泌系统', desc: '位于蝶鞍垂体窝内，分泌生长激素、促甲状腺激素等，为内分泌调控中枢。' });
    addNode(this.endoGroup, new T.SphereGeometry(0.0028, 10, 10), 0xfb7185, pos(0, 0.935, -0.02), { name: '松果体 · Pineal Gland', system: '内分泌系统', desc: '位于丘脑后上方，分泌褪黑素调节昼夜节律。' });
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
    for (const sgn of [-1, 1]) {
      const side = sgn > 0 ? '左' : '右';
      addTube(this.connGroup, [pos(sgn * 0.21, 0.49, 0.01), pos(sgn * 0.22, 0.39, 0.0), pos(sgn * 0.19, 0.29, 0.01)], 0.0045, 0xdbeafe, { name: `${side}侧髂胫束 · Iliotibial Band`, system: '结缔组织与筋膜', desc: '大腿外侧阔筋膜增厚形成的强韧纤维带，起自髂嵴止于胫骨外侧髁。' }, { opacity: 0.82 });
      addTube(this.connGroup, [pos(sgn * 0.31, 0.48, 0.025), pos(sgn * 0.33, 0.475, 0.03), pos(sgn * 0.35, 0.48, 0.025)], 0.0025, 0xe2e8f0, { name: `${side}侧腕横韧带 · Flexor Retinaculum`, system: '结缔组织与韧带', desc: '跨越腕骨掌侧形成腕管顶部，保护正中神经及屈肌腱。' }, { opacity: 0.88 });
      addTube(this.connGroup, [pos(sgn * 0.19, 0.52, 0.09), pos(sgn * 0.12, 0.49, 0.125), pos(sgn * 0.05, 0.47, 0.135)], 0.0028, 0xf1f5f9, { name: `${side}侧腹股沟韧带 · Inguinal Ligament`, system: '结缔组织与韧带', desc: '起自髂前上棘止于耻骨结节，构成腹股沟管下壁与股三角上界。' }, { opacity: 0.88 });
      addTube(this.connGroup, [pos(sgn * 0.145, 0.29, -0.01), pos(sgn * 0.155, 0.275, 0.01), pos(sgn * 0.165, 0.26, 0.025)], 0.0022, 0xf8fafc, { name: `${side}侧前交叉韧带 · ACL`, system: '结缔组织与韧带', desc: '起自股骨外侧髁内侧面，斜向前下止于胫骨髁间前区，防止胫骨前移。' }, { opacity: 0.92 });
      addTube(this.connGroup, [pos(sgn * 0.165, 0.29, 0.015), pos(sgn * 0.155, 0.275, -0.005), pos(sgn * 0.145, 0.26, -0.02)], 0.0022, 0xe2e8f0, { name: `${side}侧后交叉韧带 · PCL`, system: '结缔组织与韧带', desc: '起自股骨内侧髁外侧面，斜向后下止于胫骨髁间后区，防止胫骨后移。' }, { opacity: 0.92 });
      addTube(this.connGroup, [pos(sgn * 0.15, 0.14, -0.045), pos(sgn * 0.15, 0.09, -0.052), pos(sgn * 0.15, 0.04, -0.055)], 0.0036, 0xf1f5f9, { name: `${side}侧跟腱 · Achilles Tendon`, system: '结缔组织与韧带', desc: '人体最粗壮的肌腱，由腓肠肌与比目鱼肌腱向下融合止于跟骨结节。' }, { opacity: 0.9 });
    }
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
    this.extraCb = s.onExtraTap || null;

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
    }const visArr = Array.isArray((s as any).visible) ? (s as any).visible as string[] : null; const anyVis = visArr ? visArr.length > 0 : true; const sysOn = (id: string) => visArr ? visArr.includes(id) : true; const baseVis = ready && amount < 0.08 && !s.isolate; if (!baseVis || !anyVis) { this.extraGroup.visible = false; this.lymphGroup.visible = false; this.endoGroup.visible = false; this.connGroup.visible = false; } else { this.lymphGroup.visible = sysOn('lymphatic'); this.endoGroup.visible = sysOn('endocrine'); this.connGroup.visible = sysOn('skeletal') && sysOn('muscular'); this.extraGroup.visible = this.lymphGroup.visible || this.endoGroup.visible || this.connGroup.visible; } const sel = Array.isArray(s.selected) ? s.selected : []; const pinKey = (ready && anyVis && sel.length > 0 && amount <= 0.08) ? String(sel[0]) : ''; if (pinKey !== this.lastPinKey) { this.lastPinKey = pinKey; this.bonePinGroup.clear(); this.activePinMesh = null; if (pinKey) { const partIdx = Number(sel[0]); const part = atlas.parts[partIdx]; const mesh = pickers[partIdx]; const box = bounds[partIdx]; if (part && mesh && box && !box.isEmpty()) { const pins = getBone3DPins(part.name, part.system); if (pins.length > 0) { const bMin = box.min; const bSize = box.getSize(new T.Vector3()); const bCenter = box.getCenter(new T.Vector3()); const maxDim = Math.max(bSize.x, bSize.y, bSize.z, 0.05); const rDot = Math.max(0.004, Math.min(0.012, maxDim * 0.032)); const pinRc = new T.Raycaster(); for (const pin of pins) { const rawPos = new T.Vector3(bMin.x + (0.5 + pin.rel[0]) * bSize.x, bMin.y + pin.rel[1] * bSize.y, bMin.z + (0.5 + pin.rel[2]) * bSize.z); const dirToCenter = bCenter.clone().sub(rawPos); if (dirToCenter.lengthSq() < 1e-6) dirToCenter.set(0, 0, -1); dirToCenter.normalize(); const origin = rawPos.clone().sub(dirToCenter.clone().multiplyScalar(maxDim * 0.6)); pinRc.set(origin, dirToCenter); const hits = pinRc.intersectObject(mesh, false); const surfPos = hits.length > 0 ? hits[0].point.clone().addScaledVector(dirToCenter, -rDot * 0.35) : rawPos; const core = new T.Mesh(new T.SphereGeometry(rDot, 14, 14), new T.MeshBasicMaterial({ color: pin.color })); core.position.copy(surfPos); core.userData.pinInfo = { name: pin.name, system: part.name + ' · 骨骼标志', desc: pin.desc }; const halo = new T.Mesh(new T.SphereGeometry(rDot * 1.45, 14, 14), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72, side: T.BackSide })); core.add(halo); this.bonePinGroup.add(core); } } } } dirty = true; } this.bonePinGroup.visible = !!pinKey && this.bonePinGroup.children.length > 0;

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

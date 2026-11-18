import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type MicroType = 'ear' | 'alveolus' | 'nephron' | 'synapse' | 'sarcomere' | 'valve' | 'lobule';

const MICRO_ITEMS: { id: MicroType; label: string; desc: string }[] = [
  { id: 'ear', label: '3D耳穴图谱', desc: '标注神门（三角窝）、交感、心（耳甲腔）、肺、胃、肾（耳甲艇）与皮质下等核心耳穴反射区。' },
  { id: 'alveolus', label: '肺泡微结构', desc: '展示肺泡囊、I/II型肺泡上皮及包绕其外的毛细血管网（肺换气功能单位）。' },
  { id: 'nephron', label: '肾单位', desc: '展示肾小体（肾小球+肾小囊）、近曲小管、髓袢与远曲小管集合管系统。' },
  { id: 'synapse', label: '神经突触', desc: '展示突触前膜、突触囊泡、突触间隙与突触后膜受体结构。' },
  { id: 'sarcomere', label: '肌小节', desc: '展示Z线、粗肌丝（肌球蛋白）与细肌丝（肌动蛋白）横桥滑行结构。' },
  { id: 'valve', label: '心脏瓣膜', desc: '展示二尖瓣/三尖瓣瓣叶、腱索与乳头肌防反流力学结构。' },
  { id: 'lobule', label: '肝小叶', desc: '展示六边形经典肝小叶、中央静脉、肝血窦与门管区三联管结构。' }
];

const EAR_ACUPOINTS: Array<{ name: string; region: string; pos: [number, number, number]; color: number; location: string; indications: string }> = [
  { name: '神门', region: '三角窝', pos: [0.03, 0.20, 0.055], color: 0xf59e0b, location: '三角窝后1/3上部（对耳轮上下脚分叉处上方）', indications: '镇静安神、失眠多梦、焦虑烦躁、戒断反应及各科止痛' },
  { name: '交感', region: '对耳轮下脚', pos: [-0.09, 0.17, 0.055], color: 0x38bdf8, location: '对耳轮下脚末端与耳轮内缘交界处', indications: '内脏平滑肌痉挛痛、自主神经功能紊乱、自汗盗汗、心悸' },
  { name: '皮质下', region: '对耳屏内侧面', pos: [-0.07, -0.17, 0.065], color: 0xa855f7, location: '对耳屏内侧面（耳甲腔外下方）', indications: '神经衰弱、失眠健忘、眩晕、慢性疼痛及血压调节' },
  { name: '心', region: '耳甲腔', pos: [-0.02, -0.04, 0.045], color: 0xef4444, location: '耳甲腔正中凹陷处', indications: '心悸胸闷、失眠多梦、健忘、口舌生疮、脉律不齐' },
  { name: '肺', region: '耳甲腔', pos: [-0.07, -0.08, 0.048], color: 0xfda4af, location: '耳甲腔心区周围（上、下、外侧环形区域）', indications: '咳嗽气喘、胸闷咽痛、皮肤瘙痒、鼻炎及辅助戒烟' },
  { name: '胃', region: '耳轮脚消失处', pos: [-0.01, 0.025, 0.055], color: 0xfb923c, location: '耳轮脚消失处（耳甲艇与耳甲腔交界）', indications: '胃脘胀痛、恶心呕吐、反酸嗳气、消化不良、失眠' },
  { name: '肝', region: '耳甲艇', pos: [0.05, 0.06, 0.048], color: 0x22c55e, location: '耳甲艇后下部（胃区后下方）', indications: '胁肋胀痛、头晕目眩、急躁易怒、月经不调、目疾' },
  { name: '肾', region: '耳甲艇', pos: [-0.03, 0.11, 0.048], color: 0x10b981, location: '对耳轮下脚下方后部（耳甲艇顶部）', indications: '腰膝酸软、耳鸣耳聋、水肿、遗精阳痿、脱发健忘' },
  { name: '内分泌', region: '屏间切迹', pos: [-0.11, -0.14, 0.055], color: 0xec4899, location: '耳甲腔底部屏间切迹内（近耳屏下缘）', indications: '内分泌失调、更年期综合征、痛经、痤疮及代谢调节' },
  { name: '降压沟', region: '耳背', pos: [0.07, 0.04, -0.075], color: 0x60a5fa, location: '耳廓背面由内上方斜向外下方的凹沟', indications: '原发性高血压、肝阳上亢型头痛眩晕、耳鸣' },
];] // ;

export function MicroEarViewer() {
const [selectedEarPt, setSelectedEarPt] = useState<string>('神门');
const earMeshesRef = useRef<Record<string, T.Mesh>>({});
const earRingRef = useRef<T.Mesh | null>(null);
  const [active, setActive] = useState<MicroType>('ear');
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth || 300, 220);
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(40, (el.clientWidth || 300) / 220, 0.05, 20);
    camera.position.set(0, 0.15, 1.35);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new T.HemisphereLight(0xffffff, 0x1e293b, 1.1));
    const dl = new T.DirectionalLight(0xfffbeb, 1.8);
    dl.position.set(1.5, 2, 2);
    scene.add(dl);

    const grp = new T.Group();
    scene.add(grp);
    if (active === 'ear') {
      const skin = new T.MeshPhysicalMaterial({ color: 0xe2b49a, roughness: 0.52, side: T.DoubleSide });
      const ridgeMat = new T.MeshPhysicalMaterial({ color: 0xebbda4, roughness: 0.48 });
      const fossaMat = new T.MeshStandardMaterial({ color: 0xc28a70, roughness: 0.65 });
      const helix = new T.Mesh(new T.TorusGeometry(0.32, 0.055, 18, 48, Math.PI * 1.48), skin);
      helix.rotation.z = -0.35;
      const crusHelix = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-0.18, 0.05, 0.02), new T.Vector3(-0.08, 0.03, 0.03), new T.Vector3(0.01, 0.02, 0.025)]), 20, 0.028, 12, false), ridgeMat);
      const lobe = new T.Mesh(new T.SphereGeometry(0.14, 20, 20), skin);
      lobe.scale.set(0.9, 1.15, 0.55);
      lobe.position.set(-0.08, -0.31, 0);
      const antihelix = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-0.07, -0.15, 0.015), new T.Vector3(0.0, -0.02, 0.032), new T.Vector3(0.05, 0.10, 0.035), new T.Vector3(0.05, 0.16, 0.03)]), 24, 0.032, 12, false), ridgeMat);
      const supCrus = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0.05, 0.15, 0.03), new T.Vector3(0.08, 0.22, 0.03), new T.Vector3(0.09, 0.27, 0.02)]), 16, 0.024, 10, false), ridgeMat);
      const infCrus = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0.05, 0.15, 0.03), new T.Vector3(-0.02, 0.165, 0.035), new T.Vector3(-0.09, 0.17, 0.03)]), 16, 0.024, 10, false), ridgeMat);
      const triFossa = new T.Mesh(new T.SphereGeometry(0.085, 18, 18), fossaMat);
      triFossa.scale.set(1.0, 0.75, 0.25);
      triFossa.position.set(0.02, 0.20, 0.005);
      const tragus = new T.Mesh(new T.SphereGeometry(0.075, 16, 16), ridgeMat);
      tragus.scale.set(0.65, 1.1, 0.55);
      tragus.position.set(-0.17, -0.05, 0.04);
      const antitragus = new T.Mesh(new T.SphereGeometry(0.065, 16, 16), ridgeMat);
      antitragus.scale.set(0.85, 0.75, 0.5);
      antitragus.position.set(-0.07, -0.17, 0.035);
      const conchaCymba = new T.Mesh(new T.SphereGeometry(0.13, 20, 20), fossaMat);
      conchaCymba.scale.set(1.05, 0.75, 0.26);
      conchaCymba.position.set(-0.01, 0.08, -0.02);
      const conchaCavum = new T.Mesh(new T.SphereGeometry(0.16, 20, 20), fossaMat);
      conchaCavum.scale.set(0.95, 1.05, 0.28);
      conchaCavum.position.set(-0.05, -0.07, -0.02);
      grp.add(helix, crusHelix, lobe, antihelix, supCrus, infCrus, triFossa, tragus, antitragus, conchaCymba, conchaCavum);
      earMeshesRef.current = {};
      EAR_ACUPOINTS.forEach((p) => {
        const isSel = p.name === selectedEarPt;
        const pt = new T.Mesh(new T.SphereGeometry(isSel ? 0.028 : 0.021, 16, 16), new T.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: isSel ? 0.95 : 0.45 }));
        pt.position.set(p.pos[0], p.pos[1], p.pos[2]);
        pt.userData.acupointName = p.name;
        earMeshesRef.current[p.name] = pt;
        grp.add(pt);
      });
      const selPos = EAR_ACUPOINTS.find((p) => p.name === selectedEarPt)?.pos || EAR_ACUPOINTS[0].pos;
      const ring = new T.Mesh(new T.TorusGeometry(0.036, 0.006, 10, 24), new T.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 0.9 }));
      ring.position.set(selPos[0], selPos[1], selPos[2]);
      earRingRef.current = ring;
      grp.add(ring);
      const raycaster = new T.Raycaster();
      const pointer = new T.Vector2();
      renderer.domElement.addEventListener('click', (ev: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(Object.values(earMeshesRef.current));
        if (hits.length > 0 && hits[0].object.userData?.acupointName) {
          setSelectedEarPt(String(hits[0].object.userData.acupointName));
        }
      });
    } else 
    if (false && active === 'ear') {
      const skin = new T.MeshPhysicalMaterial({ color: 0xe2b49a, roughness: 0.55, side: T.DoubleSide });
      const helix = new T.Mesh(new T.TorusGeometry(0.32, 0.055, 16, 40, Math.PI * 1.45), skin);
      helix.rotation.z = -0.35;
      const lobe = new T.Mesh(new T.SphereGeometry(0.14, 20, 20), skin);
      lobe.scale.set(0.9, 1.15, 0.55);
      lobe.position.set(-0.08, -0.31, 0);
      const concha = new T.Mesh(new T.SphereGeometry(0.22, 20, 20), new T.MeshStandardMaterial({ color: 0xc99379, roughness: 0.6 }));
      concha.scale.set(0.85, 1.25, 0.3);
      concha.position.set(-0.04, -0.02, -0.04);
      grp.add(helix, lobe, concha);
      const earPts: [number, number, number, number][] = [
        [0.02, 0.18, 0.05, 0xf59e0b],  // 神门
        [-0.08, 0.16, 0.05, 0x38bdf8], // 交感
        [-0.02, -0.03, 0.05, 0xef4444],// 心
        [-0.06, -0.06, 0.05, 0xfda4af],// 肺
        [-0.03, 0.06, 0.05, 0x10b981], // 肾
        [-0.08, -0.28, 0.06, 0xa855f7] // 垂前/眼
      ];
      earPts.forEach(([x, y, z, col]) => {
        const pt = new T.Mesh(new T.SphereGeometry(0.024, 14, 14), new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5 }));
        pt.position.set(x, y, z);
        grp.add(pt);
      });
    } else if (active === 'alveolus') {
      const alvMat = new T.MeshPhysicalMaterial({ color: 0xfda4af, roughness: 0.4, transparent: true, opacity: 0.85 });
      [[-0.16, 0.08, 0], [0.16, 0.1, 0.05], [0, 0.2, -0.06], [-0.1, -0.14, 0.08], [0.14, -0.12, -0.05]].forEach(([x, y, z]) => {
        const s = new T.Mesh(new T.SphereGeometry(0.14, 20, 20), alvMat);
        s.position.set(x, y, z);
        grp.add(s);
      });
      const cap = new T.Mesh(new T.TorusGeometry(0.24, 0.018, 10, 36), new T.MeshStandardMaterial({ color: 0xef4444 }));
      grp.add(cap);
    } else if (active === 'nephron') {
      const glom = new T.Mesh(new T.SphereGeometry(0.15, 20, 20), new T.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 }));
      glom.position.set(-0.22, 0.14, 0);
      const pts = [new T.Vector3(-0.08, 0.14, 0), new T.Vector3(0.08, 0.22, 0.05), new T.Vector3(0.12, -0.26, 0), new T.Vector3(0.24, 0.18, -0.04), new T.Vector3(0.32, -0.28, 0)];
      const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.028, 12, false), new T.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 }));
      grp.add(glom, tube);
    } else if (active === 'synapse') {
      const pre = new T.Mesh(new T.SphereGeometry(0.22, 22, 22), new T.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 }));
      pre.position.set(0, 0.18, 0);
      const post = new T.Mesh(new T.BoxGeometry(0.55, 0.1, 0.35), new T.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 }));
      post.position.set(0, -0.22, 0);
      grp.add(pre, post);
      for (let i = -2; i <= 2; i++) {
        const ves = new T.Mesh(new T.SphereGeometry(0.028, 12, 12), new T.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.4 }));
        ves.position.set(i * 0.07, -0.04, (i % 2) * 0.04);
        grp.add(ves);
      }
    } else if (active === 'sarcomere') {
      const zMat = new T.MeshStandardMaterial({ color: 0x38bdf8 });
      [-0.36, 0.36].forEach((x) => {
        const z = new T.Mesh(new T.BoxGeometry(0.025, 0.44, 0.26), zMat);
        z.position.set(x, 0, 0);
        grp.add(z);
      });
      for (let y = -0.15; y <= 0.16; y += 0.1) {
        const thick = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.42, 10), new T.MeshStandardMaterial({ color: 0xdc2626 }));
        thick.rotation.z = Math.PI / 2;
        thick.position.set(0, y, 0);
        grp.add(thick);
      }
    } else if (active === 'valve') {
      const ring = new T.Mesh(new T.TorusGeometry(0.28, 0.032, 14, 36), new T.MeshStandardMaterial({ color: 0xfda4af }));
      ring.rotation.x = Math.PI / 2;
      const c1 = new T.Mesh(new T.ConeGeometry(0.2, 0.26, 16, 1, true), new T.MeshPhysicalMaterial({ color: 0xfecdd3, side: T.DoubleSide, transparent: true, opacity: 0.85 }));
      c1.position.set(0, -0.12, 0);
      grp.add(ring, c1);
    } else {
      const hex = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 0.22, 6), new T.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.5 }));
      const cv = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.28, 16), new T.MeshStandardMaterial({ color: 0x2563eb }));
      grp.add(hex, cv);
    }

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      grp.rotation.y += 0.006;
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      controls.dispose();
      renderer.dispose();
    };
  }, [active]);
  useEffect(() => {
    if (active !== 'ear') return;
    EAR_ACUPOINTS.forEach((p) => {
      const m = earMeshesRef.current[p.name];
      if (!m) return;
      const isSel = p.name === selectedEarPt;
      m.scale.setScalar(isSel ? 1.35 : 1.0);
      const mat = m.material as T.MeshStandardMaterial;
      if (mat && 'emissiveIntensity' in mat) mat.emissiveIntensity = isSel ? 1.0 : 0.45;
    });
    const sel = EAR_ACUPOINTS.find((p) => p.name === selectedEarPt);
    if (sel && earRingRef.current) {
      earRingRef.current.position.set(sel.pos[0], sel.pos[1], sel.pos[2]);
    }
  }, [selectedEarPt, active]);
  const activeEarPt = EAR_ACUPOINTS.find((p) => p.name === selectedEarPt) || EAR_ACUPOINTS[0];
  const cur = MICRO_ITEMS.find((m) => m.id === active) || MICRO_ITEMS[0];

  return (
    <div className="tcm-stack">
      <div className="tcm-chip-row">
        {MICRO_ITEMS.map((m) => (
          <button key={m.id} type="button" className={active === m.id ? 'active' : ''} onClick={() => setActive(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div ref={hostRef} style={{ width: '100%', height: 220, borderRadius: 14, background: 'rgba(5,7,11,0.85)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }} />
      <div className="tcm-item-card static">
        <strong>{cur.label}</strong>
        <p>{cur.desc}</p>
      </div>
      {active === 'ear' && (
        <>
          <div className="tcm-chip-row">
            {EAR_ACUPOINTS.map((p) => (
              <button key={p.name} type="button" className={selectedEarPt === p.name ? 'active' : ''} onClick={() => setSelectedEarPt(p.name)}>
                {p.name}
              </button>
            ))}
          </div>
          <div className="tcm-item-card static">
            <strong>耳穴：{activeEarPt.name}（{activeEarPt.region}）</strong>
            <p>定位：{activeEarPt.location}</p>
            <p>主治：{activeEarPt.indications}</p>
          </div>
        </>
      )}
    </div>
  );
}
type CtPlane = 'axial' | 'sagittal' | 'coronal';
type CtRegion = 'brain' | 'chest' | 'abdomen' | 'pelvis';
type CtWindow = 'soft' | 'lung' | 'mediastinum' | 'bone';

interface AtlasMeta {
  title: string;
  anatomy: string;
  clinical: string;
  landmarks: string[];
}

const PLANE_LABELS: Record<CtPlane, string> = {
  axial: '轴位 Axial',
  sagittal: '矢状位 Sagittal',
  coronal: '冠状位 Coronal',
};

const REGION_LABELS: Record<CtRegion, string> = {
  brain: '颅脑',
  chest: '胸部',
  abdomen: '腹部',
  pelvis: '盆腔',
};

const WINDOW_STYLES: Record<
  CtWindow,
  { label: string; wl: string; bg: string; bone: string; soft: string; air: string; accent: string }
> = {
  soft: { label: '软组织窗', wl: 'W350 / L40', bg: '#070b14', bone: '#e2e8f0', soft: '#64748b', air: '#0b1220', accent: '#38bdf8' },
  lung: { label: '肺窗', wl: 'W1500 / L-600', bg: '#03060c', bone: '#cbd5e1', soft: '#334155', air: '#020408', accent: '#22d3ee' },
  mediastinum: { label: '纵隔窗', wl: 'W400 / L40', bg: '#090d16', bone: '#f1f5f9', soft: '#475569', air: '#060a12', accent: '#f59e0b' },
  bone: { label: '骨窗', wl: 'W2000 / L500', bg: '#05070b', bone: '#ffffff', soft: '#1e293b', air: '#04060a', accent: '#a78bfa' },
};
function getAtlasMeta(region: CtRegion, plane: CtPlane, slicePos: number): AtlasMeta {
  if (region === 'brain') {
    if (plane === 'axial') {
      if (slicePos > 20) {
        return {
          title: '颅脑轴位 · 半卵圆中心层面',
          anatomy: '可见双侧大脑半球灰白质分界、大脑镰及上矢状窦截面。',
          clinical: '读片要点：观察皮层沟回对称性及半卵圆中心有无缺血灶或占位。',
          landmarks: ['大脑镰', '半卵圆中心', '上矢状窦', '颅骨板障'],
        };
      }
      if (slicePos < -20) {
        return {
          title: '颅脑轴位 · 颅底脑桥小脑层面',
          anatomy: '可见脑桥、第四脑室、双侧小脑半球、颞叶及蝶窦/乳突气房。',
          clinical: '读片要点：骨窗重点排查颅底骨折与乳突炎；软组织窗看脑干及桥小脑角。',
          landmarks: ['脑桥', '第四脑室', '小脑半球', '颞骨岩部'],
        };
      }
      return {
        title: '颅脑轴位 · 基底节与丘脑层面',
        anatomy: '可见侧脑室前角/三角区、第三脑室、双侧丘脑、尾状核及豆状核。',
        clinical: '读片要点：注意双侧基底节区对称性及中线结构是否居中，警惕高血压脑出血好发区。',
        landmarks: ['侧脑室', '丘脑', '基底节', '中线大脑镰'],
      };
    }
    if (plane === 'sagittal') {
      return {
        title: '颅脑矢状位 · 中线/旁矢状层面',
        anatomy: '清晰显示胼胝体膝/体/压部、侧脑室/第三脑室、丘脑、脑干及小脑蚓部。',
        clinical: '读片要点：评估胼胝体形态、垂体窝大小及小脑扁桃体下缘位置。',
        landmarks: ['胼胝体', '丘脑', '侧脑室', '脑干与小脑'],
      };
    }
    return {
      title: '颅脑冠状位 · 丘脑与颞叶层面',
      anatomy: '显示双侧大脑半球、侧脑室体部、第三脑室、丘脑、海马及颅顶穹窿。',
      clinical: '读片要点：适合对比双侧颞叶海马对称性及观察大脑镰下疝征象。',
      landmarks: ['侧脑室', '丘脑', '颞叶', '颅骨穹窿'],
    };
  }

  if (region === 'chest') {
    if (plane === 'axial') {
      return {
        title: slicePos > 15 ? '胸部轴位 · 主动脉弓上/气管层面' : '胸部轴位 · 心室与肺门层面',
        anatomy: '双侧肺野充气透亮，纵隔内见心脏四腔/大血管影，后方为胸椎椎体与肋骨。',
        clinical: '读片要点：肺窗排查肺结节、间质改变及肺气肿；纵隔窗观察心包积液与淋巴结。',
        landmarks: ['双侧肺野', '心脏/纵隔', '胸主动脉', '胸椎与肋骨'],
      };
    }
    if (plane === 'sagittal') {
      return {
        title: '胸部矢状位 · 纵隔与胸椎层面',
        anatomy: '前为胸骨，中为心脏纵隔及肺血管分支，后为胸椎椎体及椎间盘序列。',
        clinical: '读片要点：骨窗评估胸椎压缩性骨折；肺窗观察斜裂/水平裂及肺叶分段。',
        landmarks: ['胸骨', '纵隔心脏', '肺野', '胸椎序列'],
      };
    }
    return {
      title: '胸部冠状位 · 气管隆突与双肺层面',
      anatomy: '显示气管分叉及左右主支气管、双侧肺野纹理、纵隔心影及膈肌穹窿。',
      clinical: '读片要点：气管隆突角度及支气管通畅度一目了然，便于定位肺门病变。',
      landmarks: ['气管/主支气管', '双侧肺野', '纵隔心影', '膈肌'],
    };
  }

  if (region === 'abdomen') {
    if (plane === 'axial') {
      return {
        title: slicePos > 15 ? '腹部轴位 · 肝脾胃上腹层面' : '腹部轴位 · 肾门与腰椎层面',
        anatomy: '右上腹为肝脏实质，左上腹为脾脏与胃泡，脊柱两侧为双肾及腰大肌。',
        clinical: '读片要点：软组织窗对比肝脾密度（脂肪肝时肝密度低于脾），观察肾盂及腹主动脉钙化。',
        landmarks: ['肝脏', '脾脏', '胃泡', '双肾/腰椎'],
      };
    }
    if (plane === 'sagittal') {
      return {
        title: '腹部矢状位 · 腹主动脉与脊柱层面',
        anatomy: '可见肝脏左叶、胃窦、胰腺断面、腹主动脉纵行走行及腰椎椎体。',
        clinical: '读片要点：观察腹主动脉管径及腰椎椎体后缘骨质增生/椎管狭窄情况。',
        landmarks: ['肝脏/胃', '腹主动脉', '腰椎', '腹壁'],
      };
    }
    return {
      title: '腹部冠状位 · 肝脾双肾全景层面',
      anatomy: '右上腹肝脏、左上腹脾脏与胃、双侧肾脏及中轴腰椎结构完整呈像。',
      clinical: '读片要点：便于评估肝脾大小、双肾位置高低及输尿管走行区结石。',
      landmarks: ['肝脏', '脾脏', '双肾', '腰椎'],
    };
  }

  if (plane === 'axial') {
    return {
      title: '盆腔轴位 · 膀胱子宫与骶骨层面',
      anatomy: '前方为充盈膀胱，中后方为子宫（或前列腺）及直肠，后方为骶骨与双侧髂骨。',
      clinical: '读片要点：观察膀胱壁光整度、子宫附件区占位及骨窗下骶髂关节/髋臼骨质。',
      landmarks: ['膀胱', '子宫', '直肠', '骶骨/髂骨'],
    };
  }
  if (plane === 'sagittal') {
    return {
      title: '盆腔矢状位 · 盆底正中矢状层面',
      anatomy: '由前向后依次为耻骨联合、膀胱、子宫与宫颈、直肠及骶尾骨生理弧度。',
      clinical: '读片要点：评估子宫前/后倾位、膀胱直肠间隙及骶尾骨骨折脱位。',
      landmarks: ['耻骨联合', '膀胱', '子宫', '骶骨/直肠'],
    };
  }
  return {
    title: '盆腔冠状位 · 骨盆环与盆腔脏器层面',
    anatomy: '双侧髂骨翼及髋臼构成骨盆环，中央可见膀胱、子宫及盆底肌群。',
    clinical: '读片要点：骨窗重点检查骨盆环连续性与股骨头；软组织窗观察盆腔积液。',
    landmarks: ['髂骨翼', '膀胱', '子宫', '骶骨'],
  };
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lx: number,
  ly: number,
  label: string,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(lx, ly);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '10px system-ui, -apple-system, sans-serif';
  const tw = ctx.measureText(label).width;
  const padX = 4;
  const boxX = lx >= x ? lx + 2 : lx - tw - padX * 2 - 2;
  const boxY = ly - 7;
  ctx.fillStyle = 'rgba(5, 10, 20, 0.85)';
  ctx.fillRect(boxX, boxY, tw + padX * 2, 14);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(boxX, boxY, tw + padX * 2, 14);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(label, boxX + padX, boxY + 10.5);
  ctx.restore();
}
function drawCtAtlas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  region: CtRegion,
  plane: CtPlane,
  win: CtWindow,
  slicePos: number
) {
  const st = WINDOW_STYLES[win];
  const cx = w / 2;
  const cy = h / 2;
  const shift = slicePos * 0.28;
  const scale = 1 - Math.abs(slicePos) * 0.0022;

  ctx.fillStyle = st.bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle diagnostic grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 1;
  for (let gx = 20; gx < w; gx += 20) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 20; gy < h; gy += 20) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  ctx.save();
  if (region === 'brain') {
    if (plane === 'axial') {
      const rx = 74 * scale;
      const ry = 86 * scale;
      // Skull outer & inner table
      ctx.fillStyle = st.bone;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 7, ry + 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = win === 'bone' ? '#0f172a' : st.soft;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Falx cerebri
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - ry + 4);
      ctx.lineTo(cx, cy + ry - 4);
      ctx.stroke();

      // Lateral ventricles & thalamus
      const ventW = Math.max(6, 16 - Math.abs(slicePos) * 0.14);
      ctx.fillStyle = st.air;
      ctx.beginPath();
      ctx.ellipse(cx - 14, cy - 12 + shift * 0.15, ventW * 0.55, 22, -0.22, 0, Math.PI * 2);
      ctx.ellipse(cx + 14, cy - 12 + shift * 0.15, ventW * 0.55, 22, 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Thalamus
      ctx.fillStyle = win === 'bone' ? '#1e293b' : '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(cx - 15, cy + 12, 11, 15, 0.1, 0, Math.PI * 2);
      ctx.ellipse(cx + 15, cy + 12, 11, 15, -0.1, 0, Math.PI * 2);
      ctx.fill();

      drawMarker(ctx, cx - 14, cy - 14, 48, 36, '侧脑室', st.accent);
      drawMarker(ctx, cx + 15, cy + 12, 290, 128, '丘脑', '#fbbf24');
      drawMarker(ctx, cx + rx + 3, cy - 30, 290, 56, '颅骨板障', '#f8fafc');
    } else if (plane === 'sagittal') {
      // Cranial vault
      ctx.fillStyle = st.bone;
      ctx.beginPath();
      ctx.ellipse(cx + shift * 0.2, cy - 4, 88, 72, -0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = win === 'bone' ? '#0f172a' : st.soft;
      ctx.beginPath();
      ctx.ellipse(cx + shift * 0.2, cy - 4, 80, 64, -0.05, 0, Math.PI * 2);
      ctx.fill();

      // Corpus callosum
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 34, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Ventricle & Thalamus
      ctx.fillStyle = st.air;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 8, 22, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(cx + 2, cy + 8, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Brainstem & Cerebellum
      ctx.fillStyle = win === 'bone' ? '#334155' : '#7c8ea6';
      ctx.beginPath();
      ctx.ellipse(cx + 4, cy + 36, 11, 22, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 34, cy + 32, 22, 18, -0.1, 0, Math.PI * 2);
      ctx.fill();

      drawMarker(ctx, cx - 10, cy - 34, 58, 32, '胼胝体', st.accent);
      drawMarker(ctx, cx + 2, cy + 8, 58, 118, '丘脑', '#fbbf24');
      drawMarker(ctx, cx + 36, cy + 32, 286, 148, '小脑/脑干', '#34d399');
    } else {
      // Coronal brain
      ctx.fillStyle = st.bone;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 78 * scale, 74 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = win === 'bone' ? '#0f172a' : st.soft;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 71 * scale, 67 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(226, 232, 240, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 60);
      ctx.lineTo(cx, cy + 12);
      ctx.stroke();

      // Butterfly lateral ventricles
      ctx.fillStyle = st.air;
      ctx.beginPath();
      ctx.ellipse(cx - 12, cy - 12, 10, 7, -0.4, 0, Math.PI * 2);
      ctx.ellipse(cx + 12, cy - 12, 10, 7, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Thalami
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(cx - 13, cy + 8, 11, 13, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 13, cy + 8, 11, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      drawMarker(ctx, cx - 12, cy - 12, 52, 42, '侧脑室', st.accent);
      drawMarker(ctx, cx + 13, cy + 8, 286, 115, '丘脑', '#fbbf24');
      drawMarker(ctx, cx - 50, cy + 28, 52, 152, '颞叶', '#34d399');
    }
  } else if (region === 'chest') {
    if (plane === 'axial') {
      // Thoracic wall & ribs
      ctx.strokeStyle = st.bone;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 104 * scale, 74 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = st.soft;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 99 * scale, 69 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lung fields
      ctx.fillStyle = win === 'lung' ? '#040914' : st.air;
      ctx.beginPath();
      ctx.ellipse(cx - 42, cy + 2, 38 * scale, 50 * scale, 0.12, 0, Math.PI * 2);
      ctx.ellipse(cx + 42, cy + 2, 38 * scale, 50 * scale, -0.12, 0, Math.PI * 2);
      ctx.fill();

      if (win === 'lung') {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 24, cy);
        ctx.lineTo(cx - 64, cy - 22);
        ctx.moveTo(cx - 24, cy + 4);
        ctx.lineTo(cx - 60, cy + 26);
        ctx.moveTo(cx + 24, cy);
        ctx.lineTo(cx + 64, cy - 22);
        ctx.moveTo(cx + 24, cy + 4);
        ctx.lineTo(cx + 60, cy + 26);
        ctx.stroke();
      }

      // Heart & mediastinum
      ctx.fillStyle = win === 'mediastinum' ? '#94a3b8' : '#64748b';
      ctx.beginPath();
      ctx.ellipse(cx + 8, cy - 10 + shift * 0.15, 25, 30, -0.25, 0, Math.PI * 2);
      ctx.fill();

      // Thoracic vertebra
      ctx.fillStyle = st.bone;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 54, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      drawMarker(ctx, cx - 44, cy - 10, 44, 38, '肺野', st.accent);
      drawMarker(ctx, cx + 10, cy - 12, 286, 44, '心脏/纵隔', '#f59e0b');
      drawMarker(ctx, cx, cy + 54, 286, 166, '胸椎', '#f8fafc');
    } else if (plane === 'sagittal') {
      // Chest wall & lung
      ctx.fillStyle = st.air;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 66, 78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = st.bone;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Sternum (anterior) & Thoracic spine (posterior)
      ctx.fillStyle = st.bone;
      ctx.fillRect(cx - 64, cy - 52, 8, 86);
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(cx + 46, cy - 62 + i * 22, 14, 16);
      }

      // Heart shadow
      ctx.fillStyle = win === 'mediastinum' ? '#94a3b8' : '#475569';
      ctx.beginPath();
      ctx.ellipse(cx - 20, cy + 16, 28, 32, 0.2, 0, Math.PI * 2);
      ctx.fill();

      drawMarker(ctx, cx - 60, cy - 16, 48, 48, '胸骨', '#f8fafc');
      drawMarker(ctx, cx - 18, cy + 16, 48, 138, '纵隔心脏', '#f59e0b');
      drawMarker(ctx, cx + 52, cy - 20, 290, 72, '胸椎序列', st.accent);
    } else {
      // Coronal chest
      ctx.fillStyle = st.air;
      ctx.beginPath();
      ctx.ellipse(cx - 42, cy + 4, 36, 66, 0.08, 0, Math.PI * 2);
      ctx.ellipse(cx + 42, cy + 4, 36, 66, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = st.bone;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Trachea & carina
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 72);
      ctx.lineTo(cx, cy - 24);
      ctx.lineTo(cx - 24, cy - 6);
      ctx.moveTo(cx, cy - 24);
      ctx.lineTo(cx + 24, cy - 6);
      ctx.stroke();

      // Heart
      ctx.fillStyle = win === 'mediastinum' ? '#94a3b8' : '#64748b';
      ctx.beginPath();
      ctx.ellipse(cx + 12, cy + 28, 28, 34, -0.15, 0, Math.PI * 2);
      ctx.fill();

      drawMarker(ctx, cx, cy - 42, 48, 36, '气管/隆突', st.accent);
      drawMarker(ctx, cx - 44, cy + 6, 48, 128, '左/右肺野', '#22d3ee');
      drawMarker(ctx, cx + 14, cy + 28, 288, 142, '心脏纵隔', '#f59e0b');
    }
  } else if (region === 'abdomen') {
    if (plane === 'axial') {
      ctx.fillStyle = st.soft;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 102 * scale, 72 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = st.bone;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Liver (patient right = screen left)
      ctx.fillStyle = '#7c8ea6';
      ctx.beginPath();
      ctx.ellipse(cx - 46, cy - 8, 36, 42, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Stomach (anterior left) & Spleen (posterior left)
      ctx.fillStyle = st.air;
      ctx.beginPath();
      ctx.ellipse(cx + 26, cy - 24, 22, 15, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(cx + 66, cy + 6, 18, 26, 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Kidneys & Lumbar spine
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(cx - 32, cy + 30, 15, 19, 0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + 32, cy + 30, 15, 19, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = st.bone;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 44, 15, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      drawMarker(ctx, cx - 50, cy - 12, 42, 34, '肝脏', st.accent);
      drawMarker(ctx, cx + 26, cy - 24, 288, 34, '胃泡', '#34d399');
      drawMarker(ctx, cx + 68, cy + 8, 288, 92, '脾脏', '#f59e0b');
      drawMarker(ctx, cx + 32, cy + 30, 288, 156, '双肾/腰椎', '#a78bfa');
    } else if (plane === 'sagittal') {
      ctx.fillStyle = st.soft;
      ctx.fillRect(cx - 70, cy - 76, 140, 152);
      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.strokeRect(cx - 70, cy - 76, 140, 152);

      // Liver/stomach anterior
      ctx.fillStyle = '#7c8ea6';
      ctx.beginPath();
      ctx.ellipse(cx - 26, cy - 26, 28, 32, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Abdominal aorta
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx + 12, cy - 70);
      ctx.lineTo(cx + 12, cy + 68);
      ctx.stroke();

      // Lumbar vertebrae
      ctx.fillStyle = st.bone;
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(cx + 34, cy - 66 + i * 28, 20, 20);
      }

      drawMarker(ctx, cx - 26, cy - 26, 46, 44, '肝脏/胃', st.accent);
      drawMarker(ctx, cx + 12, cy + 8, 46, 132, '腹主动脉', '#ef4444');
      drawMarker(ctx, cx + 44, cy - 10, 290, 82, '腰椎序列', '#f8fafc');
    } else {
      // Coronal abdomen
      ctx.fillStyle = st.soft;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 86, 80, 0, 0, Math.PI * 2);
      ctx.fill();

      // Liver (screen left) & Spleen (screen right)
      ctx.fillStyle = '#7c8ea6';
      ctx.beginPath();
      ctx.ellipse(cx - 42, cy - 28, 32, 34, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(cx + 48, cy - 30, 20, 26, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Kidneys
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(cx - 34, cy + 24, 15, 24, 0.1, 0, Math.PI * 2);
      ctx.ellipse(cx + 34, cy + 18, 15, 24, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Lumbar spine
      ctx.fillStyle = st.bone;
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(cx - 11, cy - 60 + i * 26, 22, 18);
      }

      drawMarker(ctx, cx - 44, cy - 28, 46, 36, '肝脏', st.accent);
      drawMarker(ctx, cx + 48, cy - 30, 290, 36, '脾脏', '#f59e0b');
      drawMarker(ctx, cx + 34, cy + 20, 290, 140, '双肾/腰椎', '#a78bfa');
    }
  } else {
    // Pelvis
    if (plane === 'axial') {
      ctx.fillStyle = st.soft;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 98 * scale, 68 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Iliac bones
      ctx.strokeStyle = st.bone;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(cx - 46, cy + 6, 40, Math.PI * 0.65, Math.PI * 1.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 46, cy + 6, 40, -Math.PI * 0.45, Math.PI * 0.35);
      ctx.stroke();

      // Sacrum
      ctx.fillStyle = st.bone;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 46, 24, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bladder (anterior), Uterus (middle), Rectum (posterior)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 28, 28, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.air;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 24, 12, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      drawMarker(ctx, cx, cy - 28, 46, 36, '膀胱', st.accent);
      drawMarker(ctx, cx, cy + 2, 288, 86, '子宫', '#f472b6');
      drawMarker(ctx, cx, cy + 46, 288, 160, '骶骨/直肠', '#f8fafc');
    } else if (plane === 'sagittal') {
      ctx.fillStyle = st.soft;
      ctx.fillRect(cx - 72, cy - 72, 144, 144);

      // Pubic symphysis
      ctx.fillStyle = st.bone;
      ctx.beginPath();
      ctx.ellipse(cx - 48, cy + 16, 9, 18, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Sacrum curve
      ctx.strokeStyle = st.bone;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(cx + 24, cy + 4, 42, -0.4, 1.2);
      ctx.stroke();

      // Bladder, Uterus, Rectum
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(cx - 26, cy + 4, 18, 20, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(cx + 4, cy - 8, 20, 12, -0.4, 0, Math.PI * 2);
      ctx.fill();

      drawMarker(ctx, cx - 26, cy + 4, 46, 52, '膀胱', st.accent);
      drawMarker(ctx, cx + 4, cy - 8, 288, 52, '子宫', '#f472b6');
      drawMarker(ctx, cx + 58, cy + 24, 288, 142, '骶尾骨', '#f8fafc');
    } else {
      // Coronal pelvis
      ctx.strokeStyle = st.bone;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 78, 56, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 18, 28, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 12, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      drawMarker(ctx, cx - 74, cy - 14, 46, 42, '髂骨翼', '#f8fafc');
      drawMarker(ctx, cx, cy - 12, 288, 54, '子宫', '#f472b6');
      drawMarker(ctx, cx, cy + 18, 288, 138, '膀胱', st.accent);
    }
  }
  ctx.restore();

  // Orientation labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  const orient =
    plane === 'axial'
      ? { top: 'A', bottom: 'P', left: 'R', right: 'L' }
      : plane === 'sagittal'
      ? { top: 'S', bottom: 'I', left: 'A', right: 'P' }
      : { top: 'S', bottom: 'I', left: 'R', right: 'L' };
  ctx.fillText(orient.top, cx - 4, 13);
  ctx.fillText(orient.bottom, cx - 4, h - 6);
  ctx.fillText(orient.left, 7, cy + 3);
  ctx.fillText(orient.right, w - 15, cy + 3);

  // HUD metadata
  ctx.fillStyle = st.accent;
  ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText(`${REGION_LABELS[region]} · ${PLANE_LABELS[plane]}`, 8, 14);
  ctx.fillText(`${st.label} (${st.wl}) | Z:${slicePos}mm`, 8, h - 7);
                  }
export function CtAndNotesPanel() {
  const [plane, setPlane] = useState<CtPlane>('axial');
  const [region, setRegion] = useState<CtRegion>('brain');
  const [win, setWin] = useState<CtWindow>('soft');
  const [slicePos, setSlicePos] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [savedTip, setSavedTip] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    try {
      setNotes(localStorage.getItem('anatomy_r1_notes') || '');
    } catch {
      setNotes('');
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCtAtlas(ctx, canvas.width, canvas.height, region, plane, win, slicePos);
  }, [region, plane, win, slicePos]);

  const meta = getAtlasMeta(region, plane, slicePos);

  const saveNotes = () => {
    try {
      localStorage.setItem('anatomy_r1_notes', notes);
      setSavedTip('已保存至本地浏览器');
      setTimeout(() => setSavedTip(''), 2000);
    } catch {
      setSavedTip('保存失败');
    }
  };

  return (
    <div className="tcm-stack">
      <div className="tcm-item-card static">
        <div className="tcm-item-head">
          <strong>CT/MRI 多平面断层图谱浏览器</strong>
          <span style={{ fontSize: 11, color: '#38bdf8' }}>{WINDOW_STYLES[win].wl}</span>
        </div>

        <div className="tcm-chip-row" style={{ marginTop: 8 }}>
          {(Object.keys(PLANE_LABELS) as CtPlane[]).map((p) => (
            <button
              key={p}
              type="button"
              className={plane === p ? 'active' : ''}
              onClick={() => setPlane(p)}
            >
              {PLANE_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="tcm-chip-row" style={{ marginTop: 6 }}>
          {(Object.keys(REGION_LABELS) as CtRegion[]).map((r) => (
            <button
              key={r}
              type="button"
              className={region === r ? 'active' : ''}
              onClick={() => setRegion(r)}
            >
              {REGION_LABELS[r]}
            </button>
          ))}
        </div>

        <div className="tcm-chip-row" style={{ marginTop: 6 }}>
          {(Object.keys(WINDOW_STYLES) as CtWindow[]).map((wKey) => (
            <button
              key={wKey}
              type="button"
              className={win === wKey ? 'active' : ''}
              onClick={() => setWin(wKey)}
            >
              {WINDOW_STYLES[wKey].label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span>断层位置调节 (Z-Slice)</span>
            <span>{slicePos} mm</span>
          </label>
          <input
            type="range"
            min={-60}
            max={60}
            step={2}
            value={slicePos}
            onChange={(e) => setSlicePos(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#38bdf8' }}
          />
        </div>

        <canvas
          ref={canvasRef}
          width={340}
          height={210}
          style={{ width: '100%', borderRadius: 10, marginTop: 8, background: '#05080f' }}
        />

        <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{meta.title}</div>
          <div style={{ color: '#cbd5e1', marginTop: 4 }}>{meta.anatomy}</div>
          <div style={{ color: '#38bdf8', marginTop: 4 }}>{meta.clinical}</div>
          <div className="tcm-chip-row" style={{ marginTop: 6 }}>
            {meta.landmarks.map((lm) => (
              <span
                key={lm}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(56, 189, 248, 0.14)',
                  color: '#7dd3fc',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                }}
              >
                {lm}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="tcm-item-card static">
        <div className="tcm-item-head">
          <strong>离线本地学习笔记</strong>
          {savedTip && <span style={{ fontSize: 11, color: '#34d399' }}>{savedTip}</span>}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="记录经络/解剖/CT读片要点（自动持久化于 localStorage）..."
          rows={4}
          style={{
            width: '100%',
            marginTop: 8,
            padding: 8,
            borderRadius: 8,
            background: '#0b1220',
            color: '#e2e8f0',
            border: '1px solid #334155',
            fontSize: 12,
            resize: 'vertical',
          }}
        />
        <button
          type="button"
          className="tcm-btn"
          style={{ marginTop: 8, width: '100%' }}
          onClick={saveNotes}
        >
          保存笔记到本地
        </button>
      </div>
    </div>
  );
}

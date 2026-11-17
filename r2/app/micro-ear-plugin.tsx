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

export function MicroEarViewer() {
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
    </div>
  );
}

export function CtAndNotesPanel() {
  const [zPos, setZPos] = useState(0);
  const [note, setNote] = useState(() => {
    try { return localStorage.getItem('anatomy_r1_notes') || ''; } catch { return ''; }
  });
  const cvRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#05070b';
    ctx.fillRect(0, 0, 280, 140);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(140, 70, 96, 54, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ebe2ce';
    ctx.beginPath();
    ctx.arc(140, 108, 12, 0, Math.PI * 2);
    ctx.fill();
    if (zPos > 30) {
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(140, 68, 52, 38, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (zPos >= -20) {
      ctx.fillStyle = 'rgba(253,164,175,0.45)';
      ctx.beginPath();
      ctx.ellipse(90, 68, 28, 34, 0, 0, Math.PI * 2);
      ctx.ellipse(190, 68, 28, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(152, 64, 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.ellipse(95, 62, 34, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(175, 68, 28, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f59e0b';
    ctx.font = '11px sans-serif';
    ctx.fillText(zPos > 30 ? '颅脑横断面 (CT/MRI)' : zPos >= -20 ? '胸部纵隔/肺窗 (CT)' : '上腹部肝胃肾层面 (CT)', 10, 18);
  }, [zPos]);

  return (
    <div className="tcm-stack">
      <div className="tcm-item-card static">
        <strong>CT / MRI 横断面影像对照</strong>
        <canvas ref={cvRef} width={280} height={140} style={{ width: '100%', borderRadius: 10, marginTop: 8 }} />
        <input
          type="range"
          min={-60}
          max={60}
          value={zPos}
          onChange={(e) => setZPos(Number(e.target.value))}
          style={{ width: '100%', marginTop: 6 }}
        />
      </div>
      <div className="tcm-item-card static">
        <strong>离线临床学习笔记（自动本地保存）</strong>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            try { localStorage.setItem('anatomy_r1_notes', e.target.value); } catch {}
          }}
          placeholder="记录穴位取穴心得、解剖毗邻或护理要点（纯离线保存在本机）..."
          style={{ width: '100%', minHeight: 96, marginTop: 8, padding: 8, borderRadius: 10, background: '#05070b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12 }}
        />
      </div>
    </div>
  );
}

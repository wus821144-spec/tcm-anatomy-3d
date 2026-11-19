import * as T from 'three';
import type { ExtraAnatMeta } from './r2-lymphatic-builder';
type RegionKey = ExtraAnatMeta['region'];
type MatKind = 'fibrous' | 'flavum' | 'membrane';
type ShapeKind = 'cord' | 'band' | 'sheet' | 'ring' | 'y_band' | 'triangle';

interface LigamentSpec {
  id: string;
  name: string;
  en: string;
  region: RegionKey;
  desc: string;
  clinical: string;
  mat?: MatKind;
  shape: ShapeKind;
  pts: [number, number, number][];
  radius?: number;
  width?: number;
  hitRadius?: number;
  pelvisAdapt?: boolean;
  subpubicAdapt?: boolean;
  bilateral?: boolean;
}

function createFibrousBumpTexture(): T.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#909090';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 64; i++) {
    const x = i * 2;
    const shade = 110 + Math.round(Math.sin(i * 0.85) * 45 + (i % 3) * 12);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(x, 0, 1, 128);
  }
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = T.RepeatWrapping;
  tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(3, 6);
  return tex;
}

function createLigamentMaterials(): Record<MatKind, T.MeshStandardMaterial> {
  const bump = createFibrousBumpTexture();
  const baseBump = bump ? { bumpMap: bump, bumpScale: 0.008 } : {};
  return {
    fibrous: new T.MeshStandardMaterial({
      color: 0xe6f0fa,
      emissive: 0x1a2838,
      emissiveIntensity: 0.14,
      roughness: 0.55,
      metalness: 0.08,
      transparent: true,
      opacity: 0.86,
      side: T.DoubleSide,
      ...baseBump,
    }),
    flavum: new T.MeshStandardMaterial({
      color: 0xf4df7d,
      emissive: 0x3a3008,
      emissiveIntensity: 0.14,
      roughness: 0.55,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
      side: T.DoubleSide,
      ...baseBump,
    }),
    membrane: new T.MeshStandardMaterial({
      color: 0xd8e8f8,
      emissive: 0x152230,
      emissiveIntensity: 0.12,
      roughness: 0.55,
      metalness: 0.06,
      transparent: true,
      opacity: 0.72,
      side: T.DoubleSide,
      ...baseBump,
    }),
  };
}
function buildRibbonGeometry(curve: T.CatmullRomCurve3, width: number, segments = 16): T.BufferGeometry {
  const pts = curve.getPoints(segments);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const half = width * 0.5;
  const fallbackUp = new T.Vector3(0, 1, 0);
  const altUp = new T.Vector3(1, 0, 0);

  for (let i = 0; i < pts.length; i++) {
    const t = i / segments;
    const tan = curve.getTangent(t).normalize();
    const ref = Math.abs(tan.dot(fallbackUp)) > 0.92 ? altUp : fallbackUp;
    const side = new T.Vector3().crossVectors(tan, ref).normalize().multiplyScalar(half);
    const pL = pts[i].clone().add(side);
    const pR = pts[i].clone().sub(side);
    positions.push(pL.x, pL.y, pL.z, pR.x, pR.y, pR.z);
    uvs.push(0, t, 1, t);
    if (i < pts.length - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildSheetGeometry(vecs: T.Vector3[]): T.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < vecs.length; i++) {
    positions.push(vecs[i].x, vecs[i].y, vecs[i].z);
    uvs.push(i % 2, Math.floor(i / 2) * 0.5);
  }
  for (let i = 1; i < vecs.length - 1; i++) {
    indices.push(0, i, i + 1);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createLigamentObject(
  shape: ShapeKind,
  vecs: T.Vector3[],
  s: number,
  mat: T.MeshStandardMaterial,
  meta: ExtraAnatMeta,
  radiusMul = 0.0028,
  widthMul = 0.009
): T.Object3D {
  const r = Math.max(0.0012, s * radiusMul);
  const w = Math.max(0.003, s * widthMul);
  let obj: T.Object3D;

  if (shape === 'y_band' && vecs.length >= 4) {
    const grp = new T.Group();
    const c1 = new T.CatmullRomCurve3([vecs[0], vecs[1], vecs[2]]);
    const c2 = new T.CatmullRomCurve3([vecs[1], vecs[3]]);
    const m1 = new T.Mesh(buildRibbonGeometry(c1, w, 12), mat);
    const m2 = new T.Mesh(buildRibbonGeometry(c2, w * 0.9, 8), mat);
    m1.userData.extraInfo = meta;
    m1.userData.region = meta.region;
    m2.userData.extraInfo = meta;
    m2.userData.region = meta.region;
    grp.add(m1, m2);
    obj = grp;
  } else if (shape === 'ring') {
    const curve = new T.CatmullRomCurve3(vecs, true);
    obj = new T.Mesh(new T.TubeGeometry(curve, 20, r, 8, true), mat);
  } else if (shape === 'sheet' || shape === 'triangle') {
    obj = new T.Mesh(buildSheetGeometry(vecs), mat);
  } else if (shape === 'band') {
    const curve = new T.CatmullRomCurve3(vecs);
    obj = new T.Mesh(buildRibbonGeometry(curve, w, Math.max(10, vecs.length * 5)), mat);
  } else {
    const curve = new T.CatmullRomCurve3(vecs);
    obj = new T.Mesh(new T.TubeGeometry(curve, Math.max(8, vecs.length * 6), r, 8, false), mat);
  }

  obj.userData.extraInfo = meta;
  obj.userData.region = meta.region;
  return obj;
}

const FLAVUM_LEVELS: [string, number][] = [
  ['C2-C3', 0.858], ['C3-C4', 0.846], ['C4-C5', 0.834], ['C5-C6', 0.822],
  ['C6-C7', 0.810], ['C7-T1', 0.798], ['T1-T2', 0.784], ['T2-T3', 0.769],
  ['T3-T4', 0.754], ['T4-T5', 0.739], ['T5-T6', 0.724], ['T6-T7', 0.709],
  ['T7-T8', 0.694], ['T8-T9', 0.679], ['T9-T10', 0.664], ['T10-T11', 0.649],
  ['T11-T12', 0.634], ['T12-L1', 0.618], ['L1-L2', 0.598], ['L2-L3', 0.578],
  ['L3-L4', 0.558], ['L4-L5', 0.538], ['L5-S1', 0.518],
];

function makeFlavumSpecs(): LigamentSpec[] {
  const out: LigamentSpec[] = [];
  for (const [lvl, ny] of FLAVUM_LEVELS) {
    const region: RegionKey = ny > 0.79 ? 'head' : ny < 0.525 ? 'pelvis' : 'torso';
    out.push({
      id: `lig_flavum_${lvl.toLowerCase()}`,
      name: `${lvl} 黄韧带`,
      en: `Ligamentum Flavum (${lvl})`,
      region,
      mat: 'flavum',
      shape: 'band',
      bilateral: true,
      pts: [[0.008, ny + 0.005, -0.028], [0.014, ny - 0.005, -0.029]],
      width: 0.007,
      desc: `连接 ${lvl} 相邻椎板之间的淡黄色弹性纤维韧带，构成椎管后壁。`,
      clinical: '肥厚或钙化可压迫马尾或神经根引起椎管狭窄。',
    });
  }
  return out;
}
  const LIGAMENT_SPECS: LigamentSpec[] = [
  // 1. 颅骨与颞下颌关节
  {
    id: 'lig_tmj_lateral',
    name: '颞下颌韧带（外侧韧带）',
    en: 'Lateral (Temporomandibular) Ligament',
    region: 'head',
    shape: 'band',
    bilateral: true,
    pts: [[0.044, 0.916, 0.014], [0.041, 0.902, 0.008]],
    width: 0.006,
    desc: '起自颧弓下缘至下颌颈外侧，限制下颌过度后退与张口。',
    clinical: '颞下颌关节紊乱病（TMD）弹响与压痛常见累及结构。',
  },
  {
    id: 'lig_sphenomandibular',
    name: '蝶下颌韧带',
    en: 'Sphenomandibular Ligament',
    region: 'head',
    shape: 'band',
    bilateral: true,
    pts: [[0.024, 0.914, 0.010], [0.036, 0.892, 0.012]],
    width: 0.005,
    desc: '起自蝶骨棘至下颌小舌，作为下颌运动悬吊支点。',
    clinical: '下牙槽神经阻滞麻醉的重要深部解剖标志。',
  },
  {
    id: 'lig_stylomandibular',
    name: '茎突下颌韧带',
    en: 'Stylomandibular Ligament',
    region: 'head',
    shape: 'cord',
    bilateral: true,
    pts: [[0.032, 0.906, -0.004], [0.038, 0.886, 0.008]],
    desc: '起自颞骨茎突至下颌角后缘，分隔腮腺与下颌下腺。',
    clinical: '茎突过长综合征可牵拉引起咽部及耳部放射痛。',
  },
  {
    id: 'lig_pterygospinous',
    name: '翼棘韧带',
    en: 'Pterygospinous Ligament',
    region: 'head',
    shape: 'cord',
    bilateral: true,
    pts: [[0.018, 0.915, 0.018], [0.025, 0.912, 0.006]],
    desc: '连接蝶骨翼突外侧板后缘与蝶骨棘，可部分骨化形成翼棘孔。',
    clinical: '骨化时可能卡压下颌神经分支导致三叉神经痛。',
  },
  {
    id: 'lig_petrosphenoidal',
    name: '岩蝶韧带（Gruber 韧带）',
    en: 'Petrosphenoidal Ligament',
    region: 'head',
    shape: 'cord',
    bilateral: true,
    pts: [[0.016, 0.922, 0.002], [0.011, 0.924, 0.011]],
    desc: '跨越颞骨岩部尖与蝶骨鞍背之间，构成 Dorello 管上壁。',
    clinical: '外展神经经其下方穿行，颅内压升高或岩尖炎易受压麻痹。',
  },

  // 2. 脊柱全段
  {
    id: 'lig_tectorial_membrane',
    name: '覆膜',
    en: 'Tectorial Membrane',
    region: 'head',
    mat: 'membrane',
    shape: 'band',
    pts: [[0, 0.886, -0.018], [0, 0.870, -0.020], [0, 0.858, -0.021]],
    width: 0.011,
    desc: '后纵韧带向颅内延续的宽阔纤维膜，覆盖齿突与十字韧带后面。',
    clinical: '限制寰枕及寰枢关节过度屈曲与伸展。',
  },
  {
    id: 'lig_cruciate_atlas',
    name: '寰椎十字韧带（横韧带+上下纵束）',
    en: 'Cruciate Ligament of Atlas',
    region: 'head',
    shape: 'band',
    pts: [[-0.011, 0.876, -0.015], [0, 0.876, -0.016], [0.011, 0.876, -0.015]],
    width: 0.006,
    desc: '由寰椎横韧带及上下纵束组成，将枢椎齿突固定于寰椎前弓后方。',
    clinical: '类风湿关节炎或外伤致横韧带断裂可引发致命性寰枢椎脱位。',
  },
  {
    id: 'lig_cruciate_longitudinal',
    name: '十字韧带上下纵束',
    en: 'Longitudinal Bands of Cruciate Ligament',
    region: 'head',
    shape: 'cord',
    pts: [[0, 0.885, -0.016], [0, 0.876, -0.016], [0, 0.866, -0.017]],
    desc: '上连枕骨大孔前缘、下连枢椎体后面，与寰椎横韧带垂直交叉。',
    clinical: '协同横韧带维持上颈椎矢状面稳定性。',
  },
  {
    id: 'lig_apical_dens',
    name: '齿突尖韧带',
    en: 'Apical Ligament of Dens',
    region: 'head',
    shape: 'cord',
    pts: [[0, 0.886, -0.012], [0, 0.878, -0.013]],
    desc: '连接枢椎齿突尖与枕骨大孔前缘，为脊索发育遗迹。',
    clinical: '协同翼状韧带限制颅颈结合部垂直牵拉。',
  },
  {
    id: 'lig_alar',
    name: '翼状韧带',
    en: 'Alar Ligament',
    region: 'head',
    shape: 'cord',
    bilateral: true,
    pts: [[0.003, 0.879, -0.013], [0.012, 0.884, -0.011]],
    desc: '自齿突尖两侧斜向上外止于枕骨髁内侧面，左右各一。',
    clinical: '主要限制头部过度旋转与侧屈，挥鞭伤中易受损。',
  },
  {
    id: 'lig_atlanto_occipital_ant',
    name: '寰枕前膜',
    en: 'Anterior Atlanto-occipital Membrane',
    region: 'head',
    mat: 'membrane',
    shape: 'band',
    pts: [[0, 0.886, -0.006], [0, 0.876, -0.007]],
    width: 0.015,
    desc: '连接枕骨大孔前缘与寰椎前弓上缘，向下延续为前纵韧带。',
    clinical: '限制寰枕关节过度后伸。',
  },
  {
    id: 'lig_atlanto_occipital_post',
    name: '寰枕后膜',
    en: 'Posterior Atlanto-occipital Membrane',
    region: 'head',
    mat: 'membrane',
    shape: 'band',
    pts: [[0, 0.885, -0.032], [0, 0.874, -0.033]],
    width: 0.016,
    desc: '连接枕骨大孔后缘与寰椎后弓上缘，外侧弓下有椎动脉穿行。',
    clinical: '椎动脉沟环形成（Kimmerle 畸形）可压迫椎动脉引发眩晕。',
  },
  {
    id: 'lig_atlanto_axial_ant',
    name: '寰枢前韧带',
    en: 'Anterior Atlanto-axial Ligament',
    region: 'head',
    shape: 'band',
    pts: [[0, 0.875, -0.007], [0, 0.863, -0.008]],
    width: 0.013,
    desc: '连接寰椎前弓下缘与枢椎体前面，加强寰枢正中关节前方。',
    clinical: '颈椎过伸损伤时可发生撕裂。',
  },
  {
    id: 'lig_atlanto_axial_post',
    name: '寰枢后韧带',
    en: 'Posterior Atlanto-axial Ligament',
    region: 'head',
    shape: 'band',
    pts: [[0, 0.873, -0.032], [0, 0.861, -0.033]],
    width: 0.014,
    desc: '连接寰椎后弓下缘与枢椎椎板上缘，相当于上位黄韧带。',
    clinical: '构成上颈段椎管后壁保护脊髓。',
  },
  {
    id: 'lig_all',
    name: '前纵韧带',
    en: 'Anterior Longitudinal Ligament (ALL)',
    region: 'torso',
    shape: 'band',
    pts: [
      [0, 0.862, -0.008], [0, 0.790, -0.010], [0, 0.700, -0.016],
      [0, 0.600, -0.012], [0, 0.520, -0.008], [0, 0.465, -0.018],
    ],
    width: 0.014,
    desc: '贴附于全段椎体及椎间盘前面，上起枕骨基底下至骶骨前面。',
    clinical: '限制脊柱过度后伸，弥漫性特发性骨肥厚（DISH）好发部位。',
  },
  {
    id: 'lig_pll',
    name: '后纵韧带',
    en: 'Posterior Longitudinal Ligament (PLL)',
    region: 'torso',
    shape: 'band',
    pts: [
      [0, 0.858, -0.020], [0, 0.790, -0.022], [0, 0.700, -0.028],
      [0, 0.600, -0.024], [0, 0.520, -0.020], [0, 0.468, -0.026],
    ],
    width: 0.009,
    desc: '位于椎管前壁、椎体后面，呈扇形跨过椎间盘后缘。',
    clinical: '后纵韧带骨化症（OPLL）常致颈胸段脊髓压迫；腰段较窄故椎间盘多向后外侧突出。',
  },
  ...makeFlavumSpecs(),
  {
    id: 'lig_interspinous',
    name: '棘间韧带',
    en: 'Interspinous Ligament',
    region: 'torso',
    mat: 'membrane',
    shape: 'band',
    pts: [
      [0, 0.840, -0.037], [0, 0.760, -0.044], [0, 0.660, -0.048],
      [0, 0.570, -0.040], [0, 0.515, -0.036],
    ],
    width: 0.008,
    desc: '连接相邻棘突之间的薄层纤维膜，前接黄韧带、后连棘上韧带。',
    clinical: '腰椎棘间韧带劳损或断裂是慢性下腰痛的重要原因。',
  },
  {
    id: 'lig_supraspinous',
    name: '棘上韧带',
    en: 'Supraspinous Ligament',
    region: 'torso',
    shape: 'cord',
    pts: [
      [0, 0.795, -0.043], [0, 0.710, -0.050], [0, 0.620, -0.048],
      [0, 0.550, -0.042], [0, 0.510, -0.038],
    ],
    radius: 0.0026,
    desc: '连接 C7 至骶中嵴各棘突尖端的强韧纤维索，向上续于项韧带。',
    clinical: '久坐弯腰易致棘上韧带炎，腰椎穿刺需经此韧带。',
  },
  {
    id: 'lig_nuchal',
    name: '项韧带（矢状位三角膜）',
    en: 'Nuchal Ligament',
    region: 'head',
    mat: 'membrane',
    shape: 'triangle',
    pts: [[0, 0.888, -0.038], [0, 0.842, -0.035], [0, 0.796, -0.044]],
    desc: '呈矢状位三角形纤维弹性膜，上附枕外隆凸，下接 C7 棘突与棘上韧带。',
    clinical: '颈部后伸肌群重要附着点，颈椎病常伴项韧带钙化。',
  },
  {
    id: 'lig_intertransverse',
    name: '横突间韧带',
    en: 'Intertransverse Ligament',
    region: 'torso',
    shape: 'cord',
    bilateral: true,
    pts: [
      [0.022, 0.840, -0.025], [0.026, 0.720, -0.032],
      [0.025, 0.600, -0.028], [0.024, 0.525, -0.026],
    ],
    radius: 0.002,
    desc: '连接相邻椎骨横突之间的纤维束，腰段最发达呈膜状。',
    clinical: '限制脊柱向对侧过度侧屈。',
  },
  {
    id: 'lig_sacrococcygeal_ant',
    name: '骶尾前韧带',
    en: 'Anterior Sacrococcygeal Ligament',
    region: 'pelvis',
    shape: 'band',
    pts: [[0, 0.448, -0.025], [0, 0.432, -0.020]],
    width: 0.009,
    desc: '前纵韧带向下延续，覆盖骶尾联合前面。',
    clinical: '稳定骶尾关节，分娩时允许尾骨适度后移。',
  },
  {
    id: 'lig_sacrococcygeal_post',
    name: '骶尾后韧带（深/浅）',
    en: 'Posterior Sacrococcygeal Ligament',
    region: 'pelvis',
    shape: 'band',
    pts: [[0, 0.450, -0.036], [0, 0.432, -0.030]],
    width: 0.011,
    desc: '封闭骶管裂孔，连接骶管背面与尾骨背面。',
    clinical: '骶管阻滞麻醉穿刺须经此韧带进入骶管。',
  },
  {
    id: 'lig_sacrococcygeal_lat',
    name: '骶尾外侧韧带',
    en: 'Lateral Sacrococcygeal Ligament',
    region: 'pelvis',
    shape: 'cord',
    bilateral: true,
    pts: [[0.015, 0.448, -0.031], [0.010, 0.435, -0.026]],
    desc: '连接骶骨下外侧角与尾骨横突，围成第 5 骶神经前支通道。',
    clinical: '尾骨痛（coccydynia）外伤后常累及此韧带牵拉。',
  },

  // 3. 胸廓关节
  {
    id: 'lig_radiate_rib_head',
    name: '肋头辐状韧带',
    en: 'Radiate Ligament of Head of Rib',
    region: 'torso',
    shape: 'band',
    bilateral: true,
    pts: [[0.024, 0.720, -0.022], [0.012, 0.722, -0.015]],
    width: 0.008,
    desc: '呈扇形辐射连接肋头前面与相邻两椎体及椎间盘。',
    clinical: '加固肋头关节前方，维持呼吸时肋骨旋转支点。',
  },
  {
    id: 'lig_intraarticular_rib_head',
    name: '肋头关节囊内韧带',
    en: 'Intra-articular Ligament of Head of Rib',
    region: 'torso',
    shape: 'cord',
    bilateral: true,
    pts: [[0.020, 0.720, -0.020], [0.013, 0.720, -0.018]],
    desc: '自肋头嵴连至椎间盘纤维环，将第 2–10 肋头关节分为上下两腔。',
    clinical: '胸椎侧凸或肋椎关节半脱位时产生局部背痛。',
  },
  {
    id: 'lig_costotransverse',
    name: '肋横突韧带',
    en: 'Costotransverse Ligament',
    region: 'torso',
    shape: 'cord',
    bilateral: true,
    pts: [[0.026, 0.718, -0.030], [0.034, 0.717, -0.028]],
    desc: '充填于肋颈与相应椎骨横突之间的短粗韧带。',
    clinical: '限制肋横突关节前后向滑移。',
  },
  {
    id: 'lig_costotransverse_sup',
    name: '肋横突上韧带',
    en: 'Superior Costotransverse Ligament',
    region: 'torso',
    shape: 'band',
    bilateral: true,
    pts: [[0.032, 0.718, -0.029], [0.028, 0.731, -0.031]],
    width: 0.007,
    desc: '起自肋颈上嵴斜向上连至上位椎骨横突下面。',
    clinical: '与肋间后血管神经关系密切，胸椎旁阻滞标志。',
  },
  {
    id: 'lig_costotransverse_lat',
    name: '肋横突外侧韧带',
    en: 'Lateral Costotransverse Ligament',
    region: 'torso',
    shape: 'cord',
    bilateral: true,
    pts: [[0.028, 0.718, -0.032], [0.038, 0.716, -0.030]],
    desc: '连接横突尖端与肋结节非关节面，位于肋横突关节后外侧。',
    clinical: '加强肋横突关节后方稳定。',
  },
  {
    id: 'lig_radiate_sternocostal',
    name: '胸肋辐状韧带',
    en: 'Radiate Sternocostal Ligament',
    region: 'torso',
    shape: 'band',
    bilateral: true,
    pts: [[0.026, 0.715, 0.068], [0.008, 0.716, 0.072]],
    width: 0.009,
    desc: '自第 2–7 肋软骨端呈扇形辐射至胸骨前后面，构成胸骨膜。',
    clinical: '肋软骨炎（Tietze 综合征）常伴此区域肿痛。',
  },
  {
    id: 'lig_costoxiphoid',
    name: '肋剑韧带',
    en: 'Costoxiphoid Ligament',
    region: 'torso',
    shape: 'band',
    bilateral: true,
    pts: [[0.024, 0.658, 0.066], [0.006, 0.652, 0.070]],
    width: 0.007,
    desc: '连接第 7 肋软骨前后面与剑突前后面。',
    clinical: '剑突综合征或上腹外伤时易受牵拉疼痛。',
  },
      // 4. 上肢带与自由上肢
  {
    id: 'lig_sternoclavicular_ant',
    name: '胸锁前韧带',
    en: 'Anterior Sternoclavicular Ligament',
    region: 'torso',
    shape: 'band',
    bilateral: true,
    pts: [[0.012, 0.788, 0.068], [0.028, 0.793, 0.064]],
    width: 0.008,
    desc: '覆盖胸锁关节前面，自锁骨胸骨端斜向下内止于胸骨柄前缘。',
    clinical: '限制锁骨过度前脱位与后伸。',
  },
  {
    id: 'lig_sternoclavicular_post',
    name: '胸锁后韧带',
    en: 'Posterior Sternoclavicular Ligament',
    region: 'torso',
    shape: 'band',
    bilateral: true,
    pts: [[0.012, 0.788, 0.056], [0.028, 0.793, 0.052]],
    width: 0.008,
    desc: '加强胸锁关节后面，毗邻颈根部大血管与气管。',
    clinical: '胸锁关节后脱位可压迫头臂静脉、气管或食管。',
  },
  {
    id: 'lig_interclavicular',
    name: '锁间韧带',
    en: 'Interclavicular Ligament',
    region: 'torso',
    shape: 'cord',
    pts: [[-0.026, 0.794, 0.060], [0, 0.788, 0.063], [0.026, 0.794, 0.060]],
    desc: '横跨胸骨颈静脉切迹上方连接左右锁骨胸骨端。',
    clinical: '防止上肢过度下垂时锁骨内侧端向上脱位。',
  },
  {
    id: 'lig_costoclavicular',
    name: '肋锁韧带',
    en: 'Costoclavicular Ligament',
    region: 'torso',
    shape: 'band',
    bilateral: true,
    pts: [[0.036, 0.780, 0.058], [0.042, 0.793, 0.056]],
    width: 0.009,
    desc: '短而坚韧，斜行于第 1 肋软骨上面与锁骨下方肋粗隆之间。',
    clinical: '胸锁关节最主要的稳定结构，限制锁骨过度上抬。',
  },
  {
    id: 'lig_acromioclavicular',
    name: '肩锁韧带',
    en: 'Acromioclavicular Ligament',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.156, 0.806, 0.018], [0.172, 0.805, 0.012]],
    width: 0.008,
    desc: '环绕肩锁关节囊上方与下方，连接锁骨肩峰端与肩峰。',
    clinical: '肩锁关节脱位（Rockwood I–II 型）首先撕裂此韧带。',
  },
  {
    id: 'lig_coracoclavicular_trapezoid',
    name: '喙锁韧带（斜方韧带）',
    en: 'Trapezoid Ligament (Coracoclavicular)',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.146, 0.790, 0.026], [0.158, 0.805, 0.020]],
    width: 0.008,
    desc: '喙锁韧带前外侧部，自喙突上面斜向外上止于锁骨斜方线。',
    clinical: '与锥状韧带共同悬吊上肢，Rockwood III–V 型脱位时断裂。',
  },
  {
    id: 'lig_coracoclavicular_conoid',
    name: '喙锁韧带（锥状韧带）',
    en: 'Conoid Ligament (Coracoclavicular)',
    region: 'arm_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.140, 0.788, 0.020], [0.146, 0.804, 0.016]],
    radius: 0.0026,
    desc: '喙锁韧带后内侧部，呈倒锥形连于喙突根部与锁骨锥状结节。',
    clinical: '限制锁骨向后上方移位的关键韧带。',
  },
  {
    id: 'lig_coracoacromial',
    name: '喙肩韧带',
    en: 'Coracoacromial Ligament',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.144, 0.789, 0.026], [0.172, 0.803, 0.010]],
    width: 0.009,
    desc: '水平跨越喙突与肩峰之间，共同构成喙肩弓。',
    clinical: '肩峰下撞击综合征中冈上肌腱易在此韧带下方磨损。',
  },
  {
    id: 'lig_suprascapular_trans',
    name: '肩胛上横韧带',
    en: 'Superior Transverse Scapular Ligament',
    region: 'arm_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.126, 0.784, -0.026], [0.138, 0.785, -0.024]],
    desc: '架于肩胛切迹上方将其封闭为骨纤维孔。',
    clinical: '肩胛上神经经孔下穿行，过头运动易致卡压综合征。',
  },
  {
    id: 'lig_spinoglenoid',
    name: '肩胛下横韧带（棘盂韧带）',
    en: 'Inferior Transverse Scapular (Spinoglenoid) Ligament',
    region: 'arm_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.144, 0.768, -0.032], [0.156, 0.770, -0.022]],
    desc: '连接肩胛冈外侧缘与肩胛盂后缘，覆盖冈盂切迹。',
    clinical: '盂唇旁囊肿可在此韧带下压迫肩胛上神经冈下支。',
  },
  {
    id: 'lig_coracohumeral',
    name: '喙肱韧带',
    en: 'Coracohumeral Ligament',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.145, 0.788, 0.026], [0.178, 0.778, 0.024]],
    width: 0.008,
    desc: '起自喙突外侧缘至肱骨大、小结节，加强肩关节囊上方。',
    clinical: '粘连性肩关节囊炎（冻结肩）显著增厚挛缩限制外旋。',
  },
  {
    id: 'lig_glenohumeral_sup',
    name: '盂肱上韧带（SGHL）',
    en: 'Superior Glenohumeral Ligament',
    region: 'arm_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.158, 0.782, 0.014], [0.180, 0.778, 0.020]],
    desc: '起自盂上结节至肱骨小结节上方，参与构成肱二头肌长头腱滑车。',
    clinical: '肩袖间隙损伤时常伴 SGHL 撕裂。',
  },
  {
    id: 'lig_glenohumeral_mid',
    name: '盂肱中韧带（MGHL）',
    en: 'Middle Glenohumeral Ligament',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.158, 0.775, 0.016], [0.182, 0.769, 0.022]],
    width: 0.006,
    desc: '起自肩胛盂前上缘斜向外下止于肱骨小结节内侧。',
    clinical: '肩外展 45° 时限制肱骨头向前半脱位。',
  },
  {
    id: 'lig_glenohumeral_inf',
    name: '盂肱下韧带（IGHL）',
    en: 'Inferior Glenohumeral Ligament',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.158, 0.764, 0.014], [0.184, 0.760, 0.014]],
    width: 0.009,
    desc: '呈吊床样包绕肩关节囊下部，分前束、腋囊与后束。',
    clinical: '外展 90° 外旋位最主要的防前脱位稳定器，Bankart 损伤多累及之。',
  },
  {
    id: 'lig_transverse_humeral',
    name: '肱骨横韧带',
    en: 'Transverse Humeral Ligament',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.181, 0.774, 0.024], [0.188, 0.774, 0.022]],
    width: 0.005,
    desc: '横跨肱骨大、小结节之间，将结节间沟封闭为骨纤维管。',
    clinical: '撕裂可导致肱二头肌长头腱半脱位或脱位。',
  },
  {
    id: 'lig_elbow_ucl_ant',
    name: '肘尺侧副韧带 UCL（前束）',
    en: 'Ulnar Collateral Ligament - Anterior Bundle',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.194, 0.632, 0.008], [0.196, 0.614, 0.012]],
    width: 0.006,
    desc: '起自肱骨内上髁至尺骨冠突内侧结节，为抗外翻最核心束。',
    clinical: '投掷运动员撕裂常需行 Tommy John 韧带重建术。',
  },
  {
    id: 'lig_elbow_ucl_post',
    name: '肘尺侧副韧带 UCL（后束）',
    en: 'Ulnar Collateral Ligament - Posterior Bundle',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.194, 0.630, -0.004], [0.198, 0.616, -0.010]],
    width: 0.006,
    desc: '呈扇形连于肱骨内上髁与尺骨鹰嘴内侧缘之间。',
    clinical: '构成肘管底壁，增厚可压迫尺神经。',
  },
  {
    id: 'lig_elbow_ucl_oblique',
    name: '肘尺侧副韧带 UCL（斜束/Cooper 韧带）',
    en: 'Ulnar Collateral Ligament - Oblique Bundle',
    region: 'arm_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.198, 0.616, -0.008], [0.196, 0.614, 0.010]],
    desc: '横向连接鹰嘴与冠突，深化尺骨滑车切迹内侧缘。',
    clinical: '辅助维持肘关节内侧滑车匹配。',
  },
  {
    id: 'lig_elbow_rcl',
    name: '肘桡侧副韧带（RCL）',
    en: 'Radial Collateral Ligament of Elbow',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.222, 0.632, 0.004], [0.224, 0.614, 0.008]],
    width: 0.006,
    desc: '起自肱骨外上髁向下呈扇形止于桡骨环状韧带及尺骨旋后肌嵴。',
    clinical: '维持肘关节外侧稳定性，外侧副韧带复合体损伤致后外侧旋转不稳。',
  },
  {
    id: 'lig_annular_radius',
    name: '桡骨环状韧带',
    en: 'Annular Ligament of Radius',
    region: 'arm_l',
    shape: 'ring',
    bilateral: true,
    pts: [
      [0.214, 0.614, 0.010], [0.224, 0.614, 0.014],
      [0.228, 0.614, 0.002], [0.218, 0.614, -0.004],
    ],
    radius: 0.002,
    desc: '包绕桡骨头 4/5 周，两端附着于尺骨桡切迹前后缘。',
    clinical: '幼童牵拉手臂易致桡骨小头半脱位（牵拉肘）。',
  },
  {
    id: 'lig_quadrate_elbow',
    name: '方形韧带',
    en: 'Quadrate Ligament',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.212, 0.606, 0.004], [0.222, 0.606, 0.005]],
    width: 0.005,
    desc: '位于环状韧带下方，连接桡骨颈与尺骨桡切迹下缘。',
    clinical: '限制前臂旋前、旋后末端过度活动。',
  },
  {
    id: 'lig_interosseous_forearm',
    name: '前臂骨间膜',
    en: 'Interosseous Membrane of Forearm',
    region: 'arm_l',
    mat: 'membrane',
    shape: 'sheet',
    bilateral: true,
    pts: [
      [0.212, 0.585, 0.004], [0.226, 0.585, 0.006],
      [0.240, 0.495, 0.008], [0.226, 0.495, 0.006],
    ],
    desc: '强韧纤维膜斜行连接桡骨骨间缘与尺骨骨间缘，传递腕部轴向应力。',
    clinical: 'Essex-Lopresti 损伤时骨间膜撕裂伴桡骨头骨折与下尺桡脱位。',
  },
  {
    id: 'lig_oblique_cord',
    name: '斜索',
    en: 'Oblique Cord of Forearm',
    region: 'arm_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.211, 0.602, 0.006], [0.224, 0.588, 0.008]],
    desc: '自尺骨冠突外下方斜向外下止于桡骨粗隆下方，方向与骨间膜相反。',
    clinical: '限制前臂过度旋后。',
  },
  {
    id: 'lig_radiocarpal_palmar',
    name: '桡腕掌侧韧带',
    en: 'Palmar Radiocarpal Ligament',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.238, 0.482, 0.012], [0.232, 0.468, 0.012]],
    width: 0.007,
    desc: '连接桡骨远端掌侧缘至近排腕骨与头状骨，限制腕过度背伸。',
    clinical: '桡骨远端骨折（Colles 骨折）或腕背伸跌倒时易受损。',
  },
  {
    id: 'lig_radiocarpal_dorsal',
    name: '桡腕背侧韧带',
    en: 'Dorsal Radiocarpal Ligament',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.238, 0.482, -0.002], [0.232, 0.468, -0.002]],
    width: 0.007,
    desc: '起自桡骨远端背侧斜向尺侧止于三角骨与月骨背面。',
    clinical: '维持近排腕骨背侧排列，限制腕过度掌屈。',
  },
  {
    id: 'lig_ulnocarpal_palmar',
    name: '尺腕掌侧韧带',
    en: 'Palmar Ulnocarpal Ligament',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.226, 0.482, 0.011], [0.228, 0.468, 0.011]],
    width: 0.006,
    desc: '起自尺骨茎突与三角纤维软骨盘（TFCC）止于月骨及三角骨掌面。',
    clinical: 'TFCC 损伤引起腕尺侧疼痛与旋转痛。',
  },
  {
    id: 'lig_radial_collateral_wrist',
    name: '桡侧腕副韧带',
    en: 'Radial Collateral Ligament of Wrist',
    region: 'arm_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.244, 0.482, 0.005], [0.242, 0.468, 0.006]],
    desc: '连接桡骨茎突尖与舟骨结节，加强腕关节桡侧。',
    clinical: '限制腕关节过度尺偏。',
  },
  {
    id: 'lig_ulnar_collateral_wrist',
    name: '尺侧腕副韧带',
    en: 'Ulnar Collateral Ligament of Wrist',
    region: 'arm_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.222, 0.482, 0.004], [0.224, 0.468, 0.005]],
    desc: '连接尺骨茎突尖与三角骨及豌豆骨，加强腕关节尺侧。',
    clinical: '限制腕关节过度桡偏。',
  },
  {
    id: 'lig_flexor_retinaculum',
    name: '屈肌支持带（腕横韧带）',
    en: 'Flexor Retinaculum (Transverse Carpal Ligament)',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.242, 0.468, 0.015], [0.224, 0.468, 0.014]],
    width: 0.009,
    desc: '架于舟骨/大多角骨与豌豆骨/钩骨之间，构成腕管掌侧顶壁。',
    clinical: '腕管综合征减压手术需切开此韧带以松解正中神经。',
  },
  {
    id: 'lig_extensor_retinaculum',
    name: '伸肌支持带',
    en: 'Extensor Retinaculum',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.244, 0.476, -0.004], [0.224, 0.474, -0.004]],
    width: 0.009,
    desc: '腕背侧斜行增厚深筋膜，将伸肌腱固定于 6 个骨纤维鞘管内。',
    clinical: '第 1 间隔狭窄致桡骨茎突狭窄性腱鞘炎（De Quervain 病）。',
  },
  {
    id: 'lig_intercarpal',
    name: '腕骨间韧带（舟月/月三角）',
    en: 'Intercarpal Ligaments',
    region: 'arm_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.240, 0.466, 0.006], [0.233, 0.466, 0.006], [0.226, 0.466, 0.006]],
    desc: '连接相邻腕骨（尤以舟月骨间韧带最关键），维持腕骨弓整体联动。',
    clinical: '舟月韧带断裂致 DISI 畸形与腕关节慢性背侧痛。',
  },
  {
    id: 'lig_carpometacarpal',
    name: '腕掌韧带',
    en: 'Carpometacarpal Ligaments',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.240, 0.460, 0.007], [0.228, 0.456, 0.007]],
    width: 0.006,
    desc: '掌侧与背侧跨越远排腕骨与掌骨底，稳固第 2–5 腕掌关节及拇指鞍状关节。',
    clinical: '第 1 腕掌韧带松弛与退变性关节炎密切相关。',
  },
  {
    id: 'lig_deep_trans_metacarpal',
    name: '掌骨深横韧带',
    en: 'Deep Transverse Metacarpal Ligament',
    region: 'arm_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.242, 0.436, 0.011], [0.226, 0.436, 0.010]],
    desc: '连接第 2–5 掌骨头掌板之间，维持掌骨头横弓稳定。',
    clinical: '限制各掌骨头过度离散。',
  },
  {
    id: 'lig_mcp_ip_collateral_volar',
    name: '掌指/指间侧副韧带与掌板',
    en: 'MCP/IP Collateral Ligaments & Volar Plates',
    region: 'arm_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.235, 0.434, 0.012], [0.235, 0.418, 0.013]],
    width: 0.006,
    desc: '位于掌指及指间关节两侧与掌侧，防止过伸与侧向成角。',
    clinical: '拇指尺侧副韧带撕裂称“滑雪者拇指”；掌板损伤致近指间关节过伸不稳。',
  },

  // 5. 双性别适配骨盆韧带
  {
    id: 'lig_sacroiliac_ant',
    name: '骶髂前韧带',
    en: 'Anterior Sacroiliac Ligament',
    region: 'pelvis',
    shape: 'band',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.032, 0.495, -0.012], [0.058, 0.492, -0.008]],
    width: 0.012,
    desc: '覆盖骶髂关节前面，连接骶骨翼与髂骨耳状面前缘。',
    clinical: '骨盆“开书样”损伤时首先受牵拉撕裂。',
  },
  {
    id: 'lig_sacroiliac_post',
    name: '骶髂后韧带（长/短）',
    en: 'Posterior Sacroiliac Ligament',
    region: 'pelvis',
    shape: 'band',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.026, 0.502, -0.038], [0.056, 0.492, -0.035]],
    width: 0.013,
    desc: '强韧厚实的后方纤维束，连接骶中/外侧嵴与髂后上/下棘。',
    clinical: '垂直剪切骨盆骨折时断裂提示骨盆环后部严重不稳。',
  },
  {
    id: 'lig_sacroiliac_interosseous',
    name: '骶髂骨间韧带',
    en: 'Interosseous Sacroiliac Ligament',
    region: 'pelvis',
    shape: 'cord',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.034, 0.496, -0.024], [0.052, 0.494, -0.022]],
    radius: 0.004,
    desc: '充填于骶骨粗隆与髂骨粗隆之间，为人体最坚固的韧带之一。',
    clinical: '承担躯干向双下肢传导轴向载荷的核心枢纽。',
  },
  {
    id: 'lig_iliolumbar',
    name: '髂腰韧带',
    en: 'Iliolumbar Ligament',
    region: 'pelvis',
    shape: 'band',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.022, 0.522, -0.022], [0.072, 0.514, -0.018]],
    width: 0.009,
    desc: '起自 L4–L5 横突向外辐射止于髂嵴后部与骶髂关节上方。',
    clinical: '限制 L5 在 S1 上前滑脱，下腰痛常见压痛点。',
  },
  {
    id: 'lig_sacrotuberous',
    name: '骶结节韧带',
    en: 'Sacrotuberous Ligament',
    region: 'pelvis',
    shape: 'band',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.028, 0.478, -0.036], [0.068, 0.432, -0.018]],
    width: 0.011,
    desc: '起自髂后下棘及骶尾外侧缘，斜向外下止于坐骨结节内侧缘，围成坐骨大/小孔。',
    clinical: '防止骶骨向前下方倾倒（章动），女性骨盆出口增宽时相应外展。',
  },
  {
    id: 'lig_sacrospinous',
    name: '骶棘韧带',
    en: 'Sacrospinous Ligament',
    region: 'pelvis',
    shape: 'band',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.024, 0.464, -0.030], [0.064, 0.454, -0.016]],
    width: 0.008,
    desc: '位于骶结节韧带深面，连接骶尾外侧缘与坐骨棘，分隔坐骨大孔与坐骨小孔。',
    clinical: '阴部神经阻滞与盆底重建（骶棘韧带固定术）重要标志。',
  },
  {
    id: 'lig_pubic_superior',
    name: '耻骨上韧带',
    en: 'Superior Pubic Ligament',
    region: 'pelvis',
    shape: 'cord',
    pelvisAdapt: true,
    pts: [[-0.026, 0.462, 0.046], [0, 0.462, 0.048], [0.026, 0.462, 0.046]],
    radius: 0.0028,
    desc: '横跨耻骨联合上缘，连接左右耻骨结节与耻骨嵴。',
    clinical: '妊娠期松弛素作用及骨盆分离损伤时变松弛。',
  },
  {
    id: 'lig_pubic_arcuate',
    name: '耻骨弓状韧带（耻骨下韧带）',
    en: 'Arcuate (Inferior) Pubic Ligament',
    region: 'pelvis',
    shape: 'band',
    pelvisAdapt: true,
    subpubicAdapt: true,
    pts: [[-0.022, 0.442, 0.042], [0, 0.450, 0.046], [0.022, 0.442, 0.042]],
    width: 0.007,
    desc: '贴附于耻骨联合下缘构成耻骨弓顶，女性耻骨下角显著大于男性。',
    clinical: '尿道膜部/阴茎背深静脉或阴蒂背神经经其下方穿行。',
  },
  {
    id: 'lig_obturator_membrane',
    name: '闭孔膜（留闭膜管）',
    en: 'Obturator Membrane (with Obturator Canal)',
    region: 'pelvis',
    mat: 'membrane',
    shape: 'sheet',
    bilateral: true,
    pelvisAdapt: true,
    subpubicAdapt: true,
    pts: [
      [0.036, 0.458, 0.032], [0.068, 0.452, 0.020],
      [0.066, 0.432, 0.012], [0.034, 0.436, 0.028],
    ],
    desc: '封闭闭孔大部分，上外侧留有闭膜管供闭孔血管神经通过。',
    clinical: '闭孔疝经闭膜管突出，可压迫闭孔神经引起大腿内侧痛。',
  },
  {
    id: 'lig_inguinal',
    name: '腹股沟韧带',
    en: 'Inguinal Ligament (Poupart)',
    region: 'pelvis',
    shape: 'cord',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.092, 0.506, 0.032], [0.026, 0.464, 0.046]],
    radius: 0.0028,
    desc: '腹外斜肌腱膜下缘卷曲增厚形成，连于髂前上棘与耻骨结节之间。',
    clinical: '区分腹股沟斜/直疝与股疝的重要体表解剖界线。',
  },
  {
    id: 'lig_lacunar',
    name: '腔隙韧带（陷窝韧带）',
    en: 'Lacunar Ligament (Gimbernat)',
    region: 'pelvis',
    shape: 'triangle',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.026, 0.464, 0.046], [0.038, 0.468, 0.042], [0.036, 0.461, 0.038]],
    desc: '腹股沟韧带内侧端向后外折返止于耻骨梳，构成股环内侧界。',
    clinical: '股疝嵌顿松解手术切开时需注意避免损伤异常闭孔动脉。',
  },
  {
    id: 'lig_pectineal',
    name: '耻骨梳韧带（Cooper 韧带）',
    en: 'Pectineal Ligament (Cooper)',
    region: 'pelvis',
    shape: 'cord',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.028, 0.463, 0.044], [0.056, 0.472, 0.030]],
    radius: 0.0024,
    desc: '覆于耻骨梳上的强韧骨膜纤维束，向内续于腔隙韧带。',
    clinical: 'McVay 疝修补术与 Burch 膀胱颈悬吊术的可靠缝合锚点。',
  },
  {
    id: 'lig_reflected_inguinal',
    name: '反转韧带',
    en: 'Reflected Inguinal Ligament',
    region: 'pelvis',
    shape: 'band',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.026, 0.464, 0.046], [0.004, 0.476, 0.048]],
    width: 0.005,
    desc: '腹股沟韧带内侧纤维向上内反转至腹白线，构成腹股沟管浅环后壁。',
    clinical: '加强腹股沟管内侧段后壁强度。',
  },
      // 6. 下肢（髋、膝、小腿、踝与足底）
  // 髋关节
  {
    id: 'lig_iliofemoral_y',
    name: '髂股韧带（Y 字形双束）',
    en: 'Iliofemoral Ligament (Y Ligament of Bigelow)',
    region: 'leg_l',
    shape: 'y_band',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.082, 0.482, 0.022], [0.092, 0.464, 0.028], [0.104, 0.448, 0.026], [0.088, 0.442, 0.028]],
    width: 0.010,
    desc: '起自髂前下棘分上下两束呈倒 Y 字形止于股骨转子间线，为全身最强韧带。',
    clinical: '限制髋关节过度后伸与外旋，维持站立位骨盆稳定。',
  },
  {
    id: 'lig_pubofemoral',
    name: '耻股韧带',
    en: 'Pubofemoral Ligament',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.056, 0.456, 0.028], [0.092, 0.444, 0.022]],
    width: 0.008,
    desc: '起自髂耻隆起与耻骨上支斜向外下融合于关节囊及转子间线。',
    clinical: '限制髋关节过度外展与外旋。',
  },
  {
    id: 'lig_ischiofemoral',
    name: '坐股韧带',
    en: 'Ischiofemoral Ligament',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.070, 0.452, -0.022], [0.098, 0.460, -0.014]],
    width: 0.009,
    desc: '起自坐骨体髋臼后缘，呈螺旋状向外上止于股骨颈基底与大转子。',
    clinical: '限制髋关节过度内旋与内收。',
  },
  {
    id: 'lig_zona_orbicularis',
    name: '轮匝带',
    en: 'Zona Orbicularis',
    region: 'leg_l',
    shape: 'ring',
    bilateral: true,
    pelvisAdapt: true,
    pts: [
      [0.088, 0.462, 0.016], [0.098, 0.462, 0.006],
      [0.092, 0.456, -0.014], [0.082, 0.458, 0.002],
    ],
    radius: 0.0022,
    desc: '围绕股骨颈中段形成的环形深层纤维领圈，将股骨头稳固锁入髋臼。',
    clinical: '提供负压与环抱力防止股骨头向外脱位。',
  },
  {
    id: 'lig_head_of_femur',
    name: '股骨头韧带（圆韧带）',
    en: 'Ligament of Head of Femur',
    region: 'leg_l',
    shape: 'cord',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.076, 0.456, 0.004], [0.086, 0.462, 0.005]],
    radius: 0.0022,
    desc: '位于髋关节囊内，连接髋臼横韧带及髋臼窝至股骨头凹，内含闭孔动脉分支。',
    clinical: '儿童期供应股骨头骨骺血运，成人撕裂可致髋关节微不稳。',
  },
  {
    id: 'lig_transverse_acetabular',
    name: '髋臼横韧带',
    en: 'Transverse Acetabular Ligament',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pelvisAdapt: true,
    pts: [[0.072, 0.450, 0.012], [0.074, 0.450, -0.008]],
    width: 0.006,
    desc: '架于髋臼切迹两端将其封闭为孔，补全髋臼盂唇下缘。',
    clinical: '全髋关节置换术确定髋臼杯前倾角的重要骨性软组织参照。',
  },

  // 膝关节（囊外五韧带 + 囊内六韧带）
  {
    id: 'lig_patellar',
    name: '髌韧带',
    en: 'Patellar Ligament',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.088, 0.272, 0.032], [0.088, 0.250, 0.030]],
    width: 0.011,
    desc: '股四头肌腱向下延续，起自髌骨尖止于胫骨粗隆，为囊外前方核心韧带。',
    clinical: '膝反射叩击部位；青少年好发胫骨结节骨软骨炎（Osgood-Schlatter 病）。',
  },
  {
    id: 'lig_knee_mcl',
    name: '膝内侧副韧带（MCL/胫侧副韧带）',
    en: 'Medial Collateral Ligament of Knee',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.068, 0.278, 0.004], [0.066, 0.248, 0.006]],
    width: 0.009,
    desc: '扁宽带状起自股骨内上髁止于胫骨内侧髁及干骺端，深层与内侧半月板相连。',
    clinical: '膝外翻暴力易致撕裂，常与 ACL 及内侧半月板构成“不幸三联征”。',
  },
  {
    id: 'lig_knee_lcl',
    name: '膝外侧副韧带（LCL/腓侧副韧带）',
    en: 'Lateral Collateral Ligament of Knee',
    region: 'leg_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.108, 0.278, -0.004], [0.110, 0.252, -0.010]],
    radius: 0.0026,
    desc: '圆索状起自股骨外上髁止于腓骨头，与外侧半月板及关节囊分离。',
    clinical: '抗膝内翻与外旋的主要结构，常伴后外侧角（PLC）损伤。',
  },
  {
    id: 'lig_oblique_popliteal',
    name: '腘斜韧带',
    en: 'Oblique Popliteal Ligament',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.072, 0.258, -0.022], [0.102, 0.276, -0.020]],
    width: 0.008,
    desc: '半膜肌腱向后外上方扩展形成，斜跨膝关节囊后壁至股骨外侧髁。',
    clinical: '限制膝关节过伸与后外侧旋转。',
  },
  {
    id: 'lig_arcuate_popliteal',
    name: '腘弓状韧带',
    en: 'Arcuate Popliteal Ligament',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.108, 0.254, -0.016], [0.094, 0.268, -0.022]],
    width: 0.007,
    desc: '呈 Y 形弓跨过腘肌表面，起自腓骨头止于胫骨髁间后区及股骨外侧髁。',
    clinical: '膝关节后外侧角（PLC）重要组成，受损致拨号试验阳性。',
  },
  {
    id: 'lig_knee_acl',
    name: '前交叉韧带（ACL）',
    en: 'Anterior Cruciate Ligament (ACL)',
    region: 'leg_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.084, 0.258, 0.010], [0.090, 0.266, 0.001], [0.096, 0.274, -0.008]],
    radius: 0.0028,
    desc: '起自胫骨髁间前区斜向后上外止于股骨外侧髁内侧面，与 PCL 呈精确 X 交叉。',
    clinical: '防止胫骨前移与膝旋转不稳，前抽屉试验与 Lachman 试验阳性提示断裂。',
  },
  {
    id: 'lig_knee_pcl',
    name: '后交叉韧带（PCL）',
    en: 'Posterior Cruciate Ligament (PCL)',
    region: 'leg_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.094, 0.258, -0.010], [0.088, 0.266, 0.000], [0.080, 0.274, 0.008]],
    radius: 0.003,
    desc: '起自胫骨髁间后区斜向前上内止于股骨内侧髁外侧面，与 ACL 空间 X 交叉。',
    clinical: '限制胫骨后移，屈膝位仪表盘撞击伤易致断裂，后抽屉试验阳性。',
  },
  {
    id: 'lig_transverse_knee',
    name: '膝横韧带',
    en: 'Transverse Ligament of Knee',
    region: 'leg_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.074, 0.261, 0.016], [0.088, 0.261, 0.018], [0.102, 0.261, 0.016]],
    radius: 0.0018,
    desc: '横向连接内侧半月板前角与外侧半月板前缘。',
    clinical: '协调双侧半月板在伸屈膝时的同步前移。',
  },
  {
    id: 'lig_humphry',
    name: 'Humphry 韧带（前半月板股骨韧带）',
    en: 'Anterior Meniscofemoral Ligament (Humphry)',
    region: 'leg_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.098, 0.262, -0.008], [0.082, 0.273, 0.006]],
    radius: 0.0018,
    desc: '起自外侧半月板后角，经 PCL 前方斜向内上止于股骨内侧髁。',
    clinical: 'MRI 矢状位易误诊为 PCL 撕裂碎片或关节游离体。',
  },
  {
    id: 'lig_wrisberg',
    name: 'Wrisberg 韧带（后半月板股骨韧带）',
    en: 'Posterior Meniscofemoral Ligament (Wrisberg)',
    region: 'leg_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.098, 0.262, -0.011], [0.081, 0.274, -0.004]],
    radius: 0.0018,
    desc: '起自外侧半月板后角，经 PCL 后方斜向内上止于股骨内侧髁。',
    clinical: '与 Humphry 韧带协同稳定外侧半月板后角。',
  },
  {
    id: 'lig_coronary_knee',
    name: '冠状韧带（半月板胫骨韧带）',
    en: 'Coronary (Meniscotibial) Ligament',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.072, 0.262, 0.006], [0.072, 0.256, 0.006]],
    width: 0.006,
    desc: '关节囊深层纤维将内外侧半月板外周缘锚定于胫骨平台边缘。',
    clinical: '撕裂可导致半月板半脱位或外凸。',
  },

  // 小腿
  {
    id: 'lig_tibiofibular_ant',
    name: '胫腓前韧带（下胫腓前韧带）',
    en: 'Anterior Inferior Tibiofibular Ligament (AITFL)',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.088, 0.068, 0.014], [0.104, 0.062, 0.010]],
    width: 0.007,
    desc: '斜行连接胫骨远端前结节与外踝前缘，稳定踝穴前外侧。',
    clinical: '高位踝关节扭伤（下胫腓联合损伤）最常首先撕裂此韧带。',
  },
  {
    id: 'lig_tibiofibular_post',
    name: '胫腓后韧带（下胫腓后韧带）',
    en: 'Posterior Inferior Tibiofibular Ligament (PITFL)',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.088, 0.068, -0.014], [0.104, 0.061, -0.012]],
    width: 0.008,
    desc: '强韧厚实，连接胫骨后踝与外踝后缘。',
    clinical: '踝关节旋前外旋型骨折常伴后踝撕脱骨折。',
  },
  {
    id: 'lig_tibiofibular_interosseous',
    name: '胫腓骨间韧带',
    en: 'Interosseous Tibiofibular Ligament',
    region: 'leg_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.090, 0.072, 0.000], [0.103, 0.070, -0.002]],
    radius: 0.003,
    desc: '小腿骨间膜下端增厚形成，紧固胫骨腓切迹与腓骨远端之间。',
    clinical: '下胫腓联合最主要的抗分离稳定结构。',
  },
  {
    id: 'lig_interosseous_leg',
    name: '小腿骨间膜',
    en: 'Interosseous Membrane of Leg',
    region: 'leg_l',
    mat: 'membrane',
    shape: 'sheet',
    bilateral: true,
    pts: [
      [0.088, 0.235, 0.002], [0.104, 0.235, -0.004],
      [0.102, 0.080, -0.002], [0.088, 0.080, 0.002],
    ],
    desc: '连接胫骨外侧缘与腓骨内侧缘，分隔小腿前群与后群肌，上方留胫前血管孔。',
    clinical: '小腿骨筋膜室综合征切开减压的重要解剖界膜。',
  },

  // 踝与足底
  {
    id: 'lig_deltoid_ant_tibiotalar',
    name: '三角韧带（胫距前部）',
    en: 'Deltoid Ligament - Anterior Tibiotalar Part',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.070, 0.056, 0.006], [0.074, 0.044, 0.016]],
    width: 0.006,
    desc: '三角韧带深层前部，起自内踝前丘至距骨颈内侧面。',
    clinical: '辅助限制距骨前移与外旋。',
  },
  {
    id: 'lig_deltoid_tibionavicular',
    name: '三角韧带（胫舟部）',
    en: 'Deltoid Ligament - Tibionavicular Part',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.070, 0.056, 0.008], [0.072, 0.034, 0.038]],
    width: 0.007,
    desc: '三角韧带浅层最前部，止于足舟骨粗隆背面与弹簧韧带。',
    clinical: '协同维持内侧纵弓与距舟关节稳定。',
  },
  {
    id: 'lig_deltoid_tibiocalcaneal',
    name: '三角韧带（胫跟部）',
    en: 'Deltoid Ligament - Tibiocalcaneal Part',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.070, 0.056, 0.000], [0.072, 0.032, -0.002]],
    width: 0.007,
    desc: '垂直下行止于跟骨载距突内侧缘，为浅层最强束。',
    clinical: '主要限制距骨与跟骨过度外翻。',
  },
  {
    id: 'lig_deltoid_post_tibiotalar',
    name: '三角韧带（胫距后部）',
    en: 'Deltoid Ligament - Posterior Tibiotalar Part',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.070, 0.056, -0.006], [0.074, 0.042, -0.016]],
    width: 0.007,
    desc: '三角韧带深层最厚部，止于距骨体后内侧结节。',
    clinical: '内踝骨折或三角韧带深层撕裂可致踝穴内侧间隙增宽。',
  },
  {
    id: 'lig_ankle_atfl',
    name: '距腓前韧带（ATFL）',
    en: 'Anterior Talofibular Ligament (ATFL)',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.104, 0.052, 0.006], [0.096, 0.044, 0.022]],
    width: 0.006,
    desc: '外侧副韧带最前束，水平向前内止于距骨颈外侧面。',
    clinical: '踝关节内翻扭伤最易撕裂的韧带（占 85% 以上），前抽屉试验阳性。',
  },
  {
    id: 'lig_ankle_cfl',
    name: '跟腓韧带（CFL）',
    en: 'Calcaneofibular Ligament (CFL)',
    region: 'leg_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.104, 0.050, -0.002], [0.100, 0.026, -0.018]],
    radius: 0.0022,
    desc: '自外踝尖斜向后下止于跟骨外侧面结节，跨越距小腿与距下两关节。',
    clinical: '严重内翻扭伤时继 ATFL 之后断裂，距骨倾斜试验阳性。',
  },
  {
    id: 'lig_ankle_ptfl',
    name: '距腓后韧带（PTFL）',
    en: 'Posterior Talofibular Ligament (PTFL)',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.103, 0.050, -0.008], [0.090, 0.042, -0.022]],
    width: 0.007,
    desc: '外侧副韧带最厚实的一束，水平向后内止于距骨后突外侧结节。',
    clinical: '极少单独断裂，多见于踝关节完全脱位。',
  },
  {
    id: 'lig_long_plantar',
    name: '足底长韧带',
    en: 'Long Plantar Ligament',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.088, 0.012, -0.018], [0.092, 0.010, 0.036], [0.092, 0.012, 0.068]],
    width: 0.010,
    desc: '足底最长最强的韧带，起自跟骨结节前方止于骰骨及第 2–5 跖骨底。',
    clinical: '维持足外侧纵弓的核心张力带，跨越腓骨长肌腱沟。',
  },
  {
    id: 'lig_short_plantar',
    name: '足底短韧带（足底跟骰韧带）',
    en: 'Short Plantar (Plantar Calcaneocuboid) Ligament',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.092, 0.014, 0.010], [0.095, 0.013, 0.042]],
    width: 0.008,
    desc: '位于足底长韧带深面，连接跟骨前结节与骰骨跖面。',
    clinical: '协同足底长韧带支撑外侧纵弓。',
  },
  {
    id: 'lig_spring',
    name: '弹簧韧带（足底跟舟韧带）',
    en: 'Spring (Plantar Calcaneonavicular) Ligament',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.076, 0.024, 0.008], [0.074, 0.026, 0.038]],
    width: 0.009,
    desc: '连接跟骨载距突与足舟骨粗隆跖面，托住距骨头形成内侧纵弓“弓弦”。',
    clinical: '功能不全或撕裂是成人获得性扁平足的关键病理机制。',
  },
  {
    id: 'lig_bifurcate',
    name: '分歧韧带（跟舟部/跟骰部）',
    en: 'Bifurcate Ligament (Calcaneonavicular & Calcaneocuboid)',
    region: 'leg_l',
    shape: 'y_band',
    bilateral: true,
    pts: [[0.090, 0.030, 0.020], [0.088, 0.028, 0.030], [0.078, 0.030, 0.040], [0.098, 0.026, 0.040]],
    width: 0.006,
    desc: '起自跟骨前上方呈 Y 字形分叉止于足舟骨外侧面与骰骨背面。',
    clinical: '“Chopart 关节”背侧关键锁定韧带，足跖屈内翻易发生撕脱骨折。',
  },
  {
    id: 'lig_interosseous_talocalcaneal',
    name: '距跟骨间韧带',
    en: 'Interosseous Talocalcaneal Ligament',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.086, 0.038, 0.006], [0.090, 0.030, 0.008]],
    width: 0.008,
    desc: '充填于跗骨窦内连接距骨沟与跟骨沟，为距下关节最核心稳定结构。',
    clinical: '跗骨窦综合征常伴此韧带炎症或部分撕裂。',
  },
  {
    id: 'lig_deep_trans_metatarsal',
    name: '跖骨深横韧带',
    en: 'Deep Transverse Metatarsal Ligament',
    region: 'leg_l',
    shape: 'cord',
    bilateral: true,
    pts: [[0.070, 0.010, 0.098], [0.104, 0.010, 0.092]],
    radius: 0.002,
    desc: '横向连接第 1–5 跖骨头跖板，维持足横弓。',
    clinical: '挤压致趾间神经卡压形成莫顿神经瘤（Morton neuroma）。',
  },
  {
    id: 'lig_mtp_ip_collateral_plantar',
    name: '跖趾/趾间侧副韧带与跖侧韧带（跖板）',
    en: 'MTP/IP Collateral & Plantar Ligaments',
    region: 'leg_l',
    shape: 'band',
    bilateral: true,
    pts: [[0.084, 0.010, 0.098], [0.084, 0.009, 0.118]],
    width: 0.006,
    desc: '位于跖趾与趾间关节两侧及跖面，防止足趾背伸脱位。',
    clinical: '第 1 跖趾关节跖板过度背伸撕裂称为“草地趾（Turf Toe）”。',
  },
];

function expandSpecs(): LigamentSpec[] {
  const result: LigamentSpec[] = [];
  for (const sp of LIGAMENT_SPECS) {
    if (!sp.bilateral) {
      result.push(sp);
      continue;
    }
    const leftRegion: RegionKey = sp.region;
    const rightRegion: RegionKey =
      sp.region === 'arm_l' ? 'arm_r' : sp.region === 'leg_l' ? 'leg_r' : sp.region;

    result.push({
      ...sp,
      id: `${sp.id}_l`,
      name: `${sp.name}（左）`,
      en: `${sp.en} (Left)`,
      region: leftRegion,
    });
    result.push({
      ...sp,
      id: `${sp.id}_r`,
      name: `${sp.name}（右）`,
      en: `${sp.en} (Right)`,
      region: rightRegion,
      pts: sp.pts.map(([x, y, z]) => [-x, y, z] as [number, number, number]),
    });
  }
  return result;
}

const EXPANDED_SPECS = expandSpecs();

export const LIGAMENT_SEARCH_INDEX: ExtraAnatMeta[] = EXPANDED_SPECS.map((sp) => ({
  id: sp.id,
  name: sp.name,
  en: sp.en,
  system: 'ligament',
  region: sp.region,
  desc: sp.desc,
  clinical: sp.clinical,
}));

export function buildFullLigamentSystem(
  bodyBox: T.Box3,
  sex: string
): { group: T.Group; metas: ExtraAnatMeta[]; hitTargets: T.Object3D[] } {
  const group = new T.Group();
  group.name = 'LigamentSystemGroup';
  const metas: ExtraAnatMeta[] = [];
  const hitTargets: T.Object3D[] = [];

  const center = new T.Vector3();
  const size = new T.Vector3();
  bodyBox.getCenter(center);
  bodyBox.getSize(size);
  const s = Math.max(size.y, 0.01);
  const isFemale = sex === 'female';

  const mats = createLigamentMaterials();
  const hitMat = new T.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const toWorld = (pt: [number, number, number], spec: LigamentSpec): T.Vector3 => {
    let [nx, ny, nz] = pt;
    if (spec.pelvisAdapt) {
      nx *= isFemale ? 1.15 : 1.0;
    }
    if (spec.subpubicAdapt) {
      nx *= isFemale ? 1.18 : 1.0;
      ny += isFemale ? -0.008 : 0.0;
    }
    if (spec.region === 'arm_l' || spec.region === 'arm_r') {
      nx *= isFemale ? 0.92 : 1.0;
    }
    if ((spec.region === 'leg_l' || spec.region === 'leg_r') && ny > 0.35 && !spec.pelvisAdapt) {
      nx *= isFemale ? 1.12 : 1.0;
    }
    return new T.Vector3(
      center.x + nx * s * 0.95,
      bodyBox.min.y + ny * size.y,
      center.z + nz * s * 0.95
    );
  };

  for (const spec of EXPANDED_SPECS) {
    const vecs = spec.pts.map((pt) => toWorld(pt, spec));
    const box = new T.Box3().setFromPoints(vecs);
    const mid = box.getCenter(new T.Vector3());
    const span = box.getSize(new T.Vector3()).length();

    const meta: ExtraAnatMeta = {
      id: spec.id,
      name: spec.name,
      en: spec.en,
      system: 'ligament',
      region: spec.region,
      desc: spec.desc,
      clinical: spec.clinical,
      worldPos: [mid.x, mid.y, mid.z],
    };

    const mat = mats[spec.mat ?? 'fibrous'];
    const obj = createLigamentObject(
      spec.shape,
      vecs,
      s,
      mat,
      meta,
      spec.radius ?? 0.0024,
      spec.width ?? 0.008
    );
    group.add(obj);

    const hitR = Math.max(s * (spec.hitRadius ?? 0.013), span * 0.42);
    const hitbox = new T.Mesh(new T.SphereGeometry(hitR, 8, 6), hitMat);
    hitbox.position.copy(mid);
    hitbox.name = `${spec.id}_hitbox`;
    hitbox.userData.extraInfo = meta;
    hitbox.userData.region = meta.region;
    hitTargets.push(hitbox);
    group.add(hitbox);

    metas.push(meta);
  }

  return { group, metas, hitTargets };
}
  
}

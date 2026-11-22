import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ZMetaEntry {
  system: 'ligaments' | 'lymphatic';
  en: string;
  la: string;
  ta2: string;
}

export interface ZMetaFile {
  source: string;
  osteoBounds: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    size: [number, number, number];
  };
  counts: { ligaments: number; lymphatic: number; osteologyRef: number };
  items: Record<string, ZMetaEntry>;
}

export interface RegionalBoneBoxes {
  pelvis?: THREE.Box3;
  thorax?: THREE.Box3;
}

export interface ZAnatomyLoadResult {
  ligamentGroup: THREE.Group;
  lymphGroup: THREE.Group;
  hitTargets: THREE.Object3D[];
  catalog: Array<{
    id: string;
    name: string;
    enName: string;
    laName: string;
    system: 'ligaments' | 'lymphatic';
    center: THREE.Vector3;
    mesh: THREE.Mesh;
  }>;
}

let cachedZhDict: Record<string, string> | null = null;

function normalizeZName(raw: string): string {
  let s = raw.replace(/\.\d{3}$/, '').trim();
  const isRight = /\.r\b|\b_r$/i.test(s);
  const isLeft = /\.l\b|\b_l$/i.test(s);
  s = s.replace(/\.(r|l|el|ol|e|o)\b/gi, '').replace(/[_-]+/g, ' ').trim();
  if (isRight && !/^right\b/i.test(s)) s = `Right ${s}`;
  if (isLeft && !/^left\b/i.test(s)) s = `Left ${s}`;
  return s;
}

function createLigamentMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e8e6dc'),
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
    roughness: 0.55,
    metalness: 0.02,
    clearcoat: 0.15,
    clearcoatRoughness: 0.45,
    transparent: false,
    opacity: 1.0,
    side: THREE.DoubleSide,
  });
}

function createLymphMaterial(isNode: boolean): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(isNode ? '#34d399' : '#2dd4bf'),
    emissive: new THREE.Color('#10b981'),
    emissiveIntensity: isNode ? 0.24 : 0.16,
    roughness: 0.35,
    metalness: 0.05,
    clearcoat: 0.5,
    depthTest: true,
    depthWrite: true,
  });
}

export async function loadZAnatomyMeshes(
  targetOsteoBox: THREE.Box3,
  zhDict: Record<string, string>,
  formatBilingual: (en: string, dict: Record<string, string>) => string,
  registerMesh: (obj: THREE.Object3D, systemKey: string, bodyCenter: THREE.Vector3, meta?: any) => void,
  sex: 'male' | 'female' = 'male',
  regionalBoxes?: RegionalBoneBoxes
): Promise<ZAnatomyLoadResult | null> {
  try {
    let activeDict = zhDict && Object.keys(zhDict).length > 0 ? zhDict : cachedZhDict || {};
    if (Object.keys(activeDict).length === 0) {
      const dictResp = await fetch('/data/zh_dict.json').catch(() => null);
      if (dictResp && dictResp.ok) {
        activeDict = await dictResp.json();
        cachedZhDict = activeDict;
      }
    }

    const metaResp = await fetch('/data/z_meta.json');
    if (!metaResp.ok) return null;
    const meta: ZMetaFile = await metaResp.json();
    const metaBySanitized = new Map<string, { rawKey: string; entry: ZMetaEntry }>();
    for (const [k, v] of Object.entries(meta.items || {})) {
      const san = k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      metaBySanitized.set(san, { rawKey: k, entry: v });
    }
    
    const loader = new GLTFLoader();
    const [ligGltf, lymphGltf] = await Promise.all([
      loader.loadAsync('/models/z_ligaments.glb').catch(() => null),
      loader.loadAsync('/models/z_lymphatic.glb').catch(() => null),
    ]);

    if (!ligGltf && !lymphGltf) return null;

    const zCenter = new THREE.Vector3(...meta.osteoBounds.center);
    const zSize = new THREE.Vector3(...meta.osteoBounds.size);
    const tCenter = targetOsteoBox.getCenter(new THREE.Vector3());
    const tSize = targetOsteoBox.getSize(new THREE.Vector3());

    const scaleY = tSize.y / Math.max(1e-4, zSize.y);
    const scaleX = tSize.x / Math.max(1e-4, zSize.x);
    const scaleZ = tSize.z / Math.max(1e-4, zSize.z);
    const alignScale = new THREE.Vector3(
      THREE.MathUtils.lerp(scaleY, scaleX, 0.45),
      scaleY,
      THREE.MathUtils.lerp(scaleY, scaleZ, 0.45)
    );

    const alignGroup = (root: THREE.Group) => {
      root.scale.copy(alignScale);
      root.position.set(
        tCenter.x - zCenter.x * alignScale.x,
        tCenter.y - zCenter.y * alignScale.y,
        tCenter.z - zCenter.z * alignScale.z
      );
      root.updateMatrixWorld(true);
      return root;
    };

    const pelvisBox = regionalBoxes?.pelvis && !regionalBoxes.pelvis.isEmpty() ? regionalBoxes.pelvis : null;
    const thoraxBox = regionalBoxes?.thorax && !regionalBoxes.thorax.isEmpty() ? regionalBoxes.thorax : null;
    const pelvisCenter = pelvisBox ? pelvisBox.getCenter(new THREE.Vector3()) : null;
    const thoraxCenter = thoraxBox ? thoraxBox.getCenter(new THREE.Vector3()) : null;

    const ligamentGroup = new THREE.Group();
    ligamentGroup.name = 'z_ligaments_group';
    const lymphGroup = new THREE.Group();
    lymphGroup.name = 'z_lymph_group';

    const hitTargets: THREE.Object3D[] = [];
    const catalog: ZAnatomyLoadResult['catalog'] = [];
    const ligMat = createLigamentMaterial();

    const processGltf = (
      gltf: any,
      targetGroup: THREE.Group,
      sysKey: 'ligaments' | 'lymphatic'
    ) => {
      if (!gltf?.scene) return;
      alignGroup(gltf.scene);

      const meshes: THREE.Mesh[] = [];
      gltf.scene.traverse((c: any) => {
        if (c.isMesh) meshes.push(c);
      });

      for (const child of meshes) {
        targetGroup.attach(child);

        if (sex === 'female') {
          const preBox = new THREE.Box3().setFromObject(child);
          const preC = preBox.getCenter(new THREE.Vector3());
          const relY = (preC.y - targetOsteoBox.min.y) / Math.max(1e-4, tSize.y);
          if (pelvisCenter && relY >= 0.42 && relY <= 0.56) {
            child.position.x += (pelvisCenter.x - tCenter.x) * 0.5;
            child.position.z += (pelvisCenter.z - tCenter.z) * 0.35;
          } else if (thoraxCenter && relY >= 0.62 && relY <= 0.84) {
            child.position.x += (thoraxCenter.x - tCenter.x) * 0.4;
            child.position.z += (thoraxCenter.z - tCenter.z) * 0.35;
          }
          child.updateMatrixWorld(true);
        }
        const direct = meta.items[child.name];
        const fuzzy = !direct ? metaBySanitized.get(child.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) : undefined;
        const rawEntry = direct || fuzzy?.entry || {
          system: sysKey,
          en: child.name,
          la: '',
          ta2: '',
        };
        const cleanEn = normalizeZName(fuzzy?.rawKey || rawEntry.en || child.name);
        const isNode = sysKey === 'lymphatic' && /nod|tonsil|thymus|spleen/i.test(cleanEn);
        child.material = sysKey === 'ligaments' ? ligMat.clone() : createLymphMaterial(isNode);
        child.renderOrder = sysKey === 'lymphatic' ? 4 : 2;

        const zhDisplay = formatBilingual(cleanEn, activeDict);
        const box = new THREE.Box3().setFromObject(child);
        const center = box.getCenter(new THREE.Vector3());

        child.userData = {
          ...child.userData,
          r2Extra: true,
          system: sysKey,
          name: zhDisplay,
          enName: cleanEn,
          laName: rawEntry.la,
          ta2: rawEntry.ta2,
          desc:
            sysKey === 'ligaments'
              ? `标准术语：${rawEntry.la || cleanEn}${rawEntry.ta2 ? ` (${rawEntry.ta2})` : ''}。源自 Z-Anatomy 真实关节韧带网格，已与当前骨骼坐标系对齐。`
              : `标准术语：${rawEntry.la || cleanEn}${rawEntry.ta2 ? ` (${rawEntry.ta2})` : ''}。源自 Z-Anatomy 真实淋巴系统网格，支持与肌肉半透明透视融合。`,
        };

        registerMesh(child, sysKey, tCenter, child.userData);
        hitTargets.push(child);
        catalog.push({
          id: `z_${sysKey}_${child.name}`,
          name: zhDisplay,
          enName: cleanEn,
          laName: rawEntry.la,
          system: sysKey,
          center,
          mesh: child,
        });
      }
    };

    processGltf(ligGltf, ligamentGroup, 'ligaments');
    processGltf(lymphGltf, lymphGroup, 'lymphatic');

    return { ligamentGroup, lymphGroup, hitTargets, catalog };
  } catch (err) {
    console.warn('[ZAnatomyLoader] Fallback to procedural builders:', err);
    return null;
  }
}

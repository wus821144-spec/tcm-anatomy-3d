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

function createLigamentMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#dce8f5'),
    emissive: new THREE.Color('#0ea5e9'),
    emissiveIntensity: 0.06,
    roughness: 0.52,
    metalness: 0.04,
    clearcoat: 0.25,
    clearcoatRoughness: 0.45,
    transparent: true,
    opacity: 0.88,
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
  registerMesh: (obj: THREE.Object3D, systemKey: string, bodyCenter: THREE.Vector3, meta?: any) => void
): Promise<ZAnatomyLoadResult | null> {
  try {
    const metaResp = await fetch('/data/z_meta.json');
    if (!metaResp.ok) return null;
    const meta: ZMetaFile = await metaResp.json();

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
      targetGroup.add(gltf.scene);

      gltf.scene.traverse((child: any) => {
        if (!child.isMesh) return;
        const entry = meta.items[child.name] || {
          system: sysKey,
          en: child.name.replace(/_\d+$/, '').replace(/_/g, ' '),
          la: '',
          ta2: '',
        };
        const isNode = sysKey === 'lymphatic' && /nod|tonsil|thymus|spleen/i.test(entry.en);
        child.material = sysKey === 'ligaments' ? ligMat.clone() : createLymphMaterial(isNode);
        child.renderOrder = sysKey === 'lymphatic' ? 4 : 2;

        const zhDisplay = formatBilingual(entry.en, zhDict);
        const box = new THREE.Box3().setFromObject(child);
        const center = box.getCenter(new THREE.Vector3());

        child.userData = {
          ...child.userData,
          r2Extra: true,
          system: sysKey,
          name: zhDisplay,
          enName: entry.en,
          laName: entry.la,
          ta2: entry.ta2,
          desc:
            sysKey === 'ligaments'
              ? `标准术语：${entry.la || entry.en}${entry.ta2 ? ` (${entry.ta2})` : ''}。源自 Z-Anatomy 真实关节韧带网格，已与当前骨骼坐标系刚性对齐。`
              : `标准术语：${entry.la || entry.en}${entry.ta2 ? ` (${entry.ta2})` : ''}。源自 Z-Anatomy 真实淋巴系统网格，支持与肌肉半透明透视融合。`,
        };

        registerMesh(child, sysKey, tCenter, child.userData);
        hitTargets.push(child);
        catalog.push({
          id: `z_${sysKey}_${child.name}`,
          name: zhDisplay,
          enName: entry.en,
          laName: entry.la,
          system: sysKey,
          center,
          mesh: child,
        });
      });
    };

    processGltf(ligGltf, ligamentGroup, 'ligaments');
    processGltf(lymphGltf, lymphGroup, 'lymphatic');

    return { ligamentGroup, lymphGroup, hitTargets, catalog };
  } catch (err) {
    console.warn('[ZAnatomyLoader] Fallback to procedural builders:', err);
    return null;
  }
}

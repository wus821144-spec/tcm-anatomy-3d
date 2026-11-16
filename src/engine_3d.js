import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export function create3DEngine(wrapEl, toastEl) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / (window.innerHeight - 60), 0.04, 40);
  camera.position.set(0, 1.05, 2.35);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight - 60);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.localClippingEnabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  wrapEl.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.90, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.25;
  controls.maxDistance = 4.8;

  let isInteracting = false;
  controls.addEventListener('start', () => (isInteracting = true));
  controls.addEventListener('end', () => (isInteracting = false));

  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.85));
  const dir1 = new THREE.DirectionalLight(0xffffff, 1.18);
  dir1.position.set(2, 3, 2.5);
  scene.add(dir1);
  const dir2 = new THREE.DirectionalLight(0x93c5fd, 0.55);
  dir2.position.set(-2, 1.5, -2);
  scene.add(dir2);
  const rimLight = new THREE.DirectionalLight(0xfff1e6, 0.72);
  rimLight.position.set(0, 2.2, -2.6);
  scene.add(rimLight);

  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x0f172a);
    const lTop = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide }));
    lTop.position.set(0, 4, 2); lTop.rotation.x = Math.PI / 2;
    const lWarm = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 0xffedd5, side: THREE.DoubleSide }));
    lWarm.position.set(-3, 1.5, -2); lWarm.lookAt(0, 1, 0);
    envScene.add(lTop, lWarm);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
  } catch {}

  const clipPlaneZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.24);
  const anatomyGroup = new THREE.Group();
  const zoneGroup = new THREE.Group();
  const pointGroup = new THREE.Group();
  const toolGroup = new THREE.Group();
  scene.add(anatomyGroup, zoneGroup, pointGroup, toolGroup);

  const focusRing = new THREE.Mesh(
    new THREE.RingGeometry(0.018, 0.026, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
  );
  focusRing.visible = false;
  scene.add(focusRing);

  function sanitizeAndUpgradeModelRoot(root, upgradeMaterialFn) {
    const toRemove = [];
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const low = (obj.name || '').toLowerCase();
      if (
        low.includes('plane') || low.includes('backdrop') || low.includes('grid') ||
        low.includes('menu') || low.includes('_label') || low.includes('gizmo') ||
        low.includes('regions of human') || low.includes('general terms')
      ) { toRemove.push(obj); return; }
      if (obj.geometry) {
        obj.geometry.computeBoundingBox();
        if (obj.geometry.boundingBox) {
          box.copy(obj.geometry.boundingBox);
          box.getSize(size);
          const maxD = Math.max(size.x, size.y, size.z);
          const minD = Math.min(size.x, size.y, size.z);
          const vCount = obj.geometry.attributes.position ? obj.geometry.attributes.position.count : 0;
          if (vCount <= 256 && maxD > 0.14 && minD < 0.005 * maxD) { toRemove.push(obj); return; }
        }
      }
      if (upgradeMaterialFn) upgradeMaterialFn(obj);
    });
    toRemove.forEach((m) => {
      if (m.parent) m.parent.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) { if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose()); else m.material.dispose(); }
    });
  }

  let _fpsCount = 0, _fpsAccum = 0, _fpsLast = performance.now(), _fpsDegraded = false, _view3DActive = true;
  function setViewActive(is3D) { _view3DActive = !!is3D; }
  function _fpsTick(now) {
    if (!_view3DActive) { _fpsLast = now; return false; }
    const dt = now - _fpsLast;
    _fpsLast = now;
    if (dt > 0 && dt < 250) { _fpsAccum += dt; _fpsCount += 1; }
    if (_fpsCount >= 45) {
      const avg = (_fpsCount * 1000) / Math.max(_fpsAccum, 1);
      if (avg < 34 && !_fpsDegraded) {
        _fpsDegraded = true;
        renderer.setPixelRatio(1.0);
        state.physAnimEnabled = false;
        if (toastEl) toastEl.innerText = `实时帧率优化：已切换流畅渲染 (${Math.round(avg)} FPS)`;
      } else if (avg > 52 && _fpsDegraded && !state.ecoMode) {
        _fpsDegraded = false;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
        state.physAnimEnabled = true;
      }
      _fpsCount = 0; _fpsAccum = 0;
    }
    return true;
  }

  function createStriatedNormalMap(isFibrous) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const wave = isFibrous
          ? Math.sin(x * 0.45 + Math.sin(y * 0.08) * 2.0) * 28
          : (Math.sin(x * 0.6) * Math.cos(y * 0.6)) * 16;
        const noise = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 14;
        img.data[idx] = Math.min(255, Math.max(0, 128 + wave + noise));
        img.data[idx + 1] = Math.min(255, Math.max(0, 128 + (isFibrous ? noise : wave)));
        img.data[idx + 2] = 240;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  const MUSCLE_NORMAL = createStriatedNormalMap(true);
  const BONE_NORMAL = createStriatedNormalMap(false);

  function createBiologicalRoughnessMap() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const v = Math.floor(110 + Math.sin(x * 0.35) * 28 + Math.cos(y * 0.5) * 20);
        img.data[idx] = v; img.data[idx + 1] = v; img.data[idx + 2] = v; img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }
  const BIO_ROUGHNESS = createBiologicalRoughnessMap();

  function upgradeBiologicalMaterial(mesh) {
    if (!mesh.isMesh || !mesh.material) return;
    const parts = (mesh.name || '').split('__');
    const sys = parts.length >= 2 ? parts[0] : 'Visceral';
    const oldMat = mesh.material;
    const baseColor = oldMat.color ? oldMat.color.clone() : new THREE.Color(0xcccccc);

    if (sys === 'Muscular') {
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: baseColor, normalMap: MUSCLE_NORMAL, normalScale: new THREE.Vector2(0.45, 0.45),
        roughness: 0.42, clearcoat: 0.18, clearcoatRoughness: 0.35, clippingPlanes: [clipPlaneZ], side: THREE.DoubleSide
      });
    } else if (sys === 'Skeleton') {
      mesh.material = new THREE.MeshStandardMaterial({
        color: baseColor, normalMap: BONE_NORMAL, normalScale: new THREE.Vector2(0.25, 0.25),
        roughness: 0.56, metalness: 0.04, clippingPlanes: [clipPlaneZ], side: THREE.DoubleSide
      });
    } else if (sys === 'Visceral' || sys === 'Neurovascular') {
      const lowN = (mesh.name || '').toLowerCase();
      if (sys === 'Neurovascular' && baseColor.r === baseColor.g && baseColor.g === baseColor.b) {
        if (lowN.includes('arter')) baseColor.setHex(0xdc2626);
        else if (lowN.includes('vein') || lowN.includes('ven')) baseColor.setHex(0x2563eb);
        else if (lowN.includes('nerv')) baseColor.setHex(0xfacc15);
      }
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: baseColor, roughness: 0.26, roughnessMap: BIO_ROUGHNESS,
        clearcoat: 0.78, clearcoatRoughness: 0.12, envMapIntensity: 1.15,
        clippingPlanes: [clipPlaneZ], side: THREE.DoubleSide
      });
    } else if (sys === 'LigamentJoint') {
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: baseColor, normalMap: MUSCLE_NORMAL, normalScale: new THREE.Vector2(0.20, 0.20),
        roughness: 0.46, sheen: 0.5, clippingPlanes: [clipPlaneZ], side: THREE.DoubleSide
      });
    } else if (sys === 'Skin') {
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: baseColor, normalMap: BONE_NORMAL, normalScale: new THREE.Vector2(0.12, 0.12), roughness: 0.48, clearcoat: 0.16, sheen: 0.35, sheenColor: new THREE.Color(0xffedd5),
        transparent: true, opacity: state.skinOpacity, depthWrite: false, clippingPlanes: [clipPlaneZ], side: THREE.DoubleSide
      });
    } else {
      mesh.material = oldMat.clone();
      mesh.material.clippingPlanes = [clipPlaneZ];
      mesh.material.side = THREE.DoubleSide;
    }
    if (oldMat && oldMat.dispose) oldMat.dispose();
  }

  const state = {
    loadedRegions: {},
    regionOrder: [],
    visibleLayers: { Skin: true, LigamentJoint: true, Muscular: true, Skeleton: true, Visceral: true, Neurovascular: true, Points: true },
    activeGender: 'Male',
    ghostMode: false,
    skinOpacity: 0.45,
    activeZone: null,
    physAnimEnabled: true,
    zoneMeshes: [],
    pointMeshes: [],
    heartMeshes: [],
    lungMeshes: [],
    hiddenDissectedMeshes: new Set(),
    hasAutoFitted: false
  };

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('./draco/');
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  function applyLayerAndGenderStyles() {
    anatomyGroup.traverse((c) => {
      if (!c.isMesh) return;
      const parts = (c.name || '').split('__');
      const sys = parts.length >= 2 ? parts[0] : 'Visceral';
      const genderTag = parts.length >= 3 ? parts[1] : 'Common';
      c.visible = !state.hiddenDissectedMeshes.has(c) && !!state.visibleLayers[sys] && (genderTag === 'Common' || genderTag === state.activeGender);
      if (!c.userData._origScale) c.userData._origScale = c.scale.clone();
      if (state.activeGender === 'Female') {
        const lowM = (c.name || '').toLowerCase();
        if (/pelvi|ilium|ischium|pubis|sacrum|glute|hip/.test(lowM)) {
          c.scale.set(c.userData._origScale.x * 1.08, c.userData._origScale.y * 0.96, c.userData._origScale.z * 1.04);
        } else if (/rib|clavicle|scapula|sternum|thorax|pectoral|deltoid/.test(lowM)) {
          c.scale.set(c.userData._origScale.x * 0.91, c.userData._origScale.y * 0.96, c.userData._origScale.z * 0.94);
        } else {
          c.scale.set(c.userData._origScale.x * 0.96, c.userData._origScale.y * 0.98, c.userData._origScale.z * 0.97);
        }
      } else {
        c.scale.copy(c.userData._origScale);
      }
      if (c.material) {
        if (state.ghostMode) {
          c.material.transparent = true; c.material.opacity = 0.16; c.material.depthWrite = false;
        } else if (sys === 'Skin') {
          c.material.color.setHex(0xd6a88f);
          c.material.transparent = state.skinOpacity < 0.99;
          c.material.opacity = state.skinOpacity;
          c.material.depthWrite = state.skinOpacity >= 0.99;
        } else {
          c.material.transparent = false; c.material.opacity = 1.0; c.material.depthWrite = true;
        }
      }
    });
  }

  function autoFitAnatomyIfNeeded() {
    if (state.hasAutoFitted) return;
    const box = new THREE.Box3().setFromObject(anatomyGroup);
    if (box.isEmpty()) return;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    if (size.y > 0.2 && !state.activeZone) {
      controls.target.copy(center);
      camera.position.set(center.x, center.y + 0.1, center.z + Math.max(size.y * 1.45, 1.8));
      state.hasAutoFitted = true;
    }
  }

  function disposeRegion(regionKey) {
    if (regionKey === 'region_skin') return;
    const grp = state.loadedRegions[regionKey];
    if (!grp) return;
    grp.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
        state.heartMeshes = state.heartMeshes.filter((m) => m !== obj);
        state.lungMeshes = state.lungMeshes.filter((m) => m !== obj);
      }
    });
    anatomyGroup.remove(grp);
    delete state.loadedRegions[regionKey];
  }

  function touchRegionLRU(regionKey) {
    if (regionKey === 'region_skin') return;
    state.regionOrder = state.regionOrder.filter((r) => r !== regionKey);
    state.regionOrder.push(regionKey);
  }

  function evictInactiveRegions(keepSet, isEco) {
    if (!isEco) return;
    while (state.regionOrder.length > 4) {
      const oldest = state.regionOrder[0];
      if (keepSet && keepSet.has(oldest)) break;
      state.regionOrder.shift();
      disposeRegion(oldest);
    }
  }

  function loadRegion(regionKey) {
    if (state.loadedRegions[regionKey]) {
      state.loadedRegions[regionKey].visible = true;
      touchRegionLRU(regionKey);
      return;
    }
    gltfLoader.load(
      `./models/${regionKey}.glb`,
      (gltf) => {
        const root = gltf.scene;
        sanitizeAndUpgradeModelRoot(root, upgradeBiologicalMaterial);
        root.traverse((c) => {
          const low = (c.name || '').toLowerCase();
          if (c.isMesh && low.includes('heart')) state.heartMeshes.push(c);
          if (c.isMesh && low.includes('lung')) state.lungMeshes.push(c);
        });
        anatomyGroup.add(root);
        state.loadedRegions[regionKey] = root;
        touchRegionLRU(regionKey);
        applyLayerAndGenderStyles();
        autoFitAnatomyIfNeeded();
        const sp = document.getElementById('splash-status');
        if (sp) sp.innerText = '离线 3D 模型与医学图谱已就绪';
      },
      undefined,
      () => {
        const sp = document.getElementById('splash-status');
        if (sp) sp.innerText = '图谱引擎已就绪（点击进入大厅）';
      }
    );
  }

  function buildZones(zones) {
    zoneGroup.clear();
    state.zoneMeshes = [];
    zones.forEach((z) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(z.radius, 20, 20),
        new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 0.14, wireframe: true, depthWrite: false })
      );
      m.position.set(z.pos[0], z.pos[1], z.pos[2]);
      m.userData = { data: z };
      zoneGroup.add(m);
      state.zoneMeshes.push(m);
    });
  }

  function buildPoints(points) {
    pointGroup.clear();
    state.pointMeshes = [];
    const geo = new THREE.SphereGeometry(0.011, 16, 16);
    const colorMap = {
      '体表分层': 0x38bdf8, '关节韧带': 0xa855f7, '骨性标志与沟窝': 0x22d3ee,
      '微细血管神经': 0xef4444, '女性特有脏腑': 0xf472b6, '男性特有脏腑': 0x3b82f6,
      '脏腑中枢': 0xf97316, '奇经八脉穴': 0xf59e0b, '十四经穴': 0xfbbf24, '耳穴': 0xfb923c
    };
    points.forEach((pt) => {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: colorMap[pt.category] || 0xf59e0b, emissive: 0x331a00, roughness: 0.3 })
      );
      m.position.set(pt.pos[0], pt.pos[1], pt.pos[2]);
      m.userData = { data: pt };
      m.visible = false;
      pointGroup.add(m);
      state.pointMeshes.push(m);
    });
  }

  function refreshVisiblePoints() {
    state.pointMeshes.forEach((m) => {
      const pt = m.userData.data;
      const genderOk = (pt.gender === 'Common') || (pt.gender === state.activeGender);
      m.visible = state.visibleLayers.Points && !!state.activeZone && pt.zone === state.activeZone.id && genderOk;
    });
  }

  let _flyAnim = null;
  function smoothFlyTo(targetPos, camPos, durationMs = 420) {
    _flyAnim = {
      startT: performance.now(),
      dur: durationMs,
      t0: controls.target.clone(),
      t1: new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]),
      c0: camera.position.clone(),
      c1: new THREE.Vector3(camPos[0], camPos[1], camPos[2])
    };
  }

  function startLoop(shouldRenderFn) {
    function animate(now) {
      requestAnimationFrame(animate);
      if (!_fpsTick(now || performance.now())) return;
      if (shouldRenderFn && !shouldRenderFn(now || performance.now())) return;
      if (state.physAnimEnabled && !isInteracting) {
        const t = performance.now() * 0.001;
        const beat = 1.0 + Math.pow(Math.max(0, Math.sin(t * 3.8)), 4) * 0.035;
        state.heartMeshes.forEach((h) => h.scale.set(beat, beat, beat));
        const breath = 1.0 + Math.sin(t * 1.3) * 0.022;
        state.lungMeshes.forEach((l) => l.scale.set(breath, 1.0, breath));
      }
      if (focusRing.visible) focusRing.lookAt(camera.position);
      if (_flyAnim) {
        const p = Math.min(1, (performance.now() - _flyAnim.startT) / _flyAnim.dur);
        const ease = 1 - Math.pow(1 - p, 3);
        controls.target.lerpVectors(_flyAnim.t0, _flyAnim.t1, ease);
        camera.position.lerpVectors(_flyAnim.c0, _flyAnim.c1, ease);
        if (p >= 1) _flyAnim = null;
      }
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  }

  let prevHighlighted = null;
  function highlightSelectedMesh(mesh) {
    if (prevHighlighted && prevHighlighted.material && prevHighlighted.userData._origEmissive !== undefined) {
      prevHighlighted.material.emissive.setHex(prevHighlighted.userData._origEmissive);
      prevHighlighted.material.emissiveIntensity = prevHighlighted.userData._origEmissiveInt || 0;
    }
    prevHighlighted = mesh || null;
    if (mesh && mesh.material && mesh.material.emissive) {
      if (mesh.userData._origEmissive === undefined) {
        mesh.userData._origEmissive = mesh.material.emissive.getHex();
        mesh.userData._origEmissiveInt = mesh.material.emissiveIntensity || 0;
      }
      mesh.material.emissive.setHex(0x0ea5e9);
      mesh.material.emissiveIntensity = 0.55;
    }
  }

  return {
    THREE, scene, camera, renderer, controls, clipPlaneZ,
    anatomyGroup, zoneGroup, pointGroup, toolGroup, focusRing,
    state, loadRegion, smoothFlyTo, setViewActive, highlightSelectedMesh, disposeRegion, evictInactiveRegions, applyLayerAndGenderStyles, buildZones, buildPoints, refreshVisiblePoints, startLoop
  };
}

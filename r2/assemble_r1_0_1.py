#!/usr/bin/env python3
import glob
import json
import os, re
import shutil

ATLAS_DIR = "/tmp/atlas-r2"
ZH_DIR = "/tmp/zh-bp3d"

for gz in glob.glob(f"{ATLAS_DIR}/public/models/*.gz"):
    os.remove(gz)

for jp in glob.glob(f"{ATLAS_DIR}/public/models/*.json"):
    data = json.load(open(jp, encoding="utf-8"))
    for ch in data.get("chunks", []):
        ch.pop("gzip", None)
        ch.pop("gzipBytes", None)
    with open(jp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

os.makedirs(f"{ATLAS_DIR}/public/data", exist_ok=True)
d1_path = "www/data/anatomy_tcm_data.json" if os.path.exists("www/data/anatomy_tcm_data.json") else "anatomy_tcm_data.json"
d2_path = "www/data/tcm_medical_kb.json" if os.path.exists("www/data/tcm_medical_kb.json") else "tcm_medical_kb.json"
d1 = json.load(open(d1_path, encoding="utf-8"))
d2 = json.load(open(d2_path, encoding="utf-8"))
bundle = {
    "meridians": d1.get("meridians", []),
    "points": d1.get("points", []),
    "full_acupoints_catalog": d1.get("full_acupoints_catalog", []),
    "acupoint_details": d2.get("acupoint_details", {}),
    "tcm_prescriptions": d1.get("tcm_prescriptions", []),
    "nursing_protocols": d1.get("nursing_protocols", []),
    "nursing_details": d2.get("nursing_details", []),
    "glossary": d1.get("glossary", []),
    "built_in_cases": d2.get("built_in_cases", []),
}
with open(f"{ATLAS_DIR}/public/data/tcm_bundle.json", "w", encoding="utf-8") as f:
    json.dump(bundle, f, ensure_ascii=False, separators=(",", ":"))
import sys as _sys; _sys.path.insert(0, "r2"); import upgrade_bundle; upgrade_bundle.run(f"{ATLAS_DIR}/public/data/tcm_bundle.json")

zh_map = {}
for jp in glob.glob(f"{ZH_DIR}/**/*.json", recursive=True):
    try:
        obj = json.load(open(jp, encoding="utf-8"))
        items = obj if isinstance(obj, list) else (obj.get("parts") or obj.get("models") or obj.get("data") or [])
        if isinstance(items, list):
            for it in items:
                if not isinstance(it, dict):
                    continue
                en = (it.get("nameEn") or it.get("en_name") or it.get("english") or it.get("name_en") or "").strip().lower()
                zh = (it.get("nameCn") or it.get("zh_name") or it.get("chinese") or it.get("name_zh") or it.get("cn_name") or "").strip()
                if (not en or not zh) and isinstance(it.get("name"), str) and "|" in it["name"]:
                    p0, p1 = [x.strip() for x in it["name"].split("|", 1)]
                    if not zh: zh = p0
                    if not en: en = p1.lower()
                if en and zh and en != zh:
                    zh_map[en] = zh
                    if it.get("id"):
                        zh_map[str(it["id"]).strip().lower()] = zh
    except Exception:
        pass
with open(f"{ATLAS_DIR}/public/data/zh_dict.json", "w", encoding="utf-8") as f:
    json.dump(zh_map, f, ensure_ascii=False, separators=(",", ":"))

for fn in ["plugin-registry.ts", "bilingual-dict.ts", "micro-ear-plugin.tsx", "tcm-panel.tsx", "carbon-theme.css"]:
    shutil.copyfile(f"r2/app/{fn}", f"{ATLAS_DIR}/app/{fn}")

gc_p = f"{ATLAS_DIR}/app/globals.css"; gc_s = open(gc_p, "r", encoding="utf-8").read(); open(gc_p, "w", encoding="utf-8").write("@import './carbon-theme.css';" + chr(10) + gc_s.replace("@import './carbon-theme.css';", ""))
lx = f"{ATLAS_DIR}/app/layout.tsx"
if os.path.exists(lx): lxt = open(lx, "r", encoding="utf-8").read(); (open(lx, "w", encoding="utf-8").write("import './carbon-theme.css';" + chr(10) + lxt) if "carbon-theme.css" not in lxt else None)

an = f"{ATLAS_DIR}/app/anatomy.ts"
at = open(an, "r", encoding="utf-8").read()
for en, zh in [
    ("name:'Skeleton'", "name:'骨骼系统'"), ("name:'Muscles'", "name:'肌肉系统'"),
    ("name:'Heart'", "name:'心脏'"), ("name:'Sensory organs'", "name:'感觉器官'"),
    ("name:'Arteries'", "name:'动脉系统'"), ("name:'Veins'", "name:'静脉系统'"),
    ("name:'Nervous system'", "name:'神经系统'"), ("name:'Respiratory'", "name:'呼吸系统'"),
    ("name:'Digestive'", "name:'消化系统'"), ("name:'Urinary'", "name:'泌尿系统'"),
    ("name:'Lymphatic'", "name:'淋巴系统'"), ("name:'Endocrine'", "name:'内分泌系统'"),
    ("name:'Reproductive'", "name:'生殖系统'"), ("name:'Body surface'", "name:'体表皮肤'"),
    ("name:'Connective tissue'", "name:'结缔组织'"),
]:
    at = at.replace(en, zh)
at = at.replace(
    "export interface SceneState {",
    "export interface Acupoint3D {name:string;code?:string;meridian:string;pos:[number,number,number]}\nexport interface SceneState {points3D?:Acupoint3D[];showPoints3D?:boolean;activeMeridian?:string;"
)
open(an, "w", encoding="utf-8").write(at)

sc = f"{ATLAS_DIR}/app/scene.tsx"
st = open(sc, "r", encoding="utf-8").read()
st = st.replace("renderer.setClearColor('#f2f3f3')", "renderer.setClearColor('#05070b')")
st = st.replace("color:0xd5d9dc", "color:0x05070b")
st = re.sub(r'renderer\.setPixelRatio\(\s*Math\.min\(\s*window\.devicePixelRatio\s*\|\|\s*1\s*,\s*2\s*\)\s*\)', 'renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,3));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;const ed=new Uint8Array(64*32*4);for(let y=0;y<32;y++){const t=y/31,r=Math.round(45+t*175),g=Math.round(58+t*167),b=Math.round(80+t*155);for(let x=0;x<64;x++){const i=(y*64+x)*4;ed[i]=r;ed[i+1]=g;ed[i+2]=b;ed[i+3]=255;}}const et=new T.DataTexture(ed,64,32);et.mapping=T.EquirectangularReflectionMapping;et.needsUpdate=true;scene.environment=new T.PMREMGenerator(renderer).fromEquirectangular(et).texture', st); st = st.replace("0xd5d9dc", "0x05070b").replace("0xeeeeec", "0x05070b").replace("0xe5e7eb", "0x05070b").replace("#f2f3f3", "#05070b").replace("#555555", "#05070b").replace("0xD5D9DC", "0x05070b").replace("0xEEEEEC", "0x05070b").replace("0xE5E7EB", "0x05070b").replace("#F2F3F3", "#05070b")
st = st.replace("color:0x8c969f", "color:0xf59e0b")
st = st.replace("color:0xa4aeb8", "color:0x38bdf8")
st = st.replace("innerWidth<768?1.5:2", "2")
bump_helper = (
    "const mkBump=(fib:boolean)=>{const cv=document.createElement('canvas');cv.width=512;cv.height=512;const cx=cv.getContext('2d')!;const im=cx.createImageData(512,512);for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4;const v=Math.max(0,Math.min(255,Math.floor(128+(fib?Math.sin(x*0.55+Math.sin(y*0.1)*2)*35:Math.sin(x*0.6)*Math.cos(y*0.6)*22))));im.data[i]=v;im.data[i+1]=v;im.data[i+2]=v;im.data[i+3]=255;}cx.putImageData(im,0,0);const tx=new T.CanvasTexture(cv);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(8,8);return tx;};\n"
    "const muscleBump=mkBump(true),boneBump=mkBump(false);\n"
)
st = st.replace("const materialFor=(system:string)=>{", bump_helper + "const materialFor=(system:string)=>{")
st = st.replace(
    "metalness:.08,roughness:.53,",
    "metalness:.06,roughness:system==='skeletal'?.62:.48,bumpMap:system==='muscular'?muscleBump:system==='skeletal'?boneBump:null,bumpScale:system==='muscular'?.007:.004,clearcoat:(system==='muscular'||system==='skeletal'||system==='integumentary')?0.16:0.52,clearcoatRoughness:(system==='muscular'||system==='skeletal')?0.48:0.20,"
).replace("new T.MeshStandardMaterial", "new T.MeshPhysicalMaterial")
st = st.replace(
    "g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));",
    "g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));const pa=new Float32Array(buffer,p.positions,p.vertexCount*3);const uvs=new Float32Array(p.vertexCount*2);for(let ui=0;ui<p.vertexCount;ui++){uvs[ui*2]=(pa[ui*3]+pa[ui*3+2])*2.5;uvs[ui*2+1]=pa[ui*3+1]*2.5;}g.setAttribute('uv',new T.BufferAttribute(uvs,2));"
)
acu_setup = "const acuGroup=new T.Group();scene.add(acuGroup);const tubeMats:any[]=[];let lastPulse=0;let tapCb:((pt:any)=>void)|null=null;let lastAcuKey='';let lastFocusKey='';let lastXray=false;let pdX=0,pdY=0;renderer.domElement.addEventListener('pointerdown',(ev:PointerEvent)=>{pdX=ev.clientX;pdY=ev.clientY;});renderer.domElement.addEventListener('pointerup',(ev:PointerEvent)=>{if(!acuGroup.visible||!acuGroup.children.length||Math.hypot(ev.clientX-pdX,ev.clientY-pdY)>8)return;const r=renderer.domElement.getBoundingClientRect();const ndc=new T.Vector2(((ev.clientX-r.left)/r.width)*2-1,-((ev.clientY-r.top)/r.height)*2+1);const tr=new T.Raycaster();tr.setFromCamera(ndc,camera);const hs=tr.intersectObjects(acuGroup.children,false);const ha=hs.find(h=>h.object?.userData?.acupoint);if(ha)tapCb?.(ha.object.userData.acupoint);});\n"
st = st.replace("const markers=new T.Points(markerGeometry,markerMaterial);", acu_setup + "const markers=new T.Points(markerGeometry,markerMaterial);")
acu_tick = "tapCb=(s as any).onAcupointTap||null;const nx=!!(s as any).needleXray;if(nx!==lastXray){lastXray=nx;pickers.forEach((pm:any,idx:number)=>{const sys=atlas.parts[idx]?.system;if(pm&&pm.material&&(sys==='muscular'||sys==='integumentary')){pm.material.transparent=nx;pm.material.opacity=nx?0.26:1;pm.material.depthWrite=!nx;pm.material.needsUpdate=true;}});dirty=true;}const acuKey=(ready?'R':'W')+'|'+(atlas.sex||'m')+'|'+(s.showPoints3D?'1':'0')+'|'+(s.activeMeridian||'')+'|'+(s.points3D?s.points3D.length:0)+(nx?'|X':'|N');\nconst solidTargets=ready?pickers.filter((m,idx)=>!!m&&atlas.parts[idx].system!=='integumentary'):[];\nconst bodyBox=new T.Box3();if(ready)bounds.forEach((b,idx)=>{if(atlas.parts[idx].system!=='integumentary')bodyBox.union(b);});\nconst minY=bodyBox.isEmpty()?0:bodyBox.min.y,maxY=bodyBox.isEmpty()?1.7:bodyBox.max.y,spanY=Math.max(0.5,maxY-minY);const bCenter=bodyBox.isEmpty()?new T.Vector3(0,0.85,0):bodyBox.getCenter(new T.Vector3());const bSize=bodyBox.isEmpty()?new T.Vector3(0.5,1.7,0.3):bodyBox.getSize(new T.Vector3());\nconst rc=new T.Raycaster();\nconst snapPt=(p:any)=>{const sy=minY+(p.pos[1]/1.72)*spanY;const od=new T.Vector3(p.pos[0],0,p.pos[2]);if(od.lengthSq()<0.0001)od.set(0,0,1);od.normalize();const z=p.zone||'';let orig:T.Vector3,dir:T.Vector3,out:T.Vector3,maxDx=0.14;if(z==='torso_back'){orig=new T.Vector3(p.pos[0],sy,-0.9);dir=new T.Vector3(0,0,1);out=new T.Vector3(0,0,-1);maxDx=0.14;}else if(z==='torso_front'){orig=new T.Vector3(p.pos[0],sy,0.9);dir=new T.Vector3(0,0,-1);out=new T.Vector3(0,0,1);maxDx=0.14;}else if(z==='leg_back'){orig=new T.Vector3(p.pos[0],sy,-0.9);dir=new T.Vector3(0,0,1);out=new T.Vector3(0,0,-1);maxDx=0.10;}else if(z==='arm'){orig=new T.Vector3(p.pos[0],sy,p.pos[2]).addScaledVector(od,0.65);dir=od.clone().negate();out=od.clone();maxDx=0.15;}else if(z==='head'){orig=new T.Vector3(0,sy,0).addScaledVector(od,0.65);dir=od.clone().negate();out=od.clone();maxDx=0.15;}else if(z==='hand'){orig=new T.Vector3(p.pos[0],sy,bCenter.z+bSize.z*0.75);dir=new T.Vector3(0,0,-1);out=new T.Vector3(0,0,1);maxDx=0.15;}else if(z==='foot'){orig=new T.Vector3(p.pos[0],minY+bSize.y*0.14,p.pos[2]);dir=new T.Vector3(0,-1,0);out=new T.Vector3(0,1,0);maxDx=0.15;}else{orig=new T.Vector3(0,sy,0).addScaledVector(od,0.85);dir=od.clone().negate();out=od.clone();maxDx=9;}rc.set(orig,dir);const hits=solidTargets.length?rc.intersectObjects(solidTargets as T.Object3D[],false):[];const fHits=maxDx<5?hits.filter(h=>Math.abs(h.point.x-p.pos[0])<maxDx):hits;const hit=fHits.length?fHits[0]:(hits.length?hits[0]:null);const pos=hit?hit.point.clone().addScaledVector(out,0.005):new T.Vector3(p.pos[0],sy,p.pos[2]);return{pos,out};};\nif(acuKey!==lastAcuKey){\n  lastAcuKey=acuKey;acuGroup.clear();tubeMats.length=0;\n  if(ready&&s.showPoints3D&&s.points3D&&s.points3D.length){\n    const pts=s.points3D.filter(p=>!s.activeMeridian||s.activeMeridian==='全部'||p.meridian===s.activeMeridian);\n    const sg=new T.SphereGeometry(0.011,12,12);\n    const byMer=new Map<string,T.Vector3[]>();\n    pts.forEach(p=>{\n      const hi=s.activeMeridian&&s.activeMeridian!=='全部';\n      const m=new T.Mesh(sg,new T.MeshStandardMaterial({color:hi?0xf59e0b:0x38bdf8,emissive:hi?0xf59e0b:0x0284c7,emissiveIntensity:0.55}));\n      const{pos}=snapPt(p);m.userData={acupoint:p};m.position.copy(pos);acuGroup.add(m);\n      const arr=byMer.get(p.meridian)||[];arr.push(m.position.clone());byMer.set(p.meridian,arr);\n    });\n    byMer.forEach(arr=>{if(arr.length>=2){const tm=new T.MeshStandardMaterial({color:0xf59e0b,emissive:0xf59e0b,emissiveIntensity:0.75,roughness:0.25});tubeMats.push(tm);acuGroup.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(arr),Math.max(12,arr.length*3),0.0028,8,false),tm));}});\n    dirty=true;\n  }\n}\nconst fp=(s as any).focusPoint3D;const focusKey=fp?(fp.id||fp.name||'')+'|'+(fp.pos?fp.pos.join(','):''):'';\nif(ready&&fp&&focusKey!==lastFocusKey){\n  lastFocusKey=focusKey;\n  const{pos:focusPos,out:focusOut}=snapPt(fp);\n  controls.target.copy(focusPos);camera.position.copy(focusPos).addScaledVector(focusOut,0.52);controls.update();\n const oldRing=acuGroup.getObjectByName('focusRing');if(oldRing)acuGroup.remove(oldRing);const oldNeedle=acuGroup.getObjectByName('focusNeedle');if(oldNeedle)acuGroup.remove(oldNeedle);if(focusPos){const rg=new T.Mesh(new T.RingGeometry(0.016,0.023,24),new T.MeshBasicMaterial({color:0xf59e0b,side:T.DoubleSide}));rg.name='focusRing';rg.position.copy(focusPos);rg.lookAt(focusPos.clone().add(focusOut));acuGroup.add(rg);if(nx){const ang=(fp as any)?.angle||'perp';const ndDir=focusOut.clone().normalize();if(ang==='flat'){ndDir.lerp(new T.Vector3(0,1,0),0.78).normalize();}else if(ang==='oblique'){ndDir.lerp(new T.Vector3(0,1,0),0.45).normalize();}const nd=new T.Group();nd.name='focusNeedle';const sh=new T.Mesh(new T.CylinderGeometry(0.0008,0.0004,0.055,8),new T.MeshStandardMaterial({color:0xe2e8f0,metalness:0.85,roughness:0.2}));sh.position.y=0.015;const hd=new T.Mesh(new T.CylinderGeometry(0.002,0.002,0.018,8),new T.MeshStandardMaterial({color:0xf59e0b,metalness:0.8,roughness:0.25}));hd.position.y=0.051;const rGeo=new T.TorusGeometry(0.0024,0.0005,8,16);const r1=new T.Mesh(rGeo,new T.MeshStandardMaterial({color:0xf59e0b,emissive:0xf59e0b,emissiveIntensity:0.8}));r1.rotation.x=Math.PI/2;r1.position.y=0.015;const r2=new T.Mesh(rGeo,new T.MeshStandardMaterial({color:0x22d3ee,emissive:0x22d3ee,emissiveIntensity:0.8}));r2.rotation.x=Math.PI/2;r2.position.y=0.030;nd.add(sh,hd,r1,r2);nd.position.copy(focusPos);nd.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),ndDir);acuGroup.add(nd);}} dirty=true;\n}else if(!fp){lastFocusKey='';}\nacuGroup.visible=!!s.showPoints3D&&amount<0.08&&!s.isolate;if(acuGroup.visible&&tubeMats.length){const now=performance.now();if(now-lastPulse>60){lastPulse=now;const p=0.65+0.45*Math.sin(now*0.0045);tubeMats.forEach(tm=>{tm.emissiveIntensity=p;});dirty=true;}}\n"
st = st.replace("controls.enableRotate=amount<.8;", acu_tick + "      controls.enableRotate=amount<.8;")
open(sc, "w", encoding="utf-8").write(st)

px = f"{ATLAS_DIR}/app/page.tsx"
s = open(px, "r", encoding="utf-8").read()
s = "import { TcmOverlay, type Point3D } from './tcm-panel';\nimport { loadBilingualDict, formatBilingualName, matchesBilingualQuery, type BilingualMap } from './bilingual-dict';\n" + s
s = s.replace("export default function Home(){", "export default function Home(){\n  const [zhDict,setZhDict]=useState<BilingualMap>({});useEffect(()=>{loadBilingualDict().then(setZhDict);setState(s=>({...s,onAcupointTap:(pt:Point3D)=>setState(prev=>({...prev,tappedPoint3D:pt,focusPoint3D:pt}))}));},[]);")
s = s.replace("c.name.toLowerCase().includes(term)||c.id.toLowerCase().includes(term)", "matchesBilingualQuery(c.name,term,zhDict)||c.id.toLowerCase().includes(term)")
s = s.replace("<h1>Human Atlas", "<h1>Anatomy R1-1.0.2")
s = s.replace("{chosen?.name}", "{chosen?formatBilingualName(chosen.name,zhDict):''}")
s = s.replace("{c.name}", "{formatBilingualName(c.name,zhDict)}")
for en, zh in [
    ("Find a structure", "搜索解剖结构"), (">Systems<", ">系统与经穴<"), (">All<", ">全部<"),
    (">Skeleton<", ">骨骼<"), (">Organs<", ">脏腑<"), ("Hide all", "全部隐藏"), ("INTERACTIVE ANATOMY", "3D 交互解剖"), ("modeled pieces", "个解剖结构"), ("BodyParts3D 4.0", "BodyParts3D 4.0 中医融合版"), ("Male reference body", "成年男性标准体"), ("Female reference body", "成年女性标准体"), ("Show all", "全部显示"), ("pieces visible", "个结构可见"), ("Assembled", "聚合"), ("Every piece", "全部分解"), ("Source & credits", "数据来源与致谢"),
    (">Explode anatomy<", ">爆炸分解<"), (">Reset<", ">重置<"), (">Isolate structure<", ">孤立观察<"),
    (">Show surrounding anatomy<", ">恢复周围结构<"), (">Clear selection<", ">清除选中<"),
    ("Drag to orbit", "单指旋转"), ("Drag to pan", "单指平移"), ("Pinch to zoom", "双指缩放"),
    ("Tap to inspect", "点击查看结构"), ("Preparing the anatomy", "正在加载高精度 3D 解剖模型"),
    ("ADULT HUMAN · MALE", "成年男性 · 3D 交互图谱"), ("ADULT HUMAN · FEMALE", "成年女性 · 3D 交互图谱"),
    ("ANATOMICAL INVENTORY", "全部解剖部件平铺"), ("SEPARATED STRUCTURES", "三维爆炸分解视图"), (">About<", ">关于<"), (">Search<", ">搜索<"), (">Close<", ">关闭<"), (">Male<", ">男性<"), (">Female<", ">女性<"), ("No matching structures", "未找到匹配的解剖结构"), ("Tap any structure", "点击任意解剖结构查看详情"), ("Click any structure", "点击任意解剖结构查看详情"),
]:
    s = s.replace(en, zh)
s = re.sub(r'>\s*Systems\s*<', '>系统与经穴<', s); s = re.sub(r'>\s*All\s*<', '>全部<', s); s = re.sub(r'>\s*Skeleton\s*<', '>骨骼<', s); s = re.sub(r'>\s*Organs\s*<', '>脏腑<', s); _tcm_dock = "<button type=\"button\" className=\"tcm-dock-btn\" onClick={()=>window.dispatchEvent(new CustomEvent('r2-open-tcm'))}><span>经络穴位</span></button>"; _tcm_pre = "<button type=\"button\" onClick={()=>window.dispatchEvent(new CustomEvent('r2-open-tcm'))}>经穴361</button>"; s = re.sub(r'(>系统与经穴<(?:(?!</button>).)*?</button>)', r'\1' + _tcm_dock, s, count=1, flags=re.S) if "tcm-dock-btn" not in s else s; s = re.sub(r'(className=["\'][^"\']*bottom-dock[^"\']*["\'][^>]*>(?:(?!</button>).)*?</button>)', r'\1' + _tcm_dock, s, count=1, flags=re.S) if "tcm-dock-btn" not in s else s; s = re.sub(r'(>脏腑<(?:(?!</button>).)*?</button>)', r'\1' + _tcm_pre, s, count=1, flags=re.S); s = s.replace("</main>;", "  <TcmOverlay showPoints3D={state.showPoints3D!==false} onTogglePoints3D={v=>setState(s=>({...s,showPoints3D:v}))} onPointsLoaded={(pts:Point3D[])=>setState(s=>({...s,points3D:pts,showPoints3D:true}))} activeMeridian3D={state.activeMeridian} onSelectMeridian3D={m=>setState(s=>({...s,activeMeridian:m,showPoints3D:true}))} onFocusPoint3D={(pt:Point3D)=>setState(s=>({...s,focusPoint3D:pt,activeMeridian:pt.meridian,showPoints3D:true}))} tappedPoint3D={(state as any).tappedPoint3D||null} onClearTappedPoint3D={()=>setState(s=>({...s,tappedPoint3D:null}))} needleXray={!!(state as any).needleXray} onToggleNeedleXray={(v:boolean)=>setState(s=>({...s,needleXray:v,showPoints3D:true}))} />\n  </main>;")
open(px, "w", encoding="utf-8").write(s)
print("Assembled Anatomy R1-1.0.2 cleanly; zh_dict entries:", len(zh_map))

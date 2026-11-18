#!/usr/bin/env python3
import glob
import json
import os
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
                en = (it.get("en_name") or it.get("english") or it.get("name_en") or it.get("name") or "").strip().lower()
                zh = (it.get("zh_name") or it.get("chinese") or it.get("name_zh") or it.get("cn_name") or "").strip()
                if en and zh and en != zh:
                    zh_map[en] = zh
    except Exception:
        pass
with open(f"{ATLAS_DIR}/public/data/zh_dict.json", "w", encoding="utf-8") as f:
    json.dump(zh_map, f, ensure_ascii=False, separators=(",", ":"))

for fn in ["plugin-registry.ts", "bilingual-dict.ts", "micro-ear-plugin.tsx", "tcm-panel.tsx", "carbon-theme.css"]:
    shutil.copyfile(f"r2/app/{fn}", f"{ATLAS_DIR}/app/{fn}")

with open(f"{ATLAS_DIR}/app/globals.css", "a", encoding="utf-8") as f:
    f.write('\n@import "./carbon-theme.css";\n')

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
st = st.replace("color:0xeeeeec", "color:0x0a1019")
st = st.replace("color:0x8c969f", "color:0xf59e0b")
st = st.replace("color:0xa4aeb8", "color:0x38bdf8")
st = st.replace("innerWidth<768?1.5:2", "2")
bump_helper = (
    "const mkBump=(fib:boolean)=>{const cv=document.createElement('canvas');cv.width=128;cv.height=128;const cx=cv.getContext('2d')!;const im=cx.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;const v=Math.max(0,Math.min(255,Math.floor(128+(fib?Math.sin(x*0.55+Math.sin(y*0.1)*2)*35:Math.sin(x*0.6)*Math.cos(y*0.6)*22))));im.data[i]=v;im.data[i+1]=v;im.data[i+2]=v;im.data[i+3]=255;}cx.putImageData(im,0,0);const tx=new T.CanvasTexture(cv);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(4,4);return tx;};\n"
    "const muscleBump=mkBump(true),boneBump=mkBump(false);\n"
)
st = st.replace("const materialFor=(system:string)=>{", bump_helper + "const materialFor=(system:string)=>{")
st = st.replace(
    "metalness:.08,roughness:.53,",
    "metalness:.06,roughness:system==='skeletal'?.62:.48,bumpMap:system==='muscular'?muscleBump:system==='skeletal'?boneBump:null,bumpScale:system==='muscular'?.007:.004,"
)
st = st.replace(
    "g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));",
    "g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));const pa=new Float32Array(buffer,p.positions,p.vertexCount*3);const uvs=new Float32Array(p.vertexCount*2);for(let ui=0;ui<p.vertexCount;ui++){uvs[ui*2]=(pa[ui*3]+pa[ui*3+2])*2.5;uvs[ui*2+1]=pa[ui*3+1]*2.5;}g.setAttribute('uv',new T.BufferAttribute(uvs,2));"
)
acu_setup = "const acuGroup=new T.Group();scene.add(acuGroup);let lastAcuKey='';let lastFocusKey='';let pdX=0,pdY=0;renderer.domElement.addEventListener('pointerdown',(ev:PointerEvent)=>{pdX=ev.clientX;pdY=ev.clientY;});renderer.domElement.addEventListener('pointerup',(ev:PointerEvent)=>{if(!acuGroup.visible||!acuGroup.children.length||Math.hypot(ev.clientX-pdX,ev.clientY-pdY)>8)return;const r=renderer.domElement.getBoundingClientRect();const ndc=new T.Vector2(((ev.clientX-r.left)/r.width)*2-1,-((ev.clientY-r.top)/r.height)*2+1);const tr=new T.Raycaster();tr.setFromCamera(ndc,camera);const hs=tr.intersectObjects(acuGroup.children,false);const ha=hs.find(h=>h.object?.userData?.acupoint);if(ha)(s as any).onAcupointTap?.(ha.object.userData.acupoint);});\n"
st = st.replace("const markers=new T.Points(markerGeometry,markerMaterial);", acu_setup + "const markers=new T.Points(markerGeometry,markerMaterial);")
acu_tick = "const acuKey=(ready?'R':'W')+'|'+(atlas.sex||'m')+'|'+(s.showPoints3D?'1':'0')+'|'+(s.activeMeridian||'')+'|'+(s.points3D?s.points3D.length:0);\nconst solidTargets=ready?pickers.filter((m,idx)=>!!m&&atlas.parts[idx].system!=='integumentary'):[];\nconst bodyBox=new T.Box3();if(ready)bounds.forEach((b,idx)=>{if(atlas.parts[idx].system!=='integumentary')bodyBox.union(b);});\nconst minY=bodyBox.isEmpty()?0:bodyBox.min.y,maxY=bodyBox.isEmpty()?1.7:bodyBox.max.y,spanY=Math.max(0.5,maxY-minY);const bCenter=bodyBox.isEmpty()?new T.Vector3(0,0.85,0):bodyBox.getCenter(new T.Vector3());const bSize=bodyBox.isEmpty()?new T.Vector3(0.5,1.7,0.3):bodyBox.getSize(new T.Vector3());\nconst rc=new T.Raycaster();\nconst snapPt=(p:any)=>{const sy=minY+(p.pos[1]/1.72)*spanY;const od=new T.Vector3(p.pos[0],0,p.pos[2]);if(od.lengthSq()<0.0001)od.set(0,0,1);od.normalize();const z=p.zone||'';let orig:T.Vector3,dir:T.Vector3,out:T.Vector3,maxDx=0.14;if(z==='torso_back'){orig=new T.Vector3(p.pos[0],sy,-0.9);dir=new T.Vector3(0,0,1);out=new T.Vector3(0,0,-1);maxDx=0.14;}else if(z==='torso_front'){orig=new T.Vector3(p.pos[0],sy,0.9);dir=new T.Vector3(0,0,-1);out=new T.Vector3(0,0,1);maxDx=0.14;}else if(z==='leg_back'){orig=new T.Vector3(p.pos[0],sy,-0.9);dir=new T.Vector3(0,0,1);out=new T.Vector3(0,0,-1);maxDx=0.10;}else if(z==='arm'){orig=new T.Vector3(p.pos[0],sy,p.pos[2]).addScaledVector(od,0.65);dir=od.clone().negate();out=od.clone();maxDx=0.15;}else if(z==='head'){orig=new T.Vector3(0,sy,0).addScaledVector(od,0.65);dir=od.clone().negate();out=od.clone();maxDx=0.15;}else if(z==='hand'){orig=new T.Vector3(p.pos[0],sy,bCenter.z+bSize.z*0.75);dir=new T.Vector3(0,0,-1);out=new T.Vector3(0,0,1);maxDx=0.15;}else if(z==='foot'){orig=new T.Vector3(p.pos[0],minY+bSize.y*0.14,p.pos[2]);dir=new T.Vector3(0,-1,0);out=new T.Vector3(0,1,0);maxDx=0.15;}else{orig=new T.Vector3(0,sy,0).addScaledVector(od,0.85);dir=od.clone().negate();out=od.clone();maxDx=9;}rc.set(orig,dir);const hits=solidTargets.length?rc.intersectObjects(solidTargets as T.Object3D[],false):[];const fHits=maxDx<5?hits.filter(h=>Math.abs(h.point.x-p.pos[0])<maxDx):hits;const hit=fHits.length?fHits[0]:(hits.length?hits[0]:null);const pos=hit?hit.point.clone().addScaledVector(out,0.005):new T.Vector3(p.pos[0],sy,p.pos[2]);return{pos,out};};\nif(acuKey!==lastAcuKey){\n  lastAcuKey=acuKey;acuGroup.clear();\n  if(ready&&s.showPoints3D&&s.points3D&&s.points3D.length){\n    const pts=s.points3D.filter(p=>!s.activeMeridian||s.activeMeridian==='全部'||p.meridian===s.activeMeridian);\n    const sg=new T.SphereGeometry(0.011,12,12);\n    const byMer=new Map<string,T.Vector3[]>();\n    pts.forEach(p=>{\n      const hi=s.activeMeridian&&s.activeMeridian!=='全部';\n      const m=new T.Mesh(sg,new T.MeshStandardMaterial({color:hi?0xf59e0b:0x38bdf8,emissive:hi?0xf59e0b:0x0284c7,emissiveIntensity:0.55}));\n      const{pos}=snapPt(p);m.userData={acupoint:p};m.position.copy(pos);acuGroup.add(m);\n      const arr=byMer.get(p.meridian)||[];arr.push(m.position.clone());byMer.set(p.meridian,arr);\n    });\n    byMer.forEach(arr=>{if(arr.length>=2){const lg=new T.BufferGeometry().setFromPoints(arr);acuGroup.add(new T.Line(lg,new T.LineBasicMaterial({color:0x38bdf8,transparent:true,opacity:0.45})));}});\n    dirty=true;\n  }\n}\nconst fp=(s as any).focusPoint3D;const focusKey=fp?(fp.id||fp.name||'')+'|'+(fp.pos?fp.pos.join(','):''):'';\nif(ready&&fp&&focusKey!==lastFocusKey){\n  lastFocusKey=focusKey;\n  const{pos:focusPos,out:focusOut}=snapPt(fp);\n  controls.target.copy(focusPos);camera.position.copy(focusPos).addScaledVector(focusOut,0.52);controls.update();\n  dirty=true;\n}else if(!fp){lastFocusKey='';}\nacuGroup.visible=!!s.showPoints3D&&amount<0.08&&!s.isolate;\n"
st = st.replace("controls.enableRotate=amount<.8;", acu_tick + "      controls.enableRotate=amount<.8;")
open(sc, "w", encoding="utf-8").write(st)

px = f"{ATLAS_DIR}/app/page.tsx"
s = open(px, "r", encoding="utf-8").read()
s = "import { TcmOverlay, type Point3D } from './tcm-panel';\nimport { loadBilingualDict, formatBilingualName, matchesBilingualQuery, type BilingualMap } from './bilingual-dict';\n" + s
s = s.replace("export default function Home(){", "export default function Home(){\n  const [zhDict,setZhDict]=useState<BilingualMap>({});useEffect(()=>{loadBilingualDict().then(setZhDict);setState(s=>({...s,onAcupointTap:(pt:Point3D)=>setState(prev=>({...prev,tappedPoint3D:pt,focusPoint3D:pt}))}));},[]);")
s = s.replace("c.name.toLowerCase().includes(term)||c.id.toLowerCase().includes(term)", "matchesBilingualQuery(c.name,term,zhDict)||c.id.toLowerCase().includes(term)")
s = s.replace("<h1>Human Atlas", "<h1>Anatomy R1-1.0.1")
s = s.replace("{chosen?.name}", "{chosen?formatBilingualName(chosen.name,zhDict):''}")
s = s.replace("{c.name}", "{formatBilingualName(c.name,zhDict)}")
for en, zh in [
    ("Find a structure", "搜索解剖结构"), (">Systems<", ">系统图层<"), (">All<", ">全部<"),
    (">Skeleton<", ">骨骼<"), (">Organs<", ">脏腑<"), (">Hide all<", ">全部隐藏<"),
    (">Explode anatomy<", ">爆炸分解<"), (">Reset<", ">重置<"), (">Isolate structure<", ">孤立观察<"),
    (">Show surrounding anatomy<", ">恢复周围结构<"), (">Clear selection<", ">清除选中<"),
    ("Drag to orbit", "单指旋转"), ("Drag to pan", "单指平移"), ("Pinch to zoom", "双指缩放"),
    ("Tap to inspect", "点击查看结构"), ("Preparing the anatomy", "正在加载高精度 3D 解剖模型"),
    ("ADULT HUMAN · MALE", "成年男性 · 3D 交互图谱"), ("ADULT HUMAN · FEMALE", "成年女性 · 3D 交互图谱"),
    ("ANATOMICAL INVENTORY", "全部解剖部件平铺"), ("SEPARATED STRUCTURES", "三维爆炸分解视图"),
]:
    s = s.replace(en, zh)
s = s.replace("</main>;", "  <TcmOverlay showPoints3D={state.showPoints3D!==false} onTogglePoints3D={v=>setState(s=>({...s,showPoints3D:v}))} onPointsLoaded={(pts:Point3D[])=>setState(s=>({...s,points3D:pts,showPoints3D:true}))} activeMeridian3D={state.activeMeridian} onSelectMeridian3D={m=>setState(s=>({...s,activeMeridian:m,showPoints3D:true}))} onFocusPoint3D={(pt:Point3D)=>setState(s=>({...s,focusPoint3D:pt,activeMeridian:pt.meridian,showPoints3D:true}))} tappedPoint3D={(state as any).tappedPoint3D||null} onClearTappedPoint3D={()=>setState(s=>({...s,tappedPoint3D:null}))} />\n  </main>;")
open(px, "w", encoding="utf-8").write(s)
print("Assembled Anatomy R1-1.0.1 cleanly; zh_dict entries:", len(zh_map))

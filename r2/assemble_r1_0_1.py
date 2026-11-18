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
    [pt.update({"system": "lymphatic" if __import__("re").search(r"lymph|thoracic duct|thymus|tonsil|spleen", (pt.get("name") or "").lower()) else ("endocrine" if __import__("re").search(r"thyroid|parathyroid|adrenal|suprarenal|pituitary|hypophysis|pineal", (pt.get("name") or "").lower()) else ("connective" if __import__("re").search(r"ligament|fascia|aponeurosis|retinaculum|meniscus", (pt.get("name") or "").lower()) else pt.get("system")))}) for pt in data.get("parts", [])]
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
); sys_desc = {"骨骼系统": "由颅骨、躯干骨（椎骨、胸骨、肋骨）及四肢骨通过骨连结构成人体支架。骨面分布有丰富的骨性标志，包括突起（如棘突、横突、乳突、粗隆、结节、髁、踝）、凹陷与窝（如关节盂、髋臼、肘窝、翼腭窝）、沟（如桡神经沟、肋沟、结节间沟）、孔与管（如枕骨大孔、椎间孔、眶上孔、颈静脉孔）及嵴（如髂嵴、胫骨前嵴、肩胛冈），共同提供杠杆支点、保护脑髓及内脏，并作为肌腱韧带附着与神经血管通道。", "肌肉系统": "由骨骼肌群通过肌腱跨关节附着于骨性标志起止点构成运动动力源。典型如胸锁乳突肌起于胸骨柄及锁骨内侧端、止于颞骨乳突；三角肌起自锁骨外侧段、肩峰及肩胛冈、止于肱骨三角肌粗隆；肱二头肌长短头分别起自肩胛骨盂上结节与喙突、止于桡骨粗隆；股四头肌起自髂前下棘及股骨粗线、经髌韧带止于胫骨粗隆；腓肠肌起自股骨内外侧髁、经跟腱止于跟骨结节。肌群间形成肌间隔与肌管，伴行主要神经干及动静脉主干。", "心脏": "位于中纵隔心包腔内的四腔肌性泵血器官，心尖朝向左前下方第5肋间隙锁骨中线内侧。左、右冠状动脉分别起自升主动脉左、右窦，沿冠状沟、前室间沟及后室间沟走行并分支营养心肌；心脏传导系统由窦房结、房室结、希氏束及浦肯野纤维网构成，受交感神经与迷走神经双重支配。", "感觉器官": "包括视觉（眼球、视路及眼副器）、听觉与前庭平衡觉（外耳、鼓室听小骨链、耳蜗及半规管）、嗅觉与味觉感受器。视觉通路经视神经管入颅交叉至外侧膝状体；位听觉感受器嵌于颞骨岩部骨迷路与内耳道内，伴行前庭蜗神经及面神经走行。", "动脉系统": "以主动脉为主干的高压富氧供血网络。主动脉弓发出头臂干、左颈总动脉及左锁骨下动脉，经颈动脉鞘、胸廓上口、腋窝及肘窝（肱动脉分支为桡、尺动脉）供血头颈与上肢；降主动脉经膈肌主动脉裂孔入腹腔，依次发出腹腔干、肠系膜上/下动脉及肾动脉，至第4腰椎平面分叉为髂总动脉，再经股动脉、腘动脉及胫前/后动脉下行至足背与足底。", "静脉系统": "分为浅静脉与深静脉伴行系统，内设静脉瓣防止血液逆流。头颈部静脉血经颈内、外静脉及锁骨下静脉汇入头臂静脉；上肢浅静脉（头静脉、贵要静脉、肘正中静脉）与深静脉并行注入上腔静脉；下肢大隐静脉经隐静脉裂孔注入股静脉，与髂静脉汇入下腔静脉；消化道静脉血经肝门静脉入肝窦处理后经肝静脉回流。", "神经系统": "由中枢神经系统（脑与脊髓）及周围神经系统（12对脑神经、31对脊神经及自主神经节）构成。脊神经经椎间孔穿出，颈丛、臂丛（锁骨下与腋动脉伴行，分出正中、尺、桡、肌皮及腋神经）、腰丛与骶丛（坐骨神经经梨状肌下孔出盆腔下行，分支为胫神经与腓总神经）沿骨沟与肌间隙精确支配躯体感觉与运动。", "呼吸系统": "由鼻腔、咽、喉、气管、主支气管及左、右肺构成气体交换通道。鼻腔外侧壁具上、中、下鼻甲及鼻道；喉由甲状软骨、环状软骨及杓状软骨支架组成；气管在胸骨角平面分叉为左右主支气管，经肺门伴行肺动静脉、支气管血管及肺丛神经入肺叶与肺段支气管。", "消化系统": "由消化管（口腔、咽、食管、胃、十二指肠、空肠、回肠、结肠、直肠）及消化腺（唾液腺、肝、胆囊、胰腺）构成。腹腔干、肠系膜上动脉与肠系膜下动脉沿肠系膜呈动脉弓样吻合供血，静脉经肠系膜上下静脉与脾静脉汇合形成肝门静脉系统，受迷走神经与腹腔神经丛调控蠕动与分泌。", "泌尿系统": "由双侧肾脏、输尿管、膀胱及尿道构成，承担代谢产物排泄与水盐酸碱平衡调节。肾脏位于腹膜后脊柱两侧肾窝内，经肾门出入肾动脉、肾静脉及肾盂；输尿管沿腰大肌前方下行，跨髂血管及骨盆入口缘斜穿膀胱壁进入膀胱三角。", "淋巴系统": "由毛细淋巴管、各级淋巴管、胸导管、右淋巴导管及淋巴器官（颈深、腋窝、腹股沟等淋巴结群、脾脏、胸腺、扁桃体）构成。腹腔淋巴汇入第1-2腰椎前方的乳糜池，经胸导管穿过膈肌主动脉裂孔沿脊柱前方上行注入左静脉角，实现组织液回流与免疫监视。", "内分泌系统": "由无导管内分泌腺体构成激素调控网络，包括蝶鞍垂体窝内的脑垂体、背侧丘脑后上方的松果体、颈前气管两侧的甲状腺及背面的4枚甲状旁腺、双侧肾上极的肾上腺、胰腺胰岛及性腺。各腺体血供极其丰富，激素直接入血调控生长发育、代谢与稳态。", "生殖系统": "由内外生殖器官及性腺构成，承担配子发生、性激素分泌与繁衍功能。盆腔内受髂内动脉分支（子宫动脉、阴部内动脉等）及生殖股神经、阴部神经（经坐骨小孔入坐骨肛门窝）与盆神经丛支配，与骨盆底肌及会阴筋膜紧密协同。", "体表皮肤": "覆盖人体表面的最大器官，由表皮、真皮及皮下组织（浅筋膜）构成，含汗腺、皮脂腺、毛囊及丰富游离神经末梢与触压觉小体。浅筋膜内穿行皮神经（如枕大神经、肋间神经皮支、隐神经、腓肠神经）及浅静脉，同时为针灸经络腧穴体表定位的直接参照界面。", "结缔组织": "包括致密结缔组织构成的韧带（如项韧带、腕横韧带、交叉韧带）、肌腱、腱膜及筋膜系统（如胸腰筋膜、阔筋膜与髂胫束），以及软骨与半月板。它们包裹分隔肌群形成筋膜室、加固关节囊、传导肌力并为穿行的血管神经提供力学保护与滑动通道。"}; [globals().update({"_t": 0}) for _ in [0]];
for zn, zd in sys_desc.items(): at = re.sub(r'\{[^{}]*name:\s*\'' + zn + r'\'[^{}]*\}', lambda om, d=zd: re.sub(r'((?:description|summary|overview|desc|text)\s*:\s*)([\'\"`])(?:\\.|(?!\2).)*?\2', lambda fm: fm.group(1) + repr(d), om.group(0), flags=re.S), at, flags=re.S)

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
    "const muscleBump=mkBump(true),boneBump=mkBump(false);\n" "const sysMats:Record<string,any>={};\n"
)
st = st.replace("const materialFor=(system:string)=>{", bump_helper + "const materialFor=(system:string)=>{")
st = st.replace(
    "metalness:.08,roughness:.53,",
    "metalness:.06,roughness:system==='skeletal'?.62:.48,bumpMap:system==='muscular'?muscleBump:system==='skeletal'?boneBump:null,bumpScale:system==='muscular'?.007:.004,clearcoat:(system==='muscular'||system==='skeletal'||system==='integumentary')?0.16:0.52,clearcoatRoughness:(system==='muscular'||system==='skeletal')?0.48:0.20,"
).replace("new T.MeshStandardMaterial", "new T.MeshPhysicalMaterial"); st = __import__('re').sub(r'(const materialFor=\(system:string\)=>\{.*?)(?:return\s+|const\s+(\w+)\s*=\s*)(new T\.MeshPhysicalMaterial\([^;]+\))', lambda m: f"{m.group(1)}const mat={m.group(3)};sysMats[system]=mat;{'return mat' if not m.group(2) else f'const {m.group(2)}=mat'}", st, count=1, flags=__import__('re').S)
st = st.replace(
    "g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));",
    "g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));const pa=new Float32Array(buffer,p.positions,p.vertexCount*3);const uvs=new Float32Array(p.vertexCount*2);for(let ui=0;ui<p.vertexCount;ui++){uvs[ui*2]=(pa[ui*3]+pa[ui*3+2])*2.5;uvs[ui*2+1]=pa[ui*3+1]*2.5;}g.setAttribute('uv',new T.BufferAttribute(uvs,2));"
)
acu_setup = "const acuGroup=new T.Group();scene.add(acuGroup);const tubeMats:any[]=[];let lastPulse=0;let tapCb:((pt:any)=>void)|null=null;let lastAcuKey='';let lastFocusKey='';let lastXray=false;let pdX=0,pdY=0;renderer.domElement.addEventListener('pointerdown',(ev:PointerEvent)=>{pdX=ev.clientX;pdY=ev.clientY;});renderer.domElement.addEventListener('pointerup',(ev:PointerEvent)=>{if(!acuGroup.visible||!acuGroup.children.length||Math.hypot(ev.clientX-pdX,ev.clientY-pdY)>8)return;const r=renderer.domElement.getBoundingClientRect();const ndc=new T.Vector2(((ev.clientX-r.left)/r.width)*2-1,-((ev.clientY-r.top)/r.height)*2+1);const tr=new T.Raycaster();tr.setFromCamera(ndc,camera);const hs=tr.intersectObjects(acuGroup.children,false);const ha=hs.find(h=>h.object?.userData?.acupoint);if(ha)tapCb?.(ha.object.userData.acupoint);});\n"; acu_setup = acu_setup.replace("let lastXray=false;", "let lastXray=false;const extraAnatGroup=new T.Group();scene.add(extraAnatGroup);let extraBuilt=false;").replace("if(!acuGroup.visible||!acuGroup.children.length||Math.hypot(ev.clientX-pdX,ev.clientY-pdY)>8)return;", "if(Math.hypot(ev.clientX-pdX,ev.clientY-pdY)>8)return;").replace("const hs=tr.intersectObjects(acuGroup.children,false);const ha=hs.find(h=>h.object?.userData?.acupoint);if(ha)tapCb?.(ha.object.userData.acupoint);", "if(acuGroup.visible&&acuGroup.children.length){const hs=tr.intersectObjects(acuGroup.children,false);const ha=hs.find(h=>h.object?.userData?.acupoint);if(ha){tapCb?.(ha.object.userData.acupoint);return;}}if(extraAnatGroup.visible&&extraAnatGroup.children.length){const ehs=tr.intersectObjects(extraAnatGroup.children,false);const eh=ehs.find(h=>h.object?.userData?.extraInfo);if(eh){const ei=eh.object.userData.extraInfo;let box=document.getElementById('extra-anat-toast');if(!box){box=document.createElement('div');box.id='extra-anat-toast';box.style.cssText='position:fixed;bottom:84px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(5,7,11,0.92);color:#e2e8f0;border:1px solid rgba(56,189,248,0.45);border-radius:10px;padding:10px 14px;max-width:340px;font-size:12px;line-height:1.5;box-shadow:0 8px 24px rgba(0,0,0,0.45);pointer-events:auto;';document.body.appendChild(box);}box.innerHTML='<div style=\"font-weight:700;color:#38bdf8;margin-bottom:4px;\">'+ei.name+' ['+ei.system+']</div><div>'+ei.desc+'</div>';clearTimeout((box as any)._t);(box as any)._t=setTimeout(()=>{box&&box.remove();},5500);tapCb?.({name:ei.name,code:ei.system,meridian:ei.system,desc:ei.desc,pos:[0,0,0]});}}")
st = st.replace("const markers=new T.Points(markerGeometry,markerMaterial);", acu_setup + "const markers=new T.Points(markerGeometry,markerMaterial);")
acu_tick = "tapCb=(s as any).onAcupointTap||null;const nx=!!(s as any).needleXray;if(nx!==lastXray){lastXray=nx;pickers.forEach((pm:any,idx:number)=>{const sys=atlas.parts[idx]?.system;if(pm&&pm.material&&(sys==='muscular'||sys==='integumentary')){pm.material.transparent=nx;pm.material.opacity=nx?0.26:1;pm.material.depthWrite=!nx;pm.material.needsUpdate=true;}});dirty=true;}const acuKey=(ready?'R':'W')+'|'+(atlas.sex||'m')+'|'+(s.showPoints3D?'1':'0')+'|'+(s.activeMeridian||'')+'|'+(s.points3D?s.points3D.length:0)+(nx?'|X':'|N');\nconst solidTargets=ready?pickers.filter((m,idx)=>!!m&&atlas.parts[idx].system!=='integumentary'):[];\nconst bodyBox=new T.Box3();if(ready)bounds.forEach((b,idx)=>{if(atlas.parts[idx].system!=='integumentary')bodyBox.union(b);});\nconst minY=bodyBox.isEmpty()?0:bodyBox.min.y,maxY=bodyBox.isEmpty()?1.7:bodyBox.max.y,spanY=Math.max(0.5,maxY-minY);const bCenter=bodyBox.isEmpty()?new T.Vector3(0,0.85,0):bodyBox.getCenter(new T.Vector3());const bSize=bodyBox.isEmpty()?new T.Vector3(0.5,1.7,0.3):bodyBox.getSize(new T.Vector3());\nconst rc=new T.Raycaster();\nconst snapPt=(p:any)=>{const sy=minY+(p.pos[1]/1.72)*spanY;const od=new T.Vector3(p.pos[0],0,p.pos[2]);if(od.lengthSq()<0.0001)od.set(0,0,1);od.normalize();const z=p.zone||'';let orig:T.Vector3,dir:T.Vector3,out:T.Vector3,maxDx=0.14;if(z==='torso_back'){orig=new T.Vector3(p.pos[0],sy,-0.9);dir=new T.Vector3(0,0,1);out=new T.Vector3(0,0,-1);maxDx=0.14;}else if(z==='torso_front'){orig=new T.Vector3(p.pos[0],sy,0.9);dir=new T.Vector3(0,0,-1);out=new T.Vector3(0,0,1);maxDx=0.14;}else if(z==='leg_back'){orig=new T.Vector3(p.pos[0],sy,-0.9);dir=new T.Vector3(0,0,1);out=new T.Vector3(0,0,-1);maxDx=0.10;}else if(z==='arm'){orig=new T.Vector3(p.pos[0],sy,p.pos[2]).addScaledVector(od,0.65);dir=od.clone().negate();out=od.clone();maxDx=0.15;}else if(z==='head'){orig=new T.Vector3(0,sy,0).addScaledVector(od,0.65);dir=od.clone().negate();out=od.clone();maxDx=0.15;}else if(z==='hand'){orig=new T.Vector3(p.pos[0],sy,bCenter.z+bSize.z*0.75);dir=new T.Vector3(0,0,-1);out=new T.Vector3(0,0,1);maxDx=0.15;}else if(z==='foot'){orig=new T.Vector3(p.pos[0],minY+bSize.y*0.14,p.pos[2]);dir=new T.Vector3(0,-1,0);out=new T.Vector3(0,1,0);maxDx=0.15;}else{orig=new T.Vector3(0,sy,0).addScaledVector(od,0.85);dir=od.clone().negate();out=od.clone();maxDx=9;}rc.set(orig,dir);const hits=solidTargets.length?rc.intersectObjects(solidTargets as T.Object3D[],false):[];const fHits=maxDx<5?hits.filter(h=>Math.abs(h.point.x-p.pos[0])<maxDx):hits;const hit=fHits.length?fHits[0]:(hits.length?hits[0]:null);const pos=hit?hit.point.clone().addScaledVector(out,0.005):new T.Vector3(p.pos[0],sy,p.pos[2]);return{pos,out};};\nif(acuKey!==lastAcuKey){\n  lastAcuKey=acuKey;acuGroup.clear();tubeMats.length=0;\n  if(ready&&s.showPoints3D&&s.points3D&&s.points3D.length){\n    const pts=s.points3D.filter(p=>!s.activeMeridian||s.activeMeridian==='全部'||p.meridian===s.activeMeridian);\n    const sg=new T.SphereGeometry(0.011,12,12);\n    const byMer=new Map<string,T.Vector3[]>();\n    pts.forEach(p=>{\n      const hi=s.activeMeridian&&s.activeMeridian!=='全部';\n      const m=new T.Mesh(sg,new T.MeshStandardMaterial({color:hi?0xf59e0b:0x38bdf8,emissive:hi?0xf59e0b:0x0284c7,emissiveIntensity:0.55}));\n      const{pos}=snapPt(p);m.userData={acupoint:p};m.position.copy(pos);acuGroup.add(m);\n      const arr=byMer.get(p.meridian)||[];arr.push(m.position.clone());byMer.set(p.meridian,arr);\n    });\n    if(s.activeMeridian&&s.activeMeridian!=='全部'){byMer.forEach(arr=>{if(arr.length>=2){const tm=new T.MeshStandardMaterial({color:0xf59e0b,emissive:0xf59e0b,emissiveIntensity:0.75,roughness:0.25});tubeMats.push(tm);acuGroup.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(arr),Math.max(12,arr.length*3),0.0028,8,false),tm));}});}\n    dirty=true;\n  }\n}\nconst fp=(s as any).focusPoint3D;const focusKey=fp?(fp.id||fp.name||'')+'|'+(fp.pos?fp.pos.join(','):''):'';\nif(ready&&fp&&focusKey!==lastFocusKey){\n  lastFocusKey=focusKey;\n  const{pos:focusPos,out:focusOut}=snapPt(fp);\n  controls.target.copy(focusPos);camera.position.copy(focusPos).addScaledVector(focusOut,0.52);controls.update();\n const oldRing=acuGroup.getObjectByName('focusRing');if(oldRing)acuGroup.remove(oldRing);const oldNeedle=acuGroup.getObjectByName('focusNeedle');if(oldNeedle)acuGroup.remove(oldNeedle);if(focusPos){const rg=new T.Mesh(new T.RingGeometry(0.016,0.023,24),new T.MeshBasicMaterial({color:0xf59e0b,side:T.DoubleSide}));rg.name='focusRing';rg.position.copy(focusPos);rg.lookAt(focusPos.clone().add(focusOut));acuGroup.add(rg);if(nx){const ang=(fp as any)?.angle||'perp';const ndDir=focusOut.clone().normalize();if(ang==='flat'){ndDir.lerp(new T.Vector3(0,1,0),0.78).normalize();}else if(ang==='oblique'){ndDir.lerp(new T.Vector3(0,1,0),0.45).normalize();}const nd=new T.Group();nd.name='focusNeedle';const sh=new T.Mesh(new T.CylinderGeometry(0.0008,0.0004,0.055,8),new T.MeshStandardMaterial({color:0xe2e8f0,metalness:0.85,roughness:0.2}));sh.position.y=0.015;const hd=new T.Mesh(new T.CylinderGeometry(0.002,0.002,0.018,8),new T.MeshStandardMaterial({color:0xf59e0b,metalness:0.8,roughness:0.25}));hd.position.y=0.051;const rGeo=new T.TorusGeometry(0.0024,0.0005,8,16);const r1=new T.Mesh(rGeo,new T.MeshStandardMaterial({color:0xf59e0b,emissive:0xf59e0b,emissiveIntensity:0.8}));r1.rotation.x=Math.PI/2;r1.position.y=0.015;const r2=new T.Mesh(rGeo,new T.MeshStandardMaterial({color:0x22d3ee,emissive:0x22d3ee,emissiveIntensity:0.8}));r2.rotation.x=Math.PI/2;r2.position.y=0.030;nd.add(sh,hd,r1,r2);nd.position.copy(focusPos);nd.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),ndDir);acuGroup.add(nd);}} dirty=true;\n}else if(!fp){lastFocusKey='';}\nacuGroup.visible=!!s.showPoints3D&&amount<0.08&&!s.isolate;if(acuGroup.visible&&tubeMats.length){const now=performance.now();if(now-lastPulse>60){lastPulse=now;const p=0.65+0.45*Math.sin(now*0.0045);tubeMats.forEach(tm=>{tm.emissiveIntensity=p;});dirty=true;}}\n"; acu_tick = acu_tick.replace("if(nx!==lastXray){lastXray=nx;", "if(nx!==lastXray){lastXray=nx;['muscular','integumentary'].forEach(sk=>{const sm=sysMats[sk];if(sm){sm.transparent=nx;sm.opacity=nx?0.22:1;sm.depthWrite=!nx;sm.needsUpdate=true;}});").replace("pm.material.opacity=nx?0.26:1;", "pm.material.opacity=nx?0.22:1;").replace("const snapPt=(p:any)=>{const sy=minY+(p.pos[1]/1.72)*spanY;const od=new T.Vector3(p.pos[0],0,p.pos[2]);", "const snapPt=(p:any,side=1)=>{const px=p.pos[0]*side;const sy=minY+(p.pos[1]/1.72)*spanY;const od=new T.Vector3(px,0,p.pos[2]);").replace("p.pos[0]", "px").replace("const hit=fHits.length?fHits[0]:(hits.length?hits[0]:null);const pos=hit?hit.point.clone().addScaledVector(out,0.005):new T.Vector3(px,sy,p.pos[2]);return{pos,out};", "let chosenHit=fHits.length?fHits[0]:(hits.length?hits[0]:null);let chosenOut=out;if(!chosenHit&&solidTargets.length){const rDir=new T.Vector3(bCenter.x-px,0,bCenter.z-p.pos[2]);if(rDir.lengthSq()<0.0001)rDir.set(0,0,-1);rDir.normalize();const rOrig=new T.Vector3(bCenter.x,sy,bCenter.z).addScaledVector(rDir,-1.2);rc.set(rOrig,rDir);const rHits=rc.intersectObjects(solidTargets as T.Object3D[],false);if(rHits.length){chosenHit=rHits[0];chosenOut=rDir.clone().negate();}}const pos=chosenHit?chosenHit.point.clone().addScaledVector(chosenOut,0.005):new T.Vector3(px,sy,p.pos[2]);return{pos,out:chosenOut};"); acu_tick = __import__('re').sub(r"const m=new T\.Mesh\(sg,.*?byMer\.set\(p\.meridian,arr\);", "const sides=Math.abs(p.pos[0])>0.012?[1,-1]:[1];sides.forEach(side=>{const m=new T.Mesh(sg,new T.MeshStandardMaterial({color:hi?0xf59e0b:0x38bdf8,emissive:hi?0xf59e0b:0x0284c7,emissiveIntensity:0.55}));const {pos}=snapPt(p,side);m.userData={acupoint:p};m.position.copy(pos);acuGroup.add(m);if(p.meridian){const mk=p.meridian+':'+side;const arr=byMer.get(mk)||[];arr.push(m.position.clone());byMer.set(mk,arr);}});", acu_tick, count=1, flags=__import__('re').S) + "if(ready&&!extraBuilt){extraBuilt=true;const addEx=(geo:any,col:number,pos:[number,number,number],name:string,sys:string,desc:string)=>{const mt=new T.MeshPhysicalMaterial({color:col,roughness:0.38,metalness:0.05,clearcoat:0.4});const ms=new T.Mesh(geo,mt);ms.position.set(bCenter.x+pos[0]*bSize.x,minY+pos[1]*spanY,bCenter.z+pos[2]*bSize.z);ms.userData={extraInfo:{name,system:sys,desc}};extraAnatGroup.add(ms);};const tdPts=[new T.Vector3(bCenter.x+0.01*bSize.x,minY+0.55*spanY,bCenter.z-0.02*bSize.z),new T.Vector3(bCenter.x+0.005*bSize.x,minY+0.68*spanY,bCenter.z-0.03*bSize.z),new T.Vector3(bCenter.x-0.02*bSize.x,minY+0.78*spanY,bCenter.z-0.01*bSize.z),new T.Vector3(bCenter.x-0.04*bSize.x,minY+0.80*spanY,bCenter.z+0.02*bSize.z)];const tdMesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(tdPts),20,0.0045,8,false),new T.MeshPhysicalMaterial({color:0x4ade80,roughness:0.35,clearcoat:0.45}));tdMesh.userData={extraInfo:{name:'胸导管',system:'lymphatic',desc:'人体最大的淋巴管，起自乳糜池，经主动脉裂孔入胸腔注入左静脉角。'}};extraAnatGroup.add(tdMesh);addEx(new T.SphereGeometry(0.012,12,12),0x4ade80,[0.01,0.54,-0.02],'乳糜池','lymphatic','位于第1-2腰椎前方的囊状膨大，汇集腰干与肠干淋巴并续于胸导管。');[-1,1].forEach(sd=>{[0,1,2].forEach(k=>{addEx(new T.SphereGeometry(0.006,10,10),0x22c55e,[sd*0.08,0.84+k*0.016,0.02],'颈深淋巴结群','lymphatic','沿颈内静脉排列，收集头颈部淋巴并汇入颈干。');addEx(new T.SphereGeometry(0.0065,10,10),0x22c55e,[sd*0.24,0.72-k*0.014,0.01],'腋窝淋巴结群','lymphatic','位于腋窝内，收集上肢、胸壁及乳房淋巴。');addEx(new T.SphereGeometry(0.0065,10,10),0x22c55e,[sd*0.16,0.47-k*0.012,0.09],'腹股沟淋巴结群','lymphatic','位于腹股沟韧带下方，收集下肢、会阴及下腹壁淋巴。');});});addEx(new T.SphereGeometry(0.007,12,12),0xf472b6,[0,0.925,0.035],'脑垂体','endocrine','位于蝶鞍垂体窝内的内分泌主腺，调控生长、甲状腺、肾上腺及性腺轴。');addEx(new T.SphereGeometry(0.0055,10,10),0xf472b6,[0,0.935,-0.02],'松果体','endocrine','位于背侧丘脑后上方，分泌褪黑素调节昼夜节律。');[-1,1].forEach(sd=>{addEx(new T.SphereGeometry(0.004,8,8),0xfbbf24,[sd*0.035,0.835,0.02],'上甲状旁腺','endocrine','位于甲状腺侧叶背面中上部，分泌甲状旁腺素调节钙磷代谢。');addEx(new T.SphereGeometry(0.004,8,8),0xfbbf24,[sd*0.035,0.818,0.02],'下甲状旁腺','endocrine','位于甲状腺侧叶背面下部，协同调节血钙平衡。');addEx(new T.ConeGeometry(0.016,0.024,10),0xf59e0b,[sd*0.11,0.58,-0.03],'肾上腺','endocrine','位于双侧肾脏上极内上方，分泌皮质激素与儿茶酚胺。');});addEx(new T.BoxGeometry(0.18,0.18,0.012),0xcbd5e1,[0,0.56,-0.12],'胸腰筋膜','connective','覆盖背部深层肌群的致密结缔组织膜，维持脊柱与核心稳定性。');[-1,1].forEach(sd=>{addEx(new T.CylinderGeometry(0.011,0.009,0.44,8),0x94a3b8,[sd*0.20,0.34,0.01],'髂胫束','connective','阔筋膜外侧增厚形成的强韧纤维带，起自髂嵴前份，止于胫骨外侧髁。');addEx(new T.BoxGeometry(0.038,0.016,0.012),0x94a3b8,[sd*0.42,0.50,0.03],'腕横韧带','connective','跨越腕骨沟前方形成腕管顶壁，保护正中神经及指屈肌腱。');});addEx(new T.BoxGeometry(0.014,0.11,0.035),0xcbd5e1,[0,0.86,-0.08],'项韧带','connective','起自枕外隆凸止于第7颈椎棘突的弹性纤维膜，限制颈椎过度前屈。');}const asys=(s as any).activeSystem||'';extraAnatGroup.children.forEach((ch:any)=>{const es=ch.userData?.extraInfo?.system;ch.visible=!asys||asys==='all'||asys===es;});"
st = st.replace("controls.enableRotate=amount<.8;", acu_tick + "      controls.enableRotate=amount<.8;")
open(sc, "w", encoding="utf-8").write(st)

open(f"{ATLAS_DIR}/app/i18n.ts", "w", encoding="utf-8").write("""export type Language = 'en' | 'ar';
export const LANGUAGES: Language[] = ['en', 'ar'];
const TEXT = {
  title: { en: 'Anatomy R1-1.0.2', ar: 'Anatomy R1-1.0.2' },
  eyebrow: { en: '3D 交互解剖 · 中医融合', ar: '3D 交互解剖 · 中医融合' },
  systems: { en: '系统图层', ar: '系统图层' },
  explode: { en: '三维爆炸分解', ar: '三维爆炸分解' },
  reset: { en: '重置', ar: '重置' },
  findStructure: { en: '搜索解剖结构', ar: '搜索解剖结构' },
  searchPlaceholder: { en: '心脏、股骨、肺经（支持中英文）...', ar: '心脏、股骨、肺经（支持中英文）...' },
  isolate: { en: '孤立观察', ar: '孤立观察' },
  showSurrounding: { en: '恢复周围结构', ar: '恢复周围结构' },
  clearSelection: { en: '清除选中', ar: '清除选中' },
  assembled: { en: '聚合', ar: '聚合' },
  everyPiece: { en: '全部分解', ar: '全部分解' },
  sourceCredits: { en: '数据来源与致谢', ar: '数据来源与致谢' },
  systemOverview: { en: '系统概览 · 基于医学解剖图谱', ar: '系统概览 · 基于医学解剖图谱' },
} as const;
export type Phrase = keyof typeof TEXT | (string & {});
export const direction = (_l?: Language): 'ltr' | 'rtl' => 'ltr';
export const fold = (s: string): string => s.toLowerCase();
export const say = (_l: Language, p: Phrase): string => (TEXT as Record<string, { en: string; ar: string }>)[p]?.en ?? String(p);
"""); px = f"{ATLAS_DIR}/app/page.tsx"
s = open(px, "r", encoding="utf-8").read()
s = "import { TcmOverlay, type Point3D } from './tcm-panel';\nimport { loadBilingualDict, formatBilingualName, matchesBilingualQuery, type BilingualMap } from './bilingual-dict';\n" + s
s = s.replace("export default function Home(){", "export default function Home(){\n  const [zhDict,setZhDict]=useState<BilingualMap>({});useEffect(()=>{loadBilingualDict().then(setZhDict);setState(s=>({...s,onAcupointTap:(pt:Point3D)=>setState(prev=>({...prev,tappedPoint3D:pt,focusPoint3D:pt}))}));},[]);")
s = s.replace("c.name.toLowerCase().includes(term)||c.id.toLowerCase().includes(term)", "matchesBilingualQuery(c.name,term,zhDict)||c.id.toLowerCase().includes(term)")
s = s.replace("<h1>Human Atlas", "<h1>Anatomy R1-1.0.2")
s = s.replace("{chosen?name(chosen.name):''}", "{chosen?formatBilingualName(chosen.name,zhDict):''}")
s = s.replace("{name(c.name)}", "{formatBilingualName(c.name,zhDict)}")
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
s = re.sub(r'className=[\'"]icon-button language-switch[\'"][^>]*>(?:(?!</Button>).)*?</Button>', 'className="icon-button language-switch" aria-label="经络穴位" title="经络穴位" onClick={()=>window.dispatchEvent(new CustomEvent(\'r2-open-tcm\'))}><span>经穴361</span></Button>', s, count=1, flags=re.S); s = s.replace('aria-label="Open system layers"><Layers3 size={20}/><span>{t(\'systems\')}</span></Button>', 'aria-label="Open system layers"><Layers3 size={20}/><span>{t(\'systems\')}</span></Button><Button variant="ghost" className="tcm-dock-btn" onClick={()=>window.dispatchEvent(new CustomEvent(\'r2-open-tcm\'))}><span>经络穴位</span></Button>'); s = re.sub(r'>\s*Systems\s*<', '>系统与经穴<', s); s = re.sub(r'>\s*All\s*<', '>全部<', s); s = re.sub(r'>\s*Skeleton\s*<', '>骨骼<', s); s = re.sub(r'>\s*Organs\s*<', '>脏腑<', s); _tcm_dock = "<button type=\"button\" className=\"tcm-dock-btn\" onClick={()=>window.dispatchEvent(new CustomEvent('r2-open-tcm'))}><span>经络穴位</span></button>"; _tcm_pre = "<button type=\"button\" onClick={()=>window.dispatchEvent(new CustomEvent('r2-open-tcm'))}>经穴361</button>"; s = re.sub(r'(>系统与经穴<(?:(?!</button>).)*?</button>)', r'\1' + _tcm_dock, s, count=1, flags=re.S) if "tcm-dock-btn" not in s else s; s = re.sub(r'(className=["\'][^"\']*bottom-dock[^"\']*["\'][^>]*>(?:(?!</button>).)*?</button>)', r'\1' + _tcm_dock, s, count=1, flags=re.S) if "tcm-dock-btn" not in s else s; s = re.sub(r'(>脏腑<(?:(?!</button>).)*?</button>)', r'\1' + _tcm_pre, s, count=1, flags=re.S); s = s.replace("</main>;", "  <TcmOverlay showPoints3D={state.showPoints3D!==false} onTogglePoints3D={v=>setState(s=>({...s,showPoints3D:v}))} onPointsLoaded={(pts:Point3D[])=>setState(s=>({...s,points3D:pts,showPoints3D:true}))} activeMeridian3D={state.activeMeridian} onSelectMeridian3D={m=>setState(s=>({...s,activeMeridian:m,showPoints3D:true}))} onFocusPoint3D={(pt:Point3D)=>setState(s=>({...s,focusPoint3D:pt,activeMeridian:pt.meridian,showPoints3D:true}))} tappedPoint3D={(state as any).tappedPoint3D||null} onClearTappedPoint3D={()=>setState(s=>({...s,tappedPoint3D:null}))} needleXray={!!(state as any).needleXray} onToggleNeedleXray={(v:boolean)=>setState(s=>({...s,needleXray:v,showPoints3D:true}))} />\n  </main>;")
open(px, "w", encoding="utf-8").write(s)
print("Assembled Anatomy R1-1.0.2 cleanly; zh_dict entries:", len(zh_map))

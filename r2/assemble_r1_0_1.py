#!/usr/bin/env python3
import glob
import json
import os
import re
import shutil
import sys

ATLAS_DIR = "/tmp/atlas-r2"
ZH_DIR = "/tmp/zh-bp3d"

for gz in glob.glob(f"{ATLAS_DIR}/public/models/*.gz"):
    os.remove(gz)

LYMPH_RE = re.compile(r"lymph|thoracic duct|thymus|tonsil|spleen", re.I)
ENDO_RE = re.compile(r"thyroid|parathyroid|adrenal|suprarenal|pituitary|hypophysis|pineal", re.I)
CONN_RE = re.compile(r"ligament|fascia|aponeurosis|retinaculum|meniscus|capsule", re.I)
ILIOTIBIAL_RE = re.compile(r"iliotibial|fascia|aponeurosis|tendon|retinaculum", re.I)
for jp in glob.glob(f"{ATLAS_DIR}/public/models/*.json"):
    data = json.load(open(jp, encoding="utf-8"))
    for ch in data.get("chunks", []):
        ch.pop("gzip", None)
        ch.pop("gzipBytes", None)
    for part in data.get("parts", []):
        if isinstance(part, dict) and (not part.get("system") or (part.get("system") == "skeletal" and (ILIOTIBIAL_RE.search(str(part.get("name", ""))) or CONN_RE.search(str(part.get("name", "")))))):
            nm = str(part.get("name", ""))
            if LYMPH_RE.search(nm):
                part["system"] = "lymphatic"
            elif ENDO_RE.search(nm):
                part["system"] = "endocrine"
            elif ILIOTIBIAL_RE.search(nm) or CONN_RE.search(nm):
                part["system"] = "muscular"
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
    "built_in_cases": d2.get("built_in_cases", []),
    "glossary": d1.get("glossary", []),
}
bundle_out = f"{ATLAS_DIR}/public/data/tcm_bundle.json"
with open(bundle_out, "w", encoding="utf-8") as f:
    json.dump(bundle, f, ensure_ascii=False, separators=(",", ":"))
sys.path.insert(0, "r2")
import upgrade_bundle
upgrade_bundle.run(bundle_out)

zh_map = {}

def walk_zh(node):
    if isinstance(node, list):
        for item in node:
            walk_zh(item)
    elif isinstance(node, dict):
        en = (node.get("nameEn") or node.get("en_name") or node.get("english") or node.get("name_en") or "").strip().lower()
        zh = (node.get("nameCn") or node.get("zh_name") or node.get("chinese") or node.get("name_zh") or node.get("cn_name") or "").strip()
        if (not en or not zh) and isinstance(node.get("name"), str) and "|" in node["name"]:
            p0, p1 = [x.strip() for x in node["name"].split("|", 1)]
            if not zh:
                zh = p0
            if not en:
                en = p1.lower()
        if en and zh and en != zh:
            zh_map[en] = zh
            if node.get("id"):
                zh_map[str(node["id"]).strip().lower()] = zh
        for v in node.values():
            if isinstance(v, (dict, list)):
                walk_zh(v)

for jp in glob.glob(f"{ZH_DIR}/**/*.json", recursive=True):
    try:
        walk_zh(json.load(open(jp, encoding="utf-8")))
    except Exception:
        pass
with open(f"{ATLAS_DIR}/public/data/zh_dict.json", "w", encoding="utf-8") as f:
    json.dump(zh_map, f, ensure_ascii=False, separators=(",", ":"))

for src in glob.glob("r2/app/*"):
    if os.path.isfile(src):
        shutil.copy2(src, f"{ATLAS_DIR}/app/{os.path.basename(src)}")

gc_p = f"{ATLAS_DIR}/app/globals.css"
if os.path.exists(gc_p):
    gc_s = open(gc_p, "r", encoding="utf-8").read().replace("@import './carbon-theme.css';", "")
    open(gc_p, "w", encoding="utf-8").write("@import './carbon-theme.css';" + chr(10) + gc_s)
lx_p = f"{ATLAS_DIR}/app/layout.tsx"
if os.path.exists(lx_p):
    lx_s = open(lx_p, "r", encoding="utf-8").read()
    if "carbon-theme.css" not in lx_s:
        open(lx_p, "w", encoding="utf-8").write("import './carbon-theme.css';" + chr(10) + lx_s)

I18N_TS = """export type Language = 'en' | 'ar';
export const LANGUAGES: { id: Language; label: string; direction: 'ltr' | 'rtl' }[] = [
  { id: 'en', label: '中文', direction: 'ltr' },
];
export const direction = (_language: Language): 'ltr' | 'rtl' => 'ltr';
export const fold = (s: string) => s.toLowerCase().normalize('NFKD');

const ZH = {
  title: 'Anatomy R1-1.0.2',
  eyebrow: '3D 交互解剖 · 中医融合',
  pieces: '个解剖结构',
  referenceBody: '标准人体',
  referenceBodyLabel: '选择人体模型',
  language: '经穴361',
  findStructure: '搜索解剖结构',
  searchAnatomy: '搜索解剖结构',
  findAnatomy: '查找解剖部位',
  searchNamed: '搜索解剖结构名称（支持中英文）',
  searchPlaceholder: '输入心脏、股骨、肺经或英文名...',
  closeSearch: '关闭搜索',
  noMatches: '未找到匹配的解剖结构。',
  searchHintEmpty: '可输入器官、骨骼、肌肉或神经的中英文名称。',
  searchHintTyping: '最多显示 80 条匹配项，可输入更精确名称缩小范围。',
  piece: '个结构',
  pieces_plural: '个结构',
  systems: '系统图层',
  anatomicalLayers: '解剖系统图层',
  openLayers: '打开系统图层',
  closeSystems: '关闭系统图层',
  presetAll: '全部',
  presetSkeleton: '骨骼',
  presetOrgans: '脏腑',
  showOnly: '仅显示',
  show: '显示',
  piecesVisible: '个结构可见',
  hideAll: '全部隐藏',
  cameraControls: '视角控制',
  explorerPanels: '功能面板',
  viewThreeQuarter: '四分之三视角',
  viewFront: '正面视角',
  viewSide: '侧面视角',
  viewBack: '背面视角',
  autoRotate: '自动旋转',
  rotateBody: '旋转人体',
  pauseRotation: '暂停旋转',
  reset: '重置',
  resetView: '重置视角与图层',
  assembleReset: '复原并重置',
  explode: '三维爆炸分解',
  assembled: '聚合',
  everyPiece: '全部分解',
  inventory: '解剖部件总览',
  separated: '三维爆炸分解视图',
  selectedStructure: '已选解剖结构',
  dragToOrbit: '单指旋转',
  dragToPan: '单指平移',
  pinchToZoom: '双指缩放',
  tapToInspect: '点击查看详情',
  anatomy: '解剖结构',
  atlasReference: '图谱编号',
  selectedPieces: '选中网格数',
  includedStructures: '包含子结构',
  andMore: '个更多建模部件。',
  and: '另有',
  systemOverview: '系统概览 · 含骨性标志与起止点说明',
  isolate: '孤立观察',
  showSurrounding: '恢复周围结构',
  clearSelection: '清除选中',
  viewSource: '查看解剖数据来源',
  aboutThisAtlas: '关于 Anatomy R1-1.0.2',
  sourceScope: '数据来源与范围',
  aboutTitle: '3D 人体解剖与中医经络图谱',
  aboutIntro: '探索成年',
  aboutIntroFrom: '标准解剖模型，数据来自',
  shared: '男女双性模型融合 BodyParts3D 4.0 与 NIH HRA 数据集，并补充胸导管、淋巴结群、内分泌腺体与筋膜结缔组织，以及国标 361 经穴。',
  caveat: '本应用用于医学解剖与中医针灸教学参考，不作为临床诊断或手术操作依据。',
  sourceHeading: '数据来源',
  datasetLicense: '数据许可',
  originalGeometry: '原始几何与元数据',
  readPublication: '阅读相关文献',
  sourceCredits: '数据来源与致谢',
  preparing: '正在加载高精度 3D 解剖模型',
  loadingBody: '正在载入',
  reference: '标准解剖数据',
  reloadViewer: '重新加载视图',
  catalogueError: '解剖目录加载失败，请重试。',
} as const;

export type Phrase = keyof typeof ZH;
export const say = (_language: Language, phrase: Phrase) => ZH[phrase];
"""
open(f"{ATLAS_DIR}/app/i18n.ts", "w", encoding="utf-8").write(I18N_TS)

an_p = f"{ATLAS_DIR}/app/anatomy.ts"
if os.path.exists(an_p):
    at = open(an_p, "r", encoding="utf-8").read()
    SYS_ZH = {
        "Skeletal": "骨骼系统", "Muscular": "肌肉系统", "Nervous": "神经系统",
        "Cardiovascular": "心血管系统", "Arterial": "动脉系统", "Venous": "静脉系统",
        "Lymphatic": "淋巴系统", "Respiratory": "呼吸系统", "Digestive": "消化系统",
        "Urinary": "泌尿系统", "Reproductive": "生殖系统", "Endocrine": "内分泌系统",
        "Integumentary": "体被皮肤系统", "Sense Organs": "感觉器官", "Articular": "关节韧带与结缔组织",
        "Connective": "结缔筋膜系统", "Heart": "心脏", "Male": "成年男性", "Female": "成年女性",
        "Skeleton": "骨骼系统", "Muscles": "肌肉系统", "Sensory organs": "感觉器官", "Arteries": "动脉系统", "Veins": "静脉系统", "Nervous system": "神经系统", "Lymphatic system": "淋巴系统", "Respiratory system": "呼吸系统", "Digestive system": "消化系统", "Urinary system": "泌尿系统", "Reproductive system": "生殖系统", "Endocrine system": "内分泌系统", "Integumentary system": "体被皮肤系统", "Connective tissue": "结缔组织与韧带", "Joints & ligaments": "关节与韧带",
    }
    for en, zh in SYS_ZH.items():
        at = re.sub(rf"(name|label)\s*:\s*(['\"]){re.escape(en)}(\s+System)?\2", rf"\1:'{zh}'", at)
    DESC_ZH = {
        "Bones form the supporting framework": "骨骼构成人体支架、保护脏器并提供肌肉附着；表面分布突、棘、嵴、粗隆、结节、髁、窝、沟、孔、管等骨性标志，既是体表触诊与骨度分寸取穴基准，也参与矿物质储存与造血。",
        "Skeletal muscles generate movement": "骨骼肌通过肌腱起止于骨骼与筋膜，收缩牵引关节产生运动并维持姿势；肌间隙与深筋膜是重要神经血管束及中医经筋、腠理循行层次。",
        "Arteries carry": "动脉系统将含氧血自心脏输送至全身组织与脏腑，分支常伴行于骨沟与肌间隔，针刺深层穴位需严格避让主干动脉。",
        "Veins return": "静脉系统将静脉血回流至心脏，包含浅静脉网与深伴行静脉。",
        "The nervous system": "神经系统由脑、脊髓与周围神经丛构成，主导感觉传导、运动支配与内脏自主调节。",
    }
    for prefix, zh_desc in DESC_ZH.items():
        at = re.sub(rf"(['\"]){re.escape(prefix)}[^'\"]*\1", f"'{zh_desc}'", at)
    open(an_p, "w", encoding="utf-8").write(at)

sc_p = f"{ATLAS_DIR}/app/scene.tsx"
st = open(sc_p, "r", encoding="utf-8").read()
st = "import { createProceduralBump, setupStudioLighting, R2OverlayEngine } from './r2-scene-core';\n" + st
st = st.replace("renderer.setClearColor('#f2f3f3')", "renderer.setClearColor('#05070b')")
for old_c in ("color:0xd5d9dc", "color:0xeeeeec", "color:0xe5e7eb"):
    st = st.replace(old_c, "color:0x05070b")
st = st.replace("color:0x8c969f", "color:0xf59e0b").replace("color:0xa4aeb8", "color:0x38bdf8")
st = st.replace("innerWidth<768?1.5:2", "3")
st = st.replace(
    "const materialFor=(system:string)=>{",
    "const muscleBump=createProceduralBump(true),boneBump=createProceduralBump(false);const sysMats:Record<string,any>={};\nconst materialFor=(system:string)=>{",
)
st = st.replace("new T.MeshStandardMaterial(", "new T.MeshPhysicalMaterial(")
st = st.replace(
    "metalness:.08,roughness:.53,",
    "metalness:.06,roughness:system==='skeletal'?.62:.46,clearcoat:system==='arterial'||system==='venous'||system==='digestive'||system==='urinary'?.55:.12,bumpMap:system==='muscular'?muscleBump:system==='skeletal'?boneBump:null,bumpScale:system==='muscular'?.007:.004,",
)
# sysMats populated via scene.traverse
st = st.replace(
    "g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));",
    "g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));const pa=new Float32Array(buffer,p.positions,p.vertexCount*3);const uvs=new Float32Array(p.vertexCount*2);for(let ui=0;ui<p.vertexCount;ui++){uvs[ui*2]=(pa[ui*3]+pa[ui*3+2])*2.5;uvs[ui*2+1]=pa[ui*3+1]*2.5;}g.setAttribute('uv',new T.BufferAttribute(uvs,2));",
)
st = st.replace(
    "const markers=new T.Points(markerGeometry,markerMaterial);",
    "setupStudioLighting(scene,renderer);const r2Engine=new R2OverlayEngine({scene,camera,renderer,controls});\nconst markers=new T.Points(markerGeometry,markerMaterial);",
)
st = st.replace(
    "controls.enableRotate=amount<.8;",
    "if(ready&&!Object.keys(sysMats).length){scene.traverse((o:any)=>{if(o.isMesh&&o.material&&o.userData?.system)sysMats[o.userData.system]=o.material;});}if(r2Engine.tick({ready,sex:atlas.sex||'m',state:s,amount,atlas,pickers,bounds,sysMats}))dirty=true;\n        controls.enableRotate=amount<.8;",
)
open(sc_p, "w", encoding="utf-8").write(st)

px_p = f"{ATLAS_DIR}/app/page.tsx"
ps = open(px_p, "r", encoding="utf-8").read()
ps = (
    "import { TcmOverlay, type Point3D } from './tcm-panel';\n"
    "import { loadBilingualDict, formatBilingualName, matchesBilingualQuery, type BilingualMap } from './bilingual-dict';\n"
    "import { getChineseAnatomyExplanation } from './r2-bone-landmarks';\n"
    + ps
)
home_hook = (
    "export default function Home(){\n"
    "  const [zhDict,setZhDict]=useState<BilingualMap>({});\n"
    "  const [extraInfo,setExtraInfo]=useState<{name:string;system:string;desc:string;isQuizHit?:boolean}|null>(null);\n"
    "  const [bonePins,setBonePins]=useState<any[]>([]);\n"
    "  const [boneQuiz,setBoneQuiz]=useState<string>('');\n"
    "  const pinsRef=useRef<any[]>([]);\n"
    "  useEffect(()=>{pinsRef.current=bonePins;},[bonePins]);\n"
    "  useEffect(()=>{setState(s=>({...s,boneQuizMode:!!boneQuiz,boneQuizTarget:boneQuiz} as any));},[boneQuiz]);\n"
    "  useEffect(()=>{\n"
    "    loadBilingualDict().then(setZhDict);\n"
    "    setState(s=>({...s,\n"
    "      onAcupointTap:(pt:Point3D)=>setState(prev=>({...prev,tappedPoint3D:pt,focusPoint3D:pt} as any)),\n"
    "      onBonePinsLoaded:(pins:any[])=>setBonePins(pins),\n"
    "      onExtraTap:(info:any)=>{setExtraInfo(info);if(info?.isQuizHit){setTimeout(()=>{const ps=pinsRef.current;if(ps.length){setBoneQuiz(ps[Math.floor(Math.random()*ps.length)].name);}},900);}},\n"
    "    } as any));\n"
    "  },[]);\n"
)
ps = ps.replace("export default function Home(){", home_hook, 1)
ps = ps.replace("c.name.toLowerCase().includes(term)||c.id.toLowerCase().includes(term)", "matchesBilingualQuery(c.name,term,zhDict)||c.id.toLowerCase().includes(term)")
ps = ps.replace("{chosen?name(chosen.name):''}", "{chosen?formatBilingualName(chosen.name,zhDict):''}").replace("{chosen?.name}", "{chosen?.name?formatBilingualName(chosen.name,zhDict):''}").replace("{selected?.name}", "{selected?.name?formatBilingualName(selected.name,zhDict):''}")
ps = ps.replace("{name(c.name)}", "{formatBilingualName(c.name,zhDict)}")
ps = ps.replace("{name(p.name)}", "{formatBilingualName(p.name,zhDict)}")
ps = ps.replace("Male reference body", "成年男性标准体").replace("Female reference body", "成年女性标准体")
ps = ps.replace("ADULT HUMAN · MALE", "成年男性 · 3D 解剖图谱").replace("ADULT HUMAN · FEMALE", "成年女性 · 3D 解剖图谱").replace("{chosen&&selected?explanation(chosen.name,selected.system,sex,language):''}", "{chosen&&selected?getChineseAnatomyExplanation(chosen.name,selected.system):''}").replace('className="structure-description"', 'className="structure-description" style={{whiteSpace:\'pre-line\'}}')
ps = ps.replace(
    'aria-label="Open system layers"><Layers3 size={20}/><span>{t(\'systems\')}</span></Button>',
    'aria-label="Open system layers"><Layers3 size={20}/><span>{t(\'systems\')}</span></Button><Button variant="ghost" className="tcm-dock-btn" onClick={()=>window.dispatchEvent(new CustomEvent(\'r2-open-tcm\'))}><span>经络穴位</span></Button>',
)
extra_card = "{extraInfo&&<div className=\"glass\" style={{position:'fixed',left:14,right:14,bottom:112,zIndex:36,maxWidth:440,margin:'0 auto',borderRadius:16,padding:'12px 32px 10px',textAlign:'center',borderColor:'var(--r2-accent)'}}><button type=\"button\" className=\"tcm-close\" onClick={()=>setExtraInfo(null)} style={{position:'absolute',top:8,right:10}}>×</button><div style={{fontSize:18,fontWeight:700,color:'#f8fafc',lineHeight:1.3}}>{extraInfo.name}</div><div style={{marginTop:6,paddingTop:6,borderTop:'1px solid rgba(255,255,255,0.14)',fontSize:12,color:'#cbd5e1',lineHeight:1.4}}>{extraInfo.system&&<span style={{color:'#94a3b8',marginRight:6}}>{extraInfo.system} ·</span>}{extraInfo.desc}</div></div>}"
quiz_bar = "{bonePins.length>0&&<div className=\"glass\" style={{position:'fixed',top:68,left:'50%',transform:'translateX(-50%)',zIndex:36,display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:999,borderColor:'var(--r2-accent)',whiteSpace:'nowrap'}}>{!boneQuiz?<button type=\"button\" onClick={()=>{const p=bonePins[Math.floor(Math.random()*bonePins.length)];const n=p?.name||p?.label||String(p||'');setBoneQuiz(n);setState((s:any)=>({...s,boneQuizTarget:n}));}} style={{background:'var(--r2-accent)',color:'#0f172a',border:'none',borderRadius:999,padding:'4px 12px',fontSize:12,fontWeight:700,cursor:'pointer'}}>开始骨性标志 3D 测验</button>:<><span style={{fontSize:12,color:'#f8fafc',fontWeight:600}}>请在 3D 骨骼上点出：【{boneQuiz}】</span><button type=\"button\" onClick={()=>{const p=bonePins[Math.floor(Math.random()*bonePins.length)];const n=p?.name||p?.label||String(p||'');setBoneQuiz(n);setState((s:any)=>({...s,boneQuizTarget:n}));}} style={{background:'rgba(255,255,255,0.12)',color:'#f8fafc',border:'none',borderRadius:999,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>下一题</button><button type=\"button\" onClick={()=>{setBoneQuiz('');setState((s:any)=>({...s,boneQuizTarget:''}));}} style={{background:'rgba(239,68,68,0.2)',color:'#fca5a5',border:'none',borderRadius:999,padding:'3px 10px',fontSize:11,cursor:'pointer'}}>退出测验</button></>}</div>}"
overlay_jsx = "<TcmOverlay showPoints3D={(state as any).showPoints3D!==false} onTogglePoints3D={v=>setState(s=>({...s,showPoints3D:v}))} onPointsLoaded={(pts:Point3D[])=>setState(s=>({...s,points3D:pts,showPoints3D:true}))} activeMeridian3D={(state as any).activeMeridian} onSelectMeridian3D={m=>setState(s=>({...s,activeMeridian:m,showPoints3D:true}))} onFocusPoint3D={(pt:Point3D)=>setState(s=>({...s,focusPoint3D:pt,activeMeridian:pt.meridian,showPoints3D:true}))} tappedPoint3D={(state as any).tappedPoint3D||null} onClearTappedPoint3D={()=>setState(s=>({...s,tappedPoint3D:null}))} needleXray={!!(state as any).needleXray} onToggleNeedleXray={(v:boolean)=>setState(s=>({...s,needleXray:v,showPoints3D:true}))} showLigaments={!!(state as any).showLigaments} onToggleLigaments={(v:boolean)=>setState(s=>({...s,showLigaments:v} as any))} />"
ps = ps.replace("</main>;", f"  {extra_card}\n  {quiz_bar}\n  {overlay_jsx}\n  </main>;")
lig_btn = '<button type="button" onClick={()=>setState(s=>({...s,showLigaments:!(s as any).showLigaments} as any))} style={{padding:"4px 10px",borderRadius:999,fontSize:12,cursor:"pointer",border:"1px solid rgba(148,163,184,.35)",background:(state as any).showLigaments?"rgba(16,185,129,.22)":"rgba(15,23,42,.6)",color:(state as any).showLigaments?"#6ee7b7":"#e2e8f0"}}>关节韧带</button>'
ps = re.sub(r'(<(?:button|Button)[ >](?:(?!</?(?:button|Button)[ >]).)*?(?:presetOrgans|脏腑).*?</(?:button|Button)>)', lambda m: m.group(1) + lig_btn, ps, count=1, flags=re.DOTALL)
open(px_p, "w", encoding="utf-8").write(ps)
print(f"Assembled Anatomy R1-1.0.2 cleanly; zh_dict entries: {len(zh_map)}")
print(f"Assembled Anatomy R1-1.0.2 cleanly; zh_dict entries: {len(zh_map)}")

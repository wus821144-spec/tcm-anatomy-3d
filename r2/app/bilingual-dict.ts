export type BilingualMap = Record<string, string>;

const ANATOMY_ROOT_ZH: Array<[RegExp, string]> = [
  [/^vh_f_/i, '女性'],
  [/^vh_m_/i, '男性'],
  [/\bleft\b/i, '左'],
  [/\bright\b/i, '右'],
  [/\banterior\b/i, '前'],
  [/\bposterior\b/i, '后'],
  [/\bmedial\b/i, '内侧'],
  [/\blateral\b/i, '外侧'],
  [/\bsuperior\b/i, '上'],
  [/\binferior\b/i, '下'],
  [/\bsuperficial\b/i, '浅'],
  [/\bdeep\b/i, '深'],
  [/\bproximal\b/i, '近端'],
  [/\bdistal\b/i, '远端'],
  [/\bgluteus\s+maximus\b/i, '臀大肌'],
  [/\bgluteus\s+medius\b/i, '臀中肌'],
  [/\bgluteus\s+minimus\b/i, '臀小肌'],
  [/\bgluteus\b/i, '臀肌'],
  [/\bgluteal\b/i, '臀部'],
  [/\bquadriceps\b/i, '股四头肌'],
  [/\bfemoral\b/i, '股'],
  [/\bfemur\b/i, '股骨'],
  [/\btibial\b/i, '胫'],
  [/\btibia\b/i, '胫骨'],
  [/\bfibular\b/i, '腓'],
  [/\bfibula\b/i, '腓骨'],
  [/\buterus\b/i, '子宫'],
  [/\buterine\b/i, '子宫'],
  [/\bovary\b/i, '卵巢'],
  [/\bovarian\b/i, '卵巢'],
  [/\bpelvis\b/i, '骨盆'],
  [/\bpelvic\b/i, '骨盆'],
  [/\biliac\b/i, '髂'],
  [/\bsacral\b/i, '骶'],
  [/\blumbar\b/i, '腰'],
  [/\bthoracic\b/i, '胸'],
  [/\bcervical\b/i, '颈'],
  [/\brectus\b/i, '直肌'],
  [/\bvastus\b/i, '股肌'],
  [/\bsartorius\b/i, '缝匠肌'],
  [/\bgracilis\b/i, '股薄肌'],
  [/\bgastrocnemius\b/i, '腓肠肌'],
  [/\bsoleus\b/i, '比目鱼肌'],
  [/\badductor\b/i, '内收肌'],
  [/\babductor\b/i, '外展肌'],
  [/\bmuscle\b/i, '肌'],
  [/\bartery\b/i, '动脉'],
  [/\bvein\b/i, '静脉'],
  [/\bnerve\b/i, '神经'],
  [/\bligament\b/i, '韧带'],
  [/\btendon\b/i, '肌腱'],
  [/\bfascia\b/i, '筋膜'],
  [/\bjoint\b/i, '关节'],
  [/\bbone\b/i, '骨'],
  [/\bskin\b/i, '皮肤'],
[/\bpectoralis\s+major\b/i, '胸大肌'],
[/\bpectoralis\s+minor\b/i, '胸小肌'],
[/\bdeltoid\b/i, '三角肌'],
[/\btrapezius\b/i, '斜方肌'],
[/\blatissimus\s+dorsi\b/i, '背阔肌'],
[/\bserratus\b/i, '前锯肌'],
[/\brectus\s+abdominis\b/i, '腹直肌'],
[/\boblique\b/i, '斜肌'],
[/\btransversus\b/i, '腹横肌'],
[/\bsternocleidomastoid\b/i, '胸锁乳突肌'],
[/\bmasseter\b/i, '咬肌'],
[/\btemporalis\b/i, '颞肌'],
[/\bbiceps\s+brachii\b/i, '肱二头肌'],
[/\btriceps\s+brachii\b/i, '肱三头肌'],
[/\bbrachialis\b/i, '肱肌'],
[/\bbrachioradialis\b/i, '肱桡肌'],
[/\bpronator\b/i, '旋前肌'],
[/\bsupinator\b/i, '旋后肌'],
[/\bdiaphragm\b/i, '膈肌'],
[/\bintercostal\b/i, '肋间'],
[/\bfrontal\b/i, '额骨'],
[/\bparietal\b/i, '顶骨'],
[/\boccipital\b/i, '枕骨'],
[/\btemporal\b/i, '颞骨'],
[/\bsphenoid\b/i, '蝶骨'],
[/\bethmoid\b/i, '筛骨'],
[/\bzygomatic\b/i, '颧骨'],
[/\bmaxilla\b/i, '上颌骨'],
[/\bcarpal\b/i, '腕骨'],
[/\bmetacarpal\b/i, '掌骨'],
[/\btarsal\b/i, '跗骨'],
[/\bmetatarsal\b/i, '跖骨'],
[/\bphalanges\b/i, '指(趾)骨'],
[/\bcalcaneus\b/i, '跟骨'],
[/\btalus\b/i, '距骨'],
[/\bmeniscus\b/i, '半月板'],
[/\bpericardium\b/i, '心包'],
[/\bpleura\b/i, '胸膜'],
[/\btrachea\b/i, '气管'],
[/\bbronchus\b/i, '支气管'],
[/\besophagus\b/i, '食管'],
[/\bgallbladder\b/i, '胆囊'],
[/\bbladder\b/i, '膀胱'],
[/\bureter\b/i, '输尿管'],
[/\burethra\b/i, '尿道'],
[/\bduodenum\b/i, '十二指肠'],
[/\bjejunum\b/i, '空肠'],
[/\bileum\b/i, '回肠'],
[/\bcecum\b/i, '盲肠'],
[/\bcolon\b/i, '结肠'],
[/\brectum\b/i, '直肠'],
[/\bthyroid\b/i, '甲状腺'],
[/\badrenal\b/i, '肾上腺'],
[/\bthymus\b/i, '胸腺'],
[/\bpituitary\b/i, '垂体'],
[/\bperitoneum\b/i, '腹膜'],
[/\bspinal\s+cord\b/i, '脊髓'],
[/\bbrachial\s+plexus\b/i, '臂丛'],
[/\bsciatic\b/i, '坐骨'],
[/\bvagus\b/i, '迷走'],
[/\bphrenic\b/i, '膈'],
[/\bcarotid\b/i, '颈'],
[/\bjugular\b/i, '颈内/外'],
[/\bsubclavian\b/i, '锁骨下'],
[/\brenal\b/i, '肾'],
[/\bhepatic\b/i, '肝'],
[/\bsplenic\b/i, '脾'],
[/\bcoronary\b/i, '冠状'],
[/\bpulmonary\b/i, '肺'],
];

export async function loadBilingualDict(): Promise<BilingualMap> {
  try {
    const r = await fetch('/data/zh_dict.json');
    if (!r.ok) return {};
    return (await r.json()) as BilingualMap;
  } catch {
    return {};
  }
}

export function lookupZhName(enName: string, dict: BilingualMap): string {
  if (!enName) return '';
  const raw = enName.trim();
  const key = raw.toLowerCase();
  if (dict[key]) return dict[key];

  const cleaned = key
    .replace(/^vh_[fm]_/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (dict[cleaned]) return dict[cleaned];

  const normalized = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const parts: string[] = [];
  if (/^vh_f_/i.test(raw)) parts.push('女性');
  else if (/^vh_m_/i.test(raw)) parts.push('男性');

  for (const [pattern, zh] of ANATOMY_ROOT_ZH) {
    if (pattern.source.startsWith('^vh_')) continue;
    if (pattern.test(normalized) && !parts.includes(zh)) {
      parts.push(zh);
    }
  }

  return parts.length > 0 ? parts.join('') : '';
}

export function formatBilingualName(enName: string, dict: BilingualMap): string {
  if (!enName) return '';
  const zh = lookupZhName(enName, dict);
  return zh ? `${zh} · ${enName}` : enName;
}

export function matchesBilingualQuery(enName: string, query: string, dict: BilingualMap): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (enName.toLowerCase().includes(q)) return true;
  const zh = lookupZhName(enName, dict);
  return !!zh && zh.toLowerCase().includes(q);
}

export const EXT_API = { mode: 'modular-standalone-v16', syncEnabled: false };

const DB_NAME = 'tcm_industrial_db_v16';
const STORE_NOTES = 'notes';
const STORE_TOOLS = 'tools';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function openDB() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NOTES)) db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORE_TOOLS)) db.createObjectStore(STORE_TOOLS, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

export async function saveNote(id, data) {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NOTES, 'readwrite');
    tx.objectStore(STORE_NOTES).put({ id, ...data, updatedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

export async function loadNote(id) {
  const db = await openDB();
  if (!db) return { note: '', color: 'none' };
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NOTES, 'readonly');
    const req = tx.objectStore(STORE_NOTES).get(id);
    req.onsuccess = () => resolve(req.result || { note: '', color: 'none' });
    req.onerror = () => resolve({ note: '', color: 'none' });
  });
}

export async function getAllNotes() {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NOTES, 'readonly');
    const req = tx.objectStore(STORE_NOTES).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export async function saveToolItem(item) {
  const db = await openDB();
  if (!db) return;
  const tx = db.transaction(STORE_TOOLS, 'readwrite');
  tx.objectStore(STORE_TOOLS).put(item);
}

export async function loadAllToolItems() {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_TOOLS, 'readonly');
    const req = tx.objectStore(STORE_TOOLS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export async function clearAllToolItems() {
  const db = await openDB();
  if (!db) return;
  const tx = db.transaction(STORE_TOOLS, 'readwrite');
  tx.objectStore(STORE_TOOLS).clear();
}

const ANAT_DICT = [
  ['sternocleidomastoid', '胸锁乳突肌'], ['brachioradialis', '肱桡肌'], ['gastrocnemius', '腓肠肌'],
  ['soleus', '比目鱼肌'], ['calcaneus', '跟骨'], ['talus', '距骨'], ['navicular', '足舟骨'],
  ['cuboid', '骰骨'], ['cuneiform', '楔骨'], ['metatarsal', '跖骨'], ['metacarpal', '掌骨'],
  ['phalanx', '指/趾骨'], ['hyoid', '舌骨'], ['vomer', '犁骨'], ['ethmoid', '筛骨'],
  ['sphenoid', '蝶骨'], ['occipital', '枕骨'], ['parietal', '顶骨'], ['temporal', '颞骨'],
  ['frontal', '额骨'], ['maxilla', '上颌骨'], ['mandible', '下颌骨'], ['zygomatic', '颧骨'],
  ['lacrimal', '泪骨'], ['nasal', '鼻骨'], ['palatine', '腭骨'], ['arytenoid', '杓状软骨'],
  ['cricoid', '环状软骨'], ['trapezius', '斜方肌'], ['latissimus', '背阔肌'],
  ['deltoid', '三角肌'], ['quadriceps', '股四头肌'],

  ['intertubercular sulcus', '结节间沟'], ['radial groove', '桡神经沟'], ['sciatic notch', '坐骨切迹'],
  ['styloid process', '茎突'], ['mastoid process', '乳突'], ['spinous process', '棘突'],
  ['transverse process', '横突'], ['coronoid process', '冠突'], ['xiphoid process', '剑突'],
  ['anterior', '前'], ['posterior', '后'], ['superior', '上'], ['inferior', '下'],
  ['medial', '内侧'], ['lateral', '外侧'], ['left', '左'], ['right', '右'], ['deep', '深'], ['superficial', '浅'],
  ['acromion', '肩峰'], ['coracoid', '喙突'], ['olecranon', '鹰嘴'], ['glenoid', '关节盂'], ['acetabulum', '髋臼'],
  ['sternum', '胸骨'], ['manubrium', '胸骨柄'], ['clavicle', '锁骨'], ['scapula', '肩胛骨'], ['humerus', '肱骨'],
  ['radius', '桡骨'], ['ulna', '尺骨'], ['carpal', '腕骨'], ['metacarpal', '掌骨'], ['phalanx', '指/趾骨'],
  ['femur', '股骨'], ['tibia', '胫骨'], ['fibula', '腓骨'], ['patella', '髌骨'], ['tarsal', '跗骨'], ['calcaneus', '跟骨'],
  ['pelvis', '骨盆'], ['ilium', '髂骨'], ['ischium', '坐骨'], ['pubis', '耻骨'], ['sacrum', '骶骨'], ['coccyx', '尾骨'],
  ['vertebra', '椎骨'], ['cervical', '颈椎'], ['thoracic', '胸椎'], ['lumbar', '腰椎'], ['rib', '肋骨'],
  ['skull', '颅骨'], ['frontal', '额骨'], ['parietal', '顶骨'], ['occipital', '枕骨'], ['temporal', '颞骨'],
  ['sphenoid', '蝶骨'], ['ethmoid', '筛骨'], ['mandible', '下颌骨'], ['maxilla', '上颌骨'], ['zygomatic', '颧骨'],
  ['heart', '心脏'], ['atrium', '心房'], ['ventricle', '心室'], ['aorta', '主动脉'], ['vena cava', '腔静脉'],
  ['lung', '肺'], ['bronchus', '支气管'], ['trachea', '气管'], ['diaphragm', '膈肌'],
  ['liver', '肝脏'], ['gallbladder', '胆囊'], ['stomach', '胃'], ['duodenum', '十二指肠'], ['colon', '结肠'],
  ['pancreas', '胰腺'], ['spleen', '脾脏'], ['kidney', '肾脏'], ['ureter', '输尿管'], ['bladder', '膀胱'],
  ['brain', '脑'], ['cerebrum', '大脑'], ['cerebellum', '小脑'], ['brainstem', '脑干'], ['spinal cord', '脊髓'],
  ['uterus', '子宫'], ['ovary', '卵巢'], ['fallopian', '输卵管'], ['vagina', '阴道'],
  ['prostate', '前列腺'], ['testis', '睾丸'], ['seminal', '精囊'],
  ['biceps', '二头肌'], ['triceps', '三头肌'], ['deltoid', '三角肌'], ['trapezius', '斜方肌'],
  ['latissimus', '背阔肌'], ['pectoralis', '胸肌'], ['rectus abdominis', '腹直肌'], ['gluteus', '臀肌'],
  ['quadriceps', '股四头肌'], ['gastrocnemius', '腓肠肌'], ['soleus', '比目鱼肌'], ['sternocleidomastoid', '胸锁乳突肌'],
  ['carotid', '颈动脉'], ['jugular', '颈静脉'], ['subclavian', '锁骨下'], ['brachial', '肱'], ['radial', '桡'],
  ['ulnar', '尺'], ['femoral', '股'], ['popliteal', '腘'], ['tibial', '胫'], ['sciatic', '坐骨'], ['vagus', '迷走'],
  ['median', '正中'], ['facial', '面'], ['trigeminal', '三叉'], ['phrenic', '膈'],
  ['ligament', '韧带'], ['tendon', '肌腱'], ['meniscus', '半月板'], ['cartilage', '软骨'], ['fascia', '筋膜'],
  ['sulcus', '沟'], ['groove', '沟'], ['tubercle', '结节'], ['tuberosity', '粗隆'], ['fossa', '窝'],
  ['foramen', '孔'], ['notch', '切迹'], ['crest', '嵴'], ['condyle', '髁'], ['epicondyle', '上髁'],
  ['process', '突'], ['spine', '棘'], ['artery', '动脉'], ['vein', '静脉'], ['nerve', '神经'],
  ['muscle', '肌'], ['joint', '关节'], ['capsule', '关节囊'], ['gland', '腺'], ['plexus', '丛']
];

export function translateAnatName(raw) {
  const low = (raw || '').toLowerCase();
  const hits = [];
  for (const [en, zh] of ANAT_DICT) {
    if (low.includes(en) && !hits.includes(zh)) hits.push(zh);
  }
  return hits.length ? hits.join(' · ') : '标准解剖结构';
}

export async function loadCoreDataset() {
  const res = await fetch('./data/anatomy_tcm_data.json');
  return res.json();
}

export async function loadMeshIndex() {
  try {
    const res = await fetch('./data/mesh_index.json');
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export function searchAll(query, dataset, meshIndex) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const results = [];
  (dataset.points || []).forEach((p) => {
    if (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.sub.toLowerCase().includes(q) ||
      p.anatomy.toLowerCase().includes(q) ||
      (p.ontology && p.ontology.toLowerCase().includes(q))
    ) {
      results.push({ isCurated: true, label: p.name, sub: `${p.category} · ${p.sub}`, raw: p });
    }
  });
  (dataset.full_acupoints_catalog || []).forEach((a) => {
    if (results.length < 22 && !(dataset.points || []).some((p) => p.id === a.code)) {
      if (a.name.includes(q) || a.code.toLowerCase().includes(q) || a.meridian.includes(q)) {
        results.push({ isCatalog361: true, label: `${a.name} (${a.code})`, sub: `${a.meridian} · 国标361穴位库`, raw: a });
      }
    }
  });
  for (let i = 0; i < meshIndex.length && results.length < 32; i++) {
    const m = meshIndex[i];
    const zh = translateAnatName(m.raw);
    if ((m.raw || '').toLowerCase().includes(q) || zh.toLowerCase().includes(q) || (m.ta2 || '').toLowerCase().includes(q)) {
      results.push({ isCurated: false, label: `${m.raw} (${zh})`, sub: `${m.sys} · ${m.region}`, raw: m });
    }
  }
  return results;
}

export async function loadMedicalKB() {
  try {
    const r = await fetch('./data/tcm_medical_kb.json');
    if (!r.ok) return { systems: [], acupoint_details: {}, nursing_details: [] };
    return await r.json();
  } catch {
    return { systems: [], acupoint_details: {}, nursing_details: [] };
  }
}

export function getExplanationMode() {
  return localStorage.getItem('tcm_detail_mode') === 'detailed' ? 'detailed' : 'simple';
}

export function setExplanationMode(mode) {
  const m = mode === 'detailed' ? 'detailed' : 'simple';
  localStorage.setItem('tcm_detail_mode', m);
  return m;
}

export function getGitHubKBUrl() {
  return (localStorage.getItem('tcm_gh_kb_url') || '').trim().replace(/\/+$/, '');
}

export function setGitHubKBUrl(url) {
  const clean = (url || '').trim().replace(/\/+$/, '');
  localStorage.setItem('tcm_gh_kb_url', clean);
  return clean;
}

export function saveCloudCache(key, payload) {
  try { localStorage.setItem('tcm_cloud_cache_' + key, JSON.stringify(payload)); } catch {}
}

export function loadCloudCache(key) {
  try {
    const raw = localStorage.getItem('tcm_cloud_cache_' + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function syncGitHubCloudKB(baseUrl, medicalKB) {
  const cleanBase = setGitHubKBUrl(baseUrl);
  if (!cleanBase) return { ok: false, msg: '请先填写 GitHub Raw 仓库根地址' };
  const [rAcu, rCases] = await Promise.all([
    fetch(`${cleanBase}/cloud_acupoints_ext.json`),
    fetch(`${cleanBase}/cloud_nursing_cases.json`)
  ]);
  if (!rAcu.ok) throw new Error('云端穴位库读取失败 (' + rAcu.status + ')');
  const acuExt = await rAcu.json();
  const casesExt = rCases.ok ? await rCases.json() : [];
  saveCloudCache('acupoints', acuExt);
  saveCloudCache('cases', casesExt);
  if (medicalKB) {
    medicalKB.acupoint_details = Object.assign({}, acuExt, medicalKB.acupoint_details || {});
    medicalKB.cloud_cases = casesExt;
  }
  return { ok: true, acuCount: Object.keys(acuExt).length, caseCount: casesExt.length };
}

export function mergeCachedCloudKB(medicalKB) {
  const acuExt = loadCloudCache('acupoints');
  const casesExt = loadCloudCache('cases');
  if (acuExt && medicalKB) {
    medicalKB.acupoint_details = Object.assign({}, acuExt, medicalKB.acupoint_details || {});
  }
  if (casesExt && medicalKB) {
    medicalKB.cloud_cases = casesExt;
  }
}

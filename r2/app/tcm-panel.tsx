import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock, Compass, Eye, Layers, Search, X } from 'lucide-react';
import { applyCarbonAccent, CARBON_ACCENTS, loadSavedCarbonAccent, r2Plugins, type CarbonAccent } from './plugin-registry';

r2Plugins.register({ id: 'tcm-ziwu-clock', name: '子午流注经络时钟', version: '1.0.1', category: 'tcm' });
r2Plugins.register({ id: 'tcm-361-acupoints', name: '国标361经穴与方剂护理', version: '1.0.1', category: 'tcm' });
r2Plugins.register({ id: 'tcm-3d-meridians', name: '3D体表吸附穴位与经络图层', version: '1.0.1', category: 'tcm' });
r2Plugins.register({ id: 'dual-sex-atlas', name: '男女双性别高精度解剖引擎', version: '1.0.1', category: 'anatomy' });
r2Plugins.register({ id: 'bilingual-bp3d', name: 'BodyParts3D 中英双语词典', version: '1.0.1', category: 'anatomy' });
r2Plugins.register({ id: 'carbon-theme-switcher', name: '碳墨黑多辅色引擎', version: '1.0.1', category: 'theme' });

export interface Point3D {
  name: string;
  code?: string;
  meridian: string;
  pos: [number, number, number];
}

interface AcupointItem {
  code?: string;
  name: string;
  meridian?: string;
  ontology?: string;
}

interface AcupointDetail {
  simple?: string;
  detailed?: string;
}

interface MeridianItem {
  name: string;
  code?: string;
  category?: string;
  pathway?: string;
  indications?: string;
}

interface PrescriptionItem {
  disease?: string;
  mainPoints?: string;
  adjunct?: string;
  care?: string;
}

interface NursingItem {
  name?: string;
  indications?: string;
  params?: string;
  cautions?: string;
  detailed?: string;
}

interface GlossaryItem {
  term?: string;
  name?: string;
  desc?: string;
  definition?: string;
}

interface TcmBundle {
  meridians: MeridianItem[];
  points?: Point3D[];
  full_acupoints_catalog: AcupointItem[];
  acupoint_details: Record<string, AcupointDetail>;
  tcm_prescriptions: PrescriptionItem[];
  nursing_protocols: NursingItem[];
  nursing_details: NursingItem[];
  glossary?: GlossaryItem[];
}

const ZIWU_TABLE = [
  { hours: [23, 0], shichen: '子时 (23:00-01:00)', meridian: '足少阳胆经', point: '足临泣 / 丘墟', verse: '胆经子时旺，少阳枢机畅，静卧养阴胆气生。' },
  { hours: [1, 2], shichen: '丑时 (01:00-03:00)', meridian: '足厥阴肝经', point: '太冲 / 期门', verse: '丑时肝血归，太冲解郁结，深眠养肝护双目。' },
  { hours: [3, 4], shichen: '寅时 (03:00-05:00)', meridian: '手太阴肺经', point: '太渊 / 列缺', verse: '肺朝百脉寅，太渊脉之会，宣发肃降气血始。' },
  { hours: [5, 6], shichen: '卯时 (05:00-07:00)', meridian: '手阳明大肠经', point: '合谷 / 曲池', verse: '面口合谷收，卯时大肠清，温饮助腑气下行。' },
  { hours: [7, 8], shichen: '辰时 (07:00-09:00)', meridian: '足阳明胃经', point: '足三里 / 天枢', verse: '肚腹三里留，辰时脾胃受，温食早餐养后天。' },
  { hours: [9, 10], shichen: '巳时 (09:00-11:00)', meridian: '足太阴脾经', point: '三阴交 / 太白', verse: '妇科三阴交，巳时脾运健，化生气血润四肢。' },
  { hours: [11, 12], shichen: '午时 (11:00-13:00)', meridian: '手少阴心经', point: '神门 / 少府', verse: '午时心经旺，神门安神志，小憩片刻养心阴。' },
  { hours: [13, 14], shichen: '未时 (13:00-15:00)', meridian: '手太阳小肠经', point: '后溪 / 腕骨', verse: '头项寻列缺，腰背督后溪，分清泌浊助吸收。' },
  { hours: [15, 16], shichen: '申时 (15:00-17:00)', meridian: '足太阳膀胱经', point: '委中 / 睛明', verse: '腰背委中求，申时津液通，多饮温水清膀胱。' },
  { hours: [17, 18], shichen: '酉时 (17:00-19:00)', meridian: '足少阴肾经', point: '太溪 / 涌泉', verse: '酉时肾藏精，太溪补元阴，收摄元气蓄精微。' },
  { hours: [19, 20], shichen: '戌时 (19:00-21:00)', meridian: '手厥阴心包经', point: '内关 / 劳宫', verse: '内关心胸胃，戌时心包舒，畅情怡神护心脉。' },
  { hours: [21, 22], shichen: '亥时 (21:00-23:00)', meridian: '手少阳三焦经', point: '外关 / 支沟', verse: '胁肋寻支沟，亥时三焦宁，百脉休养迎子时。' }
];

interface TcmOverlayProps {
  showPoints3D?: boolean;
  onTogglePoints3D?: (next: boolean) => void;
  onPointsLoaded?: (pts: Point3D[]) => void;
  activeMeridian3D?: string;
  onSelectMeridian3D?: (meridian: string) => void;
}

export function TcmOverlay({
  showPoints3D = true,
  onTogglePoints3D,
  onPointsLoaded,
  onSelectMeridian3D
}: TcmOverlayProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'ziwu' | 'points' | 'meridians' | 'rx'>('ziwu');
  const [accent, setAccent] = useState<CarbonAccent>(() => loadSavedCarbonAccent());
  const [bundle, setBundle] = useState<TcmBundle | null>(null);
  const [query, setQuery] = useState('');
  const [meridianFilter, setMeridianFilter] = useState('全部');
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);

  useEffect(() => { applyCarbonAccent(accent); }, [accent]);

  useEffect(() => {
    fetch('/data/tcm_bundle.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          const tb = d as TcmBundle;
          setBundle(tb);
          if (tb.points && onPointsLoaded) onPointsLoaded(tb.points);
        }
      })
      .catch(() => {});
  }, []);

  const currentZiwu = useMemo(() => {
    const h = new Date().getHours();
    return ZIWU_TABLE.find((z) => z.hours.includes(h)) || ZIWU_TABLE[0];
  }, [open]);

  const filteredPoints = useMemo(() => {
    if (!bundle) return [];
    const q = query.trim().toLowerCase();
    return bundle.full_acupoints_catalog
      .filter((p) => {
        if (meridianFilter !== '全部' && p.meridian !== meridianFilter) return false;
        if (!q) return true;
        const det = bundle.acupoint_details?.[p.name];
        return (
          (p.name || '').toLowerCase().includes(q) ||
          (p.code || '').toLowerCase().includes(q) ||
          (p.meridian || '').toLowerCase().includes(q) ||
          (det?.detailed || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 80);
  }, [bundle, query, meridianFilter]);

  const selectMeridian = (m: string) => {
    setMeridianFilter(m);
    if (onSelectMeridian3D) onSelectMeridian3D(m);
  };

  return (
    <>
      <button type="button" className="tcm-fab glass" onClick={() => setOpen((v) => !v)} aria-label="打开中医经络与子午流注">
        <Compass size={15} />
        <span>中医 · {currentZiwu.shichen.split(' ')[0]}</span>
      </button>

      {open && (
        <div className="tcm-modal-backdrop" onClick={() => setOpen(false)}>
          <aside className="tcm-sheet glass" onClick={(e) => e.stopPropagation()}>
            <div className="tcm-sheet-head">
              <div>
                <div className="tcm-eyebrow">Anatomy R1-1.0.1 · 已载入 {r2Plugins.list().length} 项模块</div>
                <h2>中医经络 · 361经穴与临床百科</h2>
              </div>
              <button type="button" className="tcm-close" onClick={() => setOpen(false)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>

            <div className="tcm-theme-row" aria-label="碳墨黑辅色与3D穴位开关">
              {CARBON_ACCENTS.map((a) => (
                <button key={a.id} type="button" className={`tcm-theme-pill ${accent === a.id ? 'active' : ''}`} onClick={() => setAccent(a.id)}>
                  <span className="tcm-theme-dot" style={{ background: a.hex }} />
                  {a.label}
                </button>
              ))}
              {onTogglePoints3D && (
                <button type="button" className={`tcm-theme-pill ${showPoints3D ? 'active' : ''}`} onClick={() => onTogglePoints3D(!showPoints3D)}>
                  <Eye size={12} /> 3D穴位{showPoints3D ? '开' : '关'}
                </button>
              )}
            </div>

            <div className="tcm-tabs">
              <button type="button" className={tab === 'ziwu' ? 'active' : ''} onClick={() => setTab('ziwu')}>
                <Clock size={13} /> 子午流注
              </button>
              <button type="button" className={tab === 'points' ? 'active' : ''} onClick={() => setTab('points')}>
                <Compass size={13} /> 经穴361
              </button>
              <button type="button" className={tab === 'meridians' ? 'active' : ''} onClick={() => setTab('meridians')}>
                <Layers size={13} /> 经脉名解
              </button>
              <button type="button" className={tab === 'rx' ? 'active' : ''} onClick={() => setTab('rx')}>
                <BookOpen size={13} /> 方剂护理
              </button>
            </div>

            <div className="tcm-body">
              {tab === 'ziwu' && (
                <div className="tcm-stack">
                  <div className="tcm-hero-card">
                    <div className="tcm-badge">当前时辰 · {currentZiwu.shichen}</div>
                    <h3>{currentZiwu.meridian}</h3>
                    <p className="tcm-meta">当令要穴：<strong>{currentZiwu.point}</strong></p>
                    <p className="tcm-verse">{currentZiwu.verse}</p>
                    <button type="button" className="tcm-action-btn" onClick={() => { selectMeridian(currentZiwu.meridian); setTab('points'); }}>
                      在 3D 人体与列表高亮该经络
                    </button>
                  </div>
                  <div className="tcm-grid">
                    {ZIWU_TABLE.map((z) => (
                      <button type="button" key={z.shichen} className={`tcm-mini-card ${z.shichen === currentZiwu.shichen ? 'now' : ''}`} onClick={() => { selectMeridian(z.meridian); setTab('points'); }}>
                        <strong>{z.shichen.split(' ')[0]} · {z.meridian}</strong>
                        <span>{z.point}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'points' && (
                <div className="tcm-stack">
                  <div className="tcm-search-bar">
                    <Search size={15} />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索穴位名称、编码(LU1)、经络或主治..." />
                  </div>
                  <div className="tcm-chip-row">
                    <button type="button" className={meridianFilter === '全部' ? 'active' : ''} onClick={() => selectMeridian('全部')}>全部</button>
                    {(bundle?.meridians ?? []).map((m) => (
                      <button type="button" key={m.name} className={meridianFilter === m.name ? 'active' : ''} onClick={() => selectMeridian(m.name)}>{m.name}</button>
                    ))}
                  </div>
                  <div className="tcm-list">
                    {filteredPoints.map((pt) => {
                      const detail = bundle?.acupoint_details?.[pt.name];
                      const isExp = expandedPoint === pt.name;
                      return (
                        <div key={`${pt.code || ''}-${pt.name}`} className="tcm-item-card">
                          <button type="button" className="tcm-item-trigger" onClick={() => setExpandedPoint(isExp ? null : pt.name)}>
                            <span><strong>{pt.name}</strong> {pt.code ? `(${pt.code})` : ''}</span>
                            <small>{pt.meridian || '经外奇穴'}</small>
                          </button>
                          {isExp && (
                            <div className="tcm-item-detail">
                              {pt.ontology && <p><b>国标：</b>{pt.ontology}</p>}
                              {detail?.simple && <p><b>概要：</b>{detail.simple}</p>}
                              {detail?.detailed && <p><b>详解：</b>{detail.detailed}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab === 'meridians' && (
                <div className="tcm-stack">
                  <h4 className="tcm-sec-title">二十脉循行与主治 ({bundle?.meridians.length ?? 0})</h4>
                  {(bundle?.meridians ?? []).map((m, i) => (
                    <div key={i} className="tcm-item-card static">
                      <strong>{m.name} {m.code ? `(${m.code})` : ''}</strong>
                      {m.pathway && <p><b>循行：</b>{m.pathway}</p>}
                      {m.indications && <p><b>主治：</b>{m.indications}</p>}
                    </div>
                  ))}
                  {!!(bundle?.glossary && bundle.glossary.length) && (
                    <>
                      <h4 className="tcm-sec-title">中医经络术语名解 ({bundle.glossary.length})</h4>
                      {bundle.glossary.map((g, i) => (
                        <div key={i} className="tcm-item-card static">
                          <strong>{g.term || g.name || `术语 ${i + 1}`}</strong>
                          {(g.desc || g.definition) && <p>{g.desc || g.definition}</p>}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {tab === 'rx' && (
                <div className="tcm-stack">
                  <h4 className="tcm-sec-title">辨证配穴处方 ({bundle?.tcm_prescriptions.length ?? 0})</h4>
                  {(bundle?.tcm_prescriptions ?? []).map((rx, i) => (
                    <div key={i} className="tcm-item-card static">
                      <strong>{rx.disease || `处方 ${i + 1}`}</strong>
                      {rx.mainPoints && <p><b>主穴：</b>{rx.mainPoints}</p>}
                      {rx.adjunct && <p><b>配穴：</b>{rx.adjunct}</p>}
                      {rx.care && <p><b>护理：</b>{rx.care}</p>}
                    </div>
                  ))}
                  <h4 className="tcm-sec-title">中医护理操作规范 ({(bundle?.nursing_protocols.length ?? 0) + (bundle?.nursing_details.length ?? 0)})</h4>
                  {[...(bundle?.nursing_protocols ?? []), ...(bundle?.nursing_details ?? [])].map((n, i) => (
                    <div key={i} className="tcm-item-card static">
                      <strong>{n.name || `护理规范 ${i + 1}`}</strong>
                      {n.indications && <p><b>适应症：</b>{n.indications}</p>}
                      {n.params && <p><b>参数：</b>{n.params}</p>}
                      {n.cautions && <p><b>注意：</b>{n.cautions}</p>}
                      {n.detailed && <p><b>详解：</b>{n.detailed}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

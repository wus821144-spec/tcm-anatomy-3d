import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock, Compass, Search, X } from 'lucide-react';

interface AcupointItem {
  code?: string;
  name: string;
  pinyin?: string;
  meridian?: string;
  location?: string;
  indications?: string;
  method?: string;
}

interface MeridianItem {
  name: string;
  code?: string;
  category?: string;
  pathway?: string;
  indications?: string;
}

interface PrescriptionItem {
  name: string;
  syndrome?: string;
  points?: string;
  method?: string;
}

interface NursingItem {
  title?: string;
  name?: string;
  steps?: string;
  notes?: string;
  content?: string;
}

interface TcmBundle {
  meridians: MeridianItem[];
  full_acupoints_catalog: AcupointItem[];
  acupoint_details: Record<string, Partial<AcupointItem>>;
  tcm_prescriptions: PrescriptionItem[];
  nursing_protocols: NursingItem[];
  nursing_details: NursingItem[];
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

export function TcmOverlay({ onSelectAnatomy }: { onSelectAnatomy?: (term: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'ziwu' | 'points' | 'rx'>('ziwu');
  const [bundle, setBundle] = useState<TcmBundle | null>(null);
  const [query, setQuery] = useState('');
  const [meridianFilter, setMeridianFilter] = useState('全部');
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/tcm_bundle.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setBundle(d as TcmBundle); })
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
        return (
          (p.name || '').toLowerCase().includes(q) ||
          (p.code || '').toLowerCase().includes(q) ||
          (p.pinyin || '').toLowerCase().includes(q) ||
          (p.meridian || '').toLowerCase().includes(q) ||
          (p.indications || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 60);
  }, [bundle, query, meridianFilter]);

  return (
    <>
      <button
        type="button"
        className="tcm-fab glass"
        onClick={() => setOpen((v) => !v)}
        aria-label="打开中医经络与子午流注"
      >
        <Compass size={16} />
        <span>中医经络 · {currentZiwu.shichen.split(' ')[0]}</span>
      </button>

      {open && (
        <div className="tcm-modal-backdrop" onClick={() => setOpen(false)}>
          <aside className="tcm-sheet glass" onClick={(e) => e.stopPropagation()}>
            <div className="tcm-sheet-head">
              <div>
                <div className="tcm-eyebrow">TRADITIONAL CHINESE MEDICINE · 离线图谱</div>
                <h2>中医经络 · 361经穴与临床百科</h2>
              </div>
              <button type="button" className="tcm-close" onClick={() => setOpen(false)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>

            <div className="tcm-tabs">
              <button type="button" className={tab === 'ziwu' ? 'active' : ''} onClick={() => setTab('ziwu')}>
                <Clock size={14} /> 子午流注
              </button>
              <button type="button" className={tab === 'points' ? 'active' : ''} onClick={() => setTab('points')}>
                <Compass size={14} /> 经络穴位
              </button>
              <button type="button" className={tab === 'rx' ? 'active' : ''} onClick={() => setTab('rx')}>
                <BookOpen size={14} /> 方剂护理
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
                    {onSelectAnatomy && (
                      <button
                        type="button"
                        className="tcm-action-btn"
                        onClick={() => {
                          setTab('points');
                          setMeridianFilter(currentZiwu.meridian);
                        }}
                      >
                        查看该经络全部穴位
                      </button>
                    )}
                  </div>
                  <div className="tcm-grid">
                    {ZIWU_TABLE.map((z) => (
                      <button
                        type="button"
                        key={z.shichen}
                        className={`tcm-mini-card ${z.shichen === currentZiwu.shichen ? 'now' : ''}`}
                        onClick={() => {
                          setMeridianFilter(z.meridian);
                          setTab('points');
                        }}
                      >
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
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="搜索穴位名称、编码(LU1)、拼音或主治..."
                    />
                  </div>
                  <div className="tcm-chip-row">
                    <button
                      type="button"
                      className={meridianFilter === '全部' ? 'active' : ''}
                      onClick={() => setMeridianFilter('全部')}
                    >
                      全部
                    </button>
                    {(bundle?.meridians ?? []).map((m) => (
                      <button
                        type="button"
                        key={m.name}
                        className={meridianFilter === m.name ? 'active' : ''}
                        onClick={() => setMeridianFilter(m.name)}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                  <div className="tcm-list">
                    {filteredPoints.map((pt) => {
                      const detail = bundle?.acupoint_details?.[pt.name] || {};
                      const isExp = expandedPoint === pt.name;
                      return (
                        <div key={`${pt.code || ''}-${pt.name}`} className="tcm-item-card">
                          <button
                            type="button"
                            className="tcm-item-trigger"
                            onClick={() => setExpandedPoint(isExp ? null : pt.name)}
                          >
                            <span>
                              <strong>{pt.name}</strong> {pt.code ? `(${pt.code})` : ''}
                            </span>
                            <small>{pt.meridian || '经外奇穴'}</small>
                          </button>
                          {isExp && (
                            <div className="tcm-item-detail">
                              {(detail.location || pt.location) && <p><b>定位：</b>{detail.location || pt.location}</p>}
                              {(detail.indications || pt.indications) && <p><b>主治：</b>{detail.indications || pt.indications}</p>}
                              {(detail.method || pt.method) && <p><b>刺灸：</b>{detail.method || pt.method}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab === 'rx' && (
                <div className="tcm-stack">
                  <h4 className="tcm-sec-title">辨证配穴处方 ({bundle?.tcm_prescriptions.length ?? 0})</h4>
                  {(bundle?.tcm_prescriptions ?? []).map((rx, i) => (
                    <div key={i} className="tcm-item-card static">
                      <strong>{rx.name}</strong>
                      {rx.syndrome && <p><b>证候：</b>{rx.syndrome}</p>}
                      {rx.points && <p><b>配穴：</b>{rx.points}</p>}
                      {rx.method && <p><b>治法：</b>{rx.method}</p>}
                    </div>
                  ))}
                  <h4 className="tcm-sec-title">中医护理操作规范 ({(bundle?.nursing_protocols.length ?? 0) + (bundle?.nursing_details.length ?? 0)})</h4>
                  {[...(bundle?.nursing_protocols ?? []), ...(bundle?.nursing_details ?? [])].map((n, i) => (
                    <div key={i} className="tcm-item-card static">
                      <strong>{n.title || n.name || `护理规范 ${i + 1}`}</strong>
                      {(n.steps || n.content) && <p>{n.steps || n.content}</p>}
                      {n.notes && <p><b>注意：</b>{n.notes}</p>}
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

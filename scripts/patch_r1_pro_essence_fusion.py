#!/usr/bin/env python3
"""
R1-Pro Open-Source Essence Fusion Patch
Integrates best-in-class features from open-source 3D anatomy & TCM projects:
1. Exploded View (from ashemag/human-atlas): radial/layer separation toggle (btn-explode)
   using reversible per-mesh _origPos offsets.
2. Real-Time Ziwu Liuzhu Meridian Clock (from jeson998/ziwu-meridian-clock):
   local-time 12-shichen meridian & acupoint highlight (btn-ziwu).
3. Classical TCM Mnemonics (from galaxy-hzy/meridian-atlas):
   offline classical verses attached to Ziwu Liuzhu & meridian inspection.
"""
import os
import re

ESSENCE_JS = r"""
// === R1-Pro Open-Source Essence Fusion: Exploded View + Ziwu Liuzhu Clock ===
(function initR1ProEssenceFusion() {
  const ZIWU_TABLE = [
    { hours: [23, 0], shichen: '子时 (23:00-01:00)', meridian: '足少阳胆经', point: '足临泣 / 丘墟', tip: '胆经当令，宜静卧养阴、利胆生发；歌诀：胆经子时旺，少阳枢机畅。' },
    { hours: [1, 2], shichen: '丑时 (01:00-03:00)', meridian: '足厥阴肝经', point: '太冲 / 期门', tip: '肝经当令，主藏血疏泄，深眠养肝血；歌诀：丑时肝血归，太冲解郁结。' },
    { hours: [3, 4], shichen: '寅时 (03:00-05:00)', meridian: '手太阴肺经', point: '太渊 / 列缺', tip: '肺经当令，气血始流注，主宣发肃降；歌诀：肺朝百脉寅，太渊脉之会。' },
    { hours: [5, 6], shichen: '卯时 (05:00-07:00)', meridian: '手阳明大肠经', point: '合谷 / 曲池', tip: '大肠经当令，宜温水排浊；歌诀：面口合谷收，卯时大肠清。' },
    { hours: [7, 8], shichen: '辰时 (07:00-09:00)', meridian: '足阳明胃经', point: '足三里 / 天枢', tip: '胃经当令，宜温食早餐；歌诀：肚腹三里留，辰时脾胃受。' },
    { hours: [9, 10], shichen: '巳时 (09:00-11:00)', meridian: '足太阴脾经', point: '三阴交 / 太白', tip: '脾经当令，运化水谷精微；歌诀：妇科三阴交，巳时脾运健。' },
    { hours: [11, 12], shichen: '午时 (11:00-13:00)', meridian: '手少阴心经', point: '神门 / 少府', tip: '心经当令，宜小憩养神；歌诀：午时心经旺，神门安神志。' },
    { hours: [13, 14], shichen: '未时 (13:00-15:00)', meridian: '手太阳小肠经', point: '后溪 / 腕骨', tip: '小肠经当令，分清泌浊；歌诀：头项寻列缺，腰背督后溪。' },
    { hours: [15, 16], shichen: '申时 (15:00-17:00)', meridian: '足太阳膀胱经', point: '委中 / 睛明', tip: '膀胱经当令，宜饮水通利；歌诀：腰背委中求，申时津液通。' },
    { hours: [17, 18], shichen: '酉时 (17:00-19:00)', meridian: '足少阴肾经', point: '太溪 / 涌泉', tip: '肾经当令，藏精纳气；歌诀：酉时肾藏精，太溪补元阴。' },
    { hours: [19, 20], shichen: '戌时 (19:00-21:00)', meridian: '手厥阴心包经', point: '内关 / 劳宫', tip: '心包经当令，护心安神；歌诀：内关心胸胃，戌时心包舒。' },
    { hours: [21, 22], shichen: '亥时 (21:00-23:00)', meridian: '手少阳三焦经', point: '外关 / 支沟', tip: '三焦经当令，百脉休养生息；歌诀：胁肋寻支沟，亥时三焦宁。' }
  ];

  let exploded = false;
  function mountEssenceUI() {
    const btnExplode = document.getElementById('btn-explode');
    if (btnExplode && typeof anatomyGroup !== 'undefined') {
      btnExplode.addEventListener('click', () => {
        exploded = !exploded;
        btnExplode.classList.toggle('on', exploded);
        const layerOffset = {
          Skeleton: [0, 0, 0],
          LigamentJoint: [0, 0.04, 0.06],
          Visceral: [0, 0.02, 0.24],
          Neurovascular: [0.16, 0.02, 0.12],
          Muscular: [0.28, 0.0, 0.04],
          Skin: [0.42, 0.0, -0.04]
        };
        anatomyGroup.traverse((c) => {
          if (!c.isMesh) return;
          if (!c.userData._origPos) c.userData._origPos = c.position.clone();
          if (!exploded) {
            c.position.copy(c.userData._origPos);
          } else {
            const parts = (c.name || '').split('__');
            const sys = parts.length >= 2 ? parts[0] : 'Visceral';
            const off = layerOffset[sys] || [0.12, 0, 0.12];
            const box = new THREE.Box3().setFromObject(c);
            const ctr = new THREE.Vector3();
            if (!box.isEmpty()) box.getCenter(ctr);
            const sideSign = ctr.x < -0.01 ? -1 : (ctr.x > 0.01 ? 1 : 0);
            c.position.set(
              c.userData._origPos.x + off[0] * sideSign,
              c.userData._origPos.y + off[1],
              c.userData._origPos.z + off[2]
            );
          }
        });
        if (typeof toastEl !== 'undefined' && toastEl) {
          toastEl.innerText = exploded
            ? '爆炸分解视图：骨骼/脏腑/脉管/肌群已按层级空间分离'
            : '已还原标准解剖复位视图';
        }
      });
    }

    const btnZiwu = document.getElementById('btn-ziwu');
    if (btnZiwu) {
      btnZiwu.addEventListener('click', () => {
        const hr = new Date().getHours();
        const item = ZIWU_TABLE.find((z) => z.hours.includes(hr)) || ZIWU_TABLE[0];
        btnZiwu.classList.add('on');
        if (typeof toastEl !== 'undefined' && toastEl) {
          toastEl.innerText = `子午流注 · ${item.shichen}【${item.meridian}】主穴：${item.point} — ${item.tip}`;
        }
        const si = document.getElementById('search-input');
        if (si) {
          si.value = item.meridian;
          si.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    }
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', mountEssenceUI);
  else mountEssenceUI();
})();
"""


def patch_html(path: str) -> None:
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    if 'id="btn-explode"' not in html:
        anchor = '\x3cbutton id="btn-ghost" class="btn glass">半隐\x3c/button>'
        insert = (
            anchor
            + '\n        \x3cbutton id="btn-explode" class="btn glass">爆炸分解\x3c/button>'
            + '\n        \x3cbutton id="btn-ziwu" class="btn glass">子午流注\x3c/button>'
        )
        if anchor in html:
            html = html.replace(anchor, insert, 1)
        else:
            html = re.sub(
                r'(\x3cdiv class="tool-strip">)',
                r'\1\n        \x3cbutton id="btn-explode" class="btn glass">爆炸分解\x3c/button>\n        \x3cbutton id="btn-ziwu" class="btn glass">子午流注\x3c/button>',
                html, count=1
            )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"{path}: injected btn-explode & btn-ziwu")


def patch_app_js(path: str) -> None:
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        js = f.read()
    if 'initR1ProEssenceFusion' not in js:
        js = js + "\n" + ESSENCE_JS
    with open(path, 'w', encoding='utf-8') as f:
        f.write(js)
    print(f"{path}: injected Exploded View + Ziwu Liuzhu Meridian Clock")


if __name__ == '__main__':
    for p in ['src/index.html', 'www/index.html']:
        patch_html(p)
    patch_app_js('src/app.js')

# EOF

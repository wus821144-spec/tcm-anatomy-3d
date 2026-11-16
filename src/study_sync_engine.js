import { saveNote } from './data_manager.js';

export function speakMedicalText(text) {
  if (!('speechSynthesis' in window) || !text) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.96;
  window.speechSynthesis.speak(u);
  return true;
}

export function extractCoursewareBookmarks(rawText, dataset) {
  if (!rawText) return [];
  const hits = [];
  const seen = new Set();
  for (const p of (dataset.points || [])) {
    if (p.name && p.name.length >= 2 && rawText.includes(p.name) && !seen.has(p.id)) {
      seen.add(p.id);
      hits.push({ id: p.id, name: p.name, sub: p.sub, zone: p.zone, point: p });
    }
    if (hits.length >= 40) break;
  }
  return hits;
}

export async function importNotesPackage(jsonText) {
  const arr = JSON.parse(jsonText);
  if (!Array.isArray(arr)) throw new Error('无效的笔记包格式');
  let count = 0;
  for (const item of arr) {
    if (item && item.id) {
      await saveNote(item.id, { note: item.note || '', color: item.color || 'none', ts: Date.now() });
      count++;
    }
  }
  return count;
}

export function createQuizCoach({ dataset, engine, focusZone, openDrawer, toastEl }) {
  let total = 0, correct = 0, currentTarget = null;
  const wrongBank = [];

  function renderQuizCard() {
    const box = document.getElementById('quiz-box');
    const stat = document.getElementById('quiz-stat');
    if (stat) stat.innerText = `得分: ${correct} / ${total}（错题: ${wrongBank.length}）`;
    if (!box || !currentTarget) return;
    const pool = (dataset.points || []).filter((p) => p.id !== currentTarget.id);
    const distractors = [];
    while (distractors.length < 3 && pool.length > 0) {
      distractors.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    const options = [currentTarget, ...distractors].sort(() => Math.random() - 0.5);
    box.innerHTML = `
      <div style="margin-bottom:8px;">
        <strong style="color:#fbbf24;">【3D 识图闯关】</strong> 已将镜头聚焦至 <strong>${currentTarget.zone}</strong> 区并亮灯，请判断该高亮定位点的名称：
        <div style="font-size:12px;color:#94a3b8;margin-top:3px;">提示：${currentTarget.sub || currentTarget.category}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;" id="quiz-opt-grid">
        ${options.map((o) => `<button class="btn glass quiz-opt" data-id="${o.id}" style="text-align:left;padding:7px 10px;">${o.name}</button>`).join('')}
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
        <button id="btn-quiz-fly" class="btn glass on">切回 3D 看高亮位置</button>
        ${wrongBank.length ? `<button id="btn-quiz-review" class="btn glass" style="color:#fda4af;">复盘最近错题 (${wrongBank.length})</button>` : ''}
      </div>
    `;
  }

  function startNextQuestion() {
    const pts = dataset.points || [];
    if (!pts.length) return;
    currentTarget = pts[Math.floor(Math.random() * pts.length)];
    renderQuizCard();
    if (toastEl) toastEl.innerText = '自测出题完成，可点击选项作答或切回 3D 观察';
  }

  function handleAnswer(chosenId) {
    if (!currentTarget) return;
    total += 1;
    if (chosenId === currentTarget.id) {
      correct += 1;
      if (toastEl) toastEl.innerText = `回答正确！${currentTarget.name}`;
    } else {
      if (!wrongBank.some((w) => w.id === currentTarget.id)) wrongBank.push(currentTarget);
      if (toastEl) toastEl.innerText = `答错了，正确答案是：${currentTarget.name}（已加入错题本）`;
    }
    startNextQuestion();
  }

  function flyToCurrentTarget() {
    if (!currentTarget) return;
    const z = (dataset.zones || []).find((x) => x.id === currentTarget.zone);
    document.querySelector('[data-view="view-3d"]').click();
    if (z) focusZone(z);
    const pos = currentTarget.pos || [currentTarget.x, currentTarget.y, currentTarget.z];
    engine.focusRing.position.set(pos[0], pos[1], pos[2]);
    engine.focusRing.visible = true;
    engine.controls.target.set(pos[0], pos[1], pos[2]);
  }

  function reviewLastWrong() {
    if (!wrongBank.length) return;
    currentTarget = wrongBank[wrongBank.length - 1];
    flyToCurrentTarget();
    openDrawer(currentTarget);
  }

  return { startNextQuestion, handleAnswer, flyToCurrentTarget, reviewLastWrong };
}

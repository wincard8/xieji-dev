/* 协纪黄历 —— 渲染层（纯函数，可在 node 中测试） */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./engine.js'));
  else root.XiejiUI = factory(root.XiejiEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  const CN_MONTH = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  const CN_DAY = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lunarMonth = (m, leap) => (leap ? '闰' : '') + CN_MONTH[m - 1] + '月';
  const lunarDay = d => CN_DAY[d - 1];
  const gloss = t => (E.GLOSS[t] ? ` title="${esc(t)}：${esc(E.GLOSS[t])}"` : ` title="${esc(t)}"`);

  const LV_CLASS = { 大凶: 'lv3', 凶: 'lv2', 小凶: 'lv1', 平: 'lv0', 吉: 'lvG' };

  function chip(token, srcMap, kind) {
    const src = (srcMap[token] || []).join('、');
    return `<span class="chip ${kind}"${gloss(token)} data-src="${esc(src)}">${esc(token)}</span>`;
  }

  function renderYi(r) {
    if (!r.yi.length) return '<p class="empty">本日诸事不宜（按《协纪》此日无可举之事）</p>';
    return r.yi.map(t => chip(t, r.src, 'yi')).join('');
  }

  function renderJi(r) {
    if (!r.ji.length) return '<p class="empty">本日无忌</p>';
    return r.jiGroups.map(g =>
      `<div class="grow"><span class="gname">${esc(g.name)}</span><span class="gitems">${g.items.map(t => chip(t, r.src, 'ji')).join('')}</span></div>`
    ).join('');
  }

  function renderShensha(r) {
    return r.shensha.map(s => {
      const cls = s.kind === '吉' ? 'good' : (s.kind === '大凶' ? 'bad3' : (s.kind === '建除' ? 'jc' : 'bad'));
      const detail = [
        s.yi.length ? `<div class="sline"><b>卷十所宜</b>${s.yi.map(esc).join('、')}</div>` : '',
        s.ji.length ? `<div class="sline"><b>卷十所忌</b>${s.ji.map(esc).join('、')}</div>` : '',
        s.bai && s.bai.length ? `<div class="sline"><b>此煞"止不忌"</b>${s.bai.map(esc).join('、')}</div>` : '',
        s.cite ? `<div class="sline quote"><b>原文</b>${esc(s.cite)}</div>` : ''
      ].filter(Boolean).join('');
      return `<details class="ss ${cls}">
        <summary><span class="dot"></span><span class="sname">${esc(s.name)}</span><span class="skind">${esc(s.kind)}</span>
        <span class="scount">${s.yi.length ? '宜 ' + s.yi.length : ''}${s.yi.length && s.ji.length ? ' · ' : ''}${s.ji.length ? '忌 ' + s.ji.length : ''}</span></summary>
        ${detail}
      </details>`;
    }).join('');
  }

  function renderHours(r) {
    const strip = r.hours.map((h, i) => {
      const d = h.good === '吉' ? 'ok' : (h.good === '大凶' ? 'bad3' : 'bad');
      return `<button class="hbtn" data-i="${i}" type="button">
        <span class="hb">${esc(h.zhiName)}</span><span class="hgz">${esc(h.gz)}</span><i class="hd ${d}"></i>
      </button>`;
    }).join('');

    const panels = r.hours.map((h, i) => {
      const badge = h.good === '吉' ? 'ok' : (h.good === '大凶' ? 'bad3' : 'bad');
      const mark = h.marks.length ? `<span class="hmark">${h.marks.map(esc).join(' · ')}</span>` : '';
      return `<div class="hp" data-i="${i}">
        <div class="hp-top">
          <span class="hp-gz">${esc(h.gz)}时</span>
          <span class="hp-range">${esc(h.range)}</span>
          <span class="hp-badge ${badge}">${esc(h.good)}</span>
          <span class="hp-shen">值神 ${esc(h.shen)}${h.godGood ? '（黄道）' : '（黑道）'}</span>
        </div>
        <div class="hp-meta">
          <span>冲${esc(h.chongName)}</span><span>煞${esc(h.sha)}</span>${mark}
          <span class="hp-jidx">日忌 ${r.ji.length} 项，此时亦不宜</span>
        </div>
        <div class="hp-sec"><b class="lb yi">宜</b><div class="chips">${
          h.yi.length ? h.yi.map(t => `<span class="chip yi" data-src="本日所宜"${gloss(t)}>${esc(t)}</span>`).join('') : '<span class="empty">诸事不宜（日破时）</span>'
        }</div></div>
        <div class="hp-sec"><b class="lb ji">忌</b><div class="chips">${
          h.ji.length ? h.ji.map(t => `<span class="chip ji" data-src="时上之忌"${gloss(t)}>${esc(t)}</span>`).join('') : '<span class="empty">本时无额外之忌</span>'
        }</div></div>
        <p class="hp-note">${esc(h.note)}</p>
      </div>`;
    }).join('');

    return `<div class="hstrip">${strip}</div><div class="hpanels">${panels}</div>`;
  }

  function selectHour(i) {
    document.querySelectorAll('.hbtn').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
    document.querySelectorAll('.hp').forEach(p => p.classList.toggle('on', +p.dataset.i === i));
  }

  function render(r) {
    const L = r.lunar;
    const daysIn = r.jdn - r.term.jdn;
    const toNext = r.term.nextJdn - r.jdn;
    const badg = r.shensha.filter(s => s.kind !== '吉' && s.kind !== '建除').map(s => `<span class="badge">${esc(s.name)}</span>`).join('');
    const goodb = r.shensha.filter(s => s.kind === '吉').map(s => `<span class="badge good">${esc(s.name)}</span>`).join('');

    return `
    <header class="top">
      <div class="brand">
        <h1>协纪黄历</h1>
        <p>依《钦定协纪辨方书》卷十「宜忌」排布 · 逐条可溯</p>
      </div>
      <div class="nav">
        <button id="prev" title="前一天">‹</button>
        <input type="date" id="date" value="${r.solar.y}-${String(r.solar.m).padStart(2, '0')}-${String(r.solar.d).padStart(2, '0')}">
        <button id="next" title="后一天">›</button>
        <button id="today" class="ghost">今天</button>
      </div>
    </header>

    <section class="hero">
      <div class="hero-left">
        <div class="hero-y">${r.solar.y} 年 ${r.solar.m} 月 <strong>${r.solar.d}</strong> 日</div>
        <div class="hero-l">农历 ${esc(lunarMonth(L.month, L.leap))}${esc(lunarDay(L.day))} · 星期${esc(r.week)}</div>
        <div class="hero-g">${esc(r.yearGZText)}年　${esc(r.monthGZText)}月　<strong>${esc(r.dayGZText)}日</strong>　<span class="zodiac">属${esc(r.animal)}</span></div>
      </div>
      <div class="hero-right">
        <div class="level ${LV_CLASS[r.levelText] || 'lv0'}">${esc(r.levelText)}</div>
        <div class="hero-sub">${esc(r.jianchuName)}${r.rules.isPo ? ' · 月破' : ''}</div>
      </div>
    </section>

    <section class="meta">
      <div><b>节气</b>${esc(r.term.name)} 后第 ${daysIn} 天</div>
      <div><b>下节</b>${esc(r.term.nextName)} · 还有 ${toNext} 天</div>
      <div><b>月建</b>${esc(r.rules.monthZhi)}月 · ${esc(r.dayGZText)}日</div>
      <div><b>建除</b>${esc(r.jianchuName)}</div>
      <div><b>冲煞</b>冲${esc(r.chong.name)} · 煞${esc(r.chong.sha)}</div>
      <div class="wide"><b>神煞</b>${(goodb + badg) || '<span class="muted">仅建除值日</span>'}</div>
    </section>

    <section class="jcbar">
      <div class="jcseq">${E.JIANCHU.map((n, i) => `<span class="${i === r.jianchu ? 'on' : ''}">${n}</span>`).join('')}</div>
      <div class="jcnote">月建 ${esc(r.rules.monthZhi)} · 日支 ${esc(E.ZHI[r.dayZhi])}${r.rules.isPo ? ' · ' + esc(r.rules.monthZhi + E.ZHI[r.dayZhi]) + '相冲为月破' : ''}</div>
    </section>

    <section class="yiji">
      <div class="panel panel-yi">
        <h2><span class="seal">宜</span><span class="ptitle">所宜</span><span class="pcount">${r.yi.length} 项</span></h2>
        <div class="chips">${renderYi(r)}</div>
      </div>
      <div class="panel panel-ji">
        <h2><span class="seal seal-ji">忌</span><span class="ptitle">所忌</span><span class="pcount">${r.ji.length} 项</span></h2>
        <div class="groups">${renderJi(r)}</div>
      </div>
    </section>

    ${r.suppress ? `<p class="warn">本日为${esc(r.heavy.join('、'))}当值而无天德、月德等德神相解——依《协纪》"吉神失力"之例，只列该煞"止不忌"之事，其余一概不宜。</p>` : ''}
    ${r.conflicts.length ? `<p class="note">依"忌克宜"例，下列诸事两见，从忌：${r.conflicts.map(esc).join('、')}</p>` : ''}
    <p class="srcinfo" id="srcinfo">点按宜、忌任一事目，可看它出自哪一条神煞；神煞条目点开可读《协纪》原文。</p>

    <section class="ss-wrap">
      <h2 class="sec">神煞与出处 <small>点开看《协纪》原文</small></h2>
      <div class="ss-list">${renderShensha(r)}</div>
    </section>

    <section class="hours-wrap">
      <h2 class="sec">每时必看 <small>十二时辰吉凶、冲煞与宜忌 · 点上面时辰切换</small></h2>
      <div id="hours">${renderHours(r)}</div>
      ${r.baiji.length ? `<p class="note">百忌日（卷十）：${esc(r.dayGZText)}日——忌${r.baiji.map(esc).join('、')}。</p>` : ''}
    </section>

    <section class="about">
      <h2 class="sec">规则与口径</h2>
      <div class="cols">
        <div>
          <h3>底本</h3>
          <p>宜忌条文出自《钦定协纪辨方书》卷十「宜忌」（清乾隆六年武英殿刻本，四库全书子部术数类）。每一神煞条目均保留卷十原文，可点开核对。</p>
          <h3>已实现的神煞</h3>
          <p>建除十二神、月建（土府）、月破（大耗）、月厌（地火）、劫煞、灾煞、月煞、月刑、月害、大时（大败·咸池）、天吏（致死）、小耗、九空、天德、月德、天德合、月德合、天赦、三合、六合，另加卷十"百忌日"。</p>
          <h3>未实现／已简化</h3>
          <p>①卷十「宜忌等第表」的六等加减未复原，本工具以"最重之神煞"定调、以并集取忌，遇三煞值开日一类吉凶相抵之日会比通行通书偏严；②天愿、月恩、四相、时德、王日官日守日相日民日、不将、解神、除神、五合、六仪、五富、天仓、要安敬安、玉宇金堂、普护福生圣心、益后续世、六黄道六黑道等吉神未纳入；③四击、四耗、四废、五虚、五墓、九坎、土符、地囊、归忌、血忌、往亡、复日重日、五离、八专、无禄、反支、上朔、四离四绝等未纳入；④年表、月表、方位（财神喜神福神）、个人本命与用事宜忌（卷十一）均未涉及。</p>
        </div>
        <div>
          <h3>历法口径</h3>
          <p>北京时间 UTC+8；农历用定朔定气，闰月按"无中气置闰"；年柱以立春为界，月柱以节为界，交节当日即换月建。节气与朔望由天文算法实时推算，节气时刻的精度约 ±0.01°（≈15 分钟），若交节恰在子夜前后，日属可能差一日。</p>
          <h3>时辰口径</h3>
          <p>十二值神（青龙、明堂、天刑、朱雀、金匮、宝光、白虎、玉堂、天牢、玄武、司命、勾陈）依「子午日青龙在申、丑未日在戌、寅申日在子、卯酉日在寅、辰戌日在辰、巳亥日在午」起例顺行，黄道六神为吉、黑道六神为凶。时辰宜忌依卷十「六黄道……诸事皆宜而无专宜之事，六黑道亦无专忌之事，当以时例为断」：以日之宜忌为体、时之黄黑道为用——黄道时可行本日所宜，黑道时只取日宜中的小事，日忌之事任何时辰皆不宜。另标日禄、天乙贵人、驿马、六合、旬空与时破日。子时跨两日，本页按当日日支统一取用，不另分早子、晚子；方位（财神、福神、喜神）各家口诀不一，故不列。</p>
          <h3>自检</h3>
          <div id="selftest" class="selftest">运行中…</div>
          <h3>免责</h3>
          <p>黄历属传统民俗资料。《协纪辨方书》御制序自言："如曰如是则吉，如是则凶，如是则福，如是则祸，则明者所弗道也。"本工具只做规则复现，不主张吉凶实效，不替代医疗、法律、投资等专业判断。</p>
        </div>
      </div>
    </section>

    <footer>规则底本：<a href="https://zh.wikisource.org/zh-hans/%E6%AC%BD%E5%AE%9A%E5%8D%94%E7%B4%80%E8%BE%A8%E6%96%B9%E6%9B%B8_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B710" target="_blank" rel="noreferrer">《钦定协纪辨方书》卷十</a> · 历法对照：香港天文台 · 本页不联网，全部本地计算</footer>`;
  }

  /* -------------------------------------------------- 自检 */
  const CHECKS = [
    { d: [2026, 11, 2], lunar: [9, 24], leap: false, gz: '庚辰', term: '霜降', note: '香港天文台 2026 年对照表' },
    { d: [2026, 2, 17], lunar: [1, 1], leap: false, note: '2026 年正月初一（天文台）' },
    { d: [2026, 10, 8], lunar: [8, 28], leap: false, term: '寒露', note: '天文台节气表' },
    { d: [2026, 12, 22], term: '冬至', note: '天文台节气表' },
    { d: [2023, 3, 22], lunar: [2, 1], leap: true, note: '2023 年闰二月初一' },
    { d: [2020, 5, 23], lunar: [4, 1], leap: true, note: '2020 年闰四月初一' }
  ];
  function selfTest() {
    return CHECKS.map(c => {
      const r = E.computeDay(c.d[0], c.d[1], c.d[2]);
      const okL = !c.lunar || (r.lunar.month === c.lunar[0] && r.lunar.day === c.lunar[1] && !!r.lunar.leap === !!c.leap);
      const okG = !c.gz || r.dayGZText === c.gz;
      const okT = !c.term || r.term.name === c.term;
      const ok = okL && okG && okT;
      return `<div class="st ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${c.d.join('-')} → 农历${lunarMonth(r.lunar.month, r.lunar.leap)}${lunarDay(r.lunar.day)} · ${esc(r.dayGZText)}日 · ${esc(r.term.name)} <small>${esc(c.note || '')}</small></div>`;
    }).join('');
  }

  /* -------------------------------------------------- 交互 */
  function init() {
    const app = document.getElementById('app');
    let cur = new Date();

    app.addEventListener('click', e => {
      const btn = e.target.closest ? e.target.closest('.hbtn') : null;
      if (btn) { selectHour(+btn.dataset.i); return; }
      const chip = e.target.closest ? e.target.closest('.chip') : null;
      if (!chip) return;
      const info = document.getElementById('srcinfo');
      if (!info) return;
      const src = chip.getAttribute('data-src') || '';
      const g = E.GLOSS[chip.textContent];
      info.innerHTML = `<b>${esc(chip.textContent)}</b>${g ? '（' + esc(g) + '）' : ''} 出自：${esc(src || '建除／吉神')}`;
    });

    const paint = (y, m, d) => {
      cur = new Date(y, m - 1, d);
      app.innerHTML = render(E.computeDay(y, m, d));
      const st = document.getElementById('selftest');
      if (st) st.innerHTML = selfTest();
      const now = new Date();
      const isToday = now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === d;
      selectHour(isToday ? Math.floor((now.getHours() + 1) / 2) % 12 : 0);
      if (typeof history !== 'undefined' && history.replaceState) {
        const q = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        try { history.replaceState(null, '', location.pathname + '?d=' + q); } catch (e) { /* file:// 可能不允许 */ }
      }
      document.getElementById('prev').onclick = () => shift(-1);
      document.getElementById('next').onclick = () => shift(1);
      document.getElementById('today').onclick = () => {
        const t = new Date(); paint(t.getFullYear(), t.getMonth() + 1, t.getDate());
      };
      document.getElementById('date').onchange = e => {
        const v = e.target.value; if (!v) return;
        const [yy, mm, dd] = v.split('-').map(Number); paint(yy, mm, dd);
      };
    };
    const shift = n => {
      const t = new Date(cur.getTime() + n * 864e5);
      paint(t.getFullYear(), t.getMonth() + 1, t.getDate());
    };

    const now = new Date();
    let boot = null;
    try { boot = new URLSearchParams(location.search).get('d'); } catch (e) { boot = null; }
    if (boot && /^\d{4}-\d{1,2}-\d{1,2}$/.test(boot)) {
      const [y, m, d] = boot.split('-').map(Number);
      paint(y, m, d);
    } else {
      paint(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }
  }

  return { render, init, selfTest, lunarMonth, lunarDay, esc };
});

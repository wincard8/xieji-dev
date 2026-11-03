const E = require('./engine.js');
const U = require('./ui.js');

let fail = 0;
function check(label, ok, extra) { if (!ok) { fail++; console.log('✗', label, extra || ''); } }

/* 渲染一批日期，确保不抛错、不出现 undefined/NaN */
let count = 0;
for (let y = 2020; y <= 2032; y++) {
  for (let m = 1; m <= 12; m++) {
    for (const d of [1, 15, 28]) {
      const r = E.computeDay(y, m, d);
      const html = U.render(r);
      count++;
      check(`render ${y}-${m}-${d} length`, html.length > 4000);
      check(`render ${y}-${m}-${d} undefined`, !/undefined|NaN/.test(html), (html.match(/undefined|NaN/g) || []).slice(0, 3).join(','));
      check(`render ${y}-${m}-${d} 宜忌`, /panel-yi/.test(html) && /panel-ji/.test(html));
    }
  }
}
console.log('rendered', count, 'days');

/* 自检块 */
const st = U.selfTest();
check('selftest all pass', !/✗/.test(st), st.slice(0, 200));
console.log(st.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

/* 抽查今天 */
const r = E.computeDay(2026, 11, 2);
console.log('\n2026-11-02 →', r.levelText, r.jianchuName, '| 宜', r.yi.length, '忌', r.ji.length);
console.log('宜:', r.yi.join(' '));
console.log('神煞:', r.shensha.map(s => s.name).join(' '));
const html = U.render(r);
check('今天含破日', html.includes('破日'));
check('今天含月破原文', html.includes('月破'));

/* 春节前后的月建切换 */
for (const [y, m, d] of [[2026, 2, 3], [2026, 2, 4], [2026, 2, 5]]) {
  const q = E.computeDay(y, m, d);
  console.log(`${y}-${m}-${d}`, q.yearGZText + '年', q.monthGZText + '月', q.dayGZText + '日', q.lunar.month + '月' + q.lunar.day);
}

/* 覆盖统计：一年里各 level 的分布 */
const dist = {};
for (let i = 0; i < 365; i++) {
  const jdn = E.gregorianToJDN(2026, 1, 1) + i;
  const g = E.jdnToGregorian(jdn);
  const q = E.computeDay(g.year, g.month, g.day);
  dist[q.levelText] = (dist[q.levelText] || 0) + 1;
}
console.log('\n2026 年吉凶分布:', dist);

console.log(fail ? `\n${fail} FAILED` : '\nALL OK');
process.exit(fail ? 1 : 0);

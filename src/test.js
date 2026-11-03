const E = require('./engine.js');
const { gregorianToJDN, jdnToGregorian, toLunar, computeDay } = E;

let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log('✗', label, '→', got, '≠', want); }
}
const fmt = jdn => { const g = jdnToGregorian(jdn); return `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`; };

/* 1. 2026 年 24 节气（香港天文台对照表） */
const HKO_TERMS = [
  ['小寒', '01-05'], ['大寒', '01-20'], ['立春', '02-04'], ['雨水', '02-18'],
  ['惊蛰', '03-05'], ['春分', '03-20'], ['清明', '04-05'], ['谷雨', '04-20'],
  ['立夏', '05-05'], ['小满', '05-21'], ['芒种', '06-05'], ['夏至', '06-21'],
  ['小暑', '07-07'], ['大暑', '07-23'], ['立秋', '08-07'], ['处暑', '08-23'],
  ['白露', '09-07'], ['秋分', '09-23'], ['寒露', '10-08'], ['霜降', '10-23'],
  ['立冬', '11-07'], ['小雪', '11-22'], ['大雪', '12-07'], ['冬至', '12-22']
];
for (const [name, md] of HKO_TERMS) {
  const idx = E.TERM_NAMES.indexOf(name);
  // 小寒/大寒 属于上一"节气年"
  const year = ['小寒', '大寒'].includes(name) ? 2025 : 2026;
  const jdn = E.solarTermJDN(year, idx);
  eq(`节气 ${name}`, fmt(jdn), `2026-${md}`);
}

/* 2. 2026 农历月首（香港天文台） */
const MONTH_STARTS = [
  ['2026-02-17', 1, false], ['2026-03-19', 2, false], ['2026-04-17', 3, false],
  ['2026-05-17', 4, false], ['2026-06-15', 5, false], ['2026-07-14', 6, false],
  ['2026-08-13', 7, false], ['2026-09-11', 8, false], ['2026-10-10', 9, false],
  ['2026-11-09', 10, false], ['2026-12-09', 11, false], ['2027-01-08', 12, false]
];
for (const [date, month, leap] of MONTH_STARTS) {
  const [y, m, d] = date.split('-').map(Number);
  const L = toLunar(gregorianToJDN(y, m, d));
  eq(`月首 ${date}`, [L.month, L.leap, L.day], [month, leap, 1]);
}

/* 3. 春节 / 闰月 */
const SPRING = [['2023-01-22', 2023], ['2024-02-10', 2024], ['2025-01-29', 2025], ['2026-02-17', 2026]];
for (const [date, ly] of SPRING) {
  const [y, m, d] = date.split('-').map(Number);
  const L = toLunar(gregorianToJDN(y, m, d));
  eq(`春节 ${date}`, [L.year, L.month, L.day], [ly, 1, 1]);
}
{ const L = toLunar(gregorianToJDN(2023, 3, 22)); eq('2023 闰二月初一', [L.month, L.leap, L.day], [2, true, 1]); }
{ const L = toLunar(gregorianToJDN(2020, 5, 23)); eq('2020 闰四月初一', [L.month, L.leap, L.day], [4, true, 1]); }

/* 4. 干支 / 建除 */
{
  const r = computeDay(2026, 11, 2);
  eq('2026-11-02 农历', [r.lunar.month, r.lunar.day], [9, 24]);
  eq('2026-11-02 日柱', r.dayGZText, '庚辰');
  eq('2026-11-02 年柱', r.yearGZText, '丙午');
  eq('2026-11-02 月柱', r.monthGZText, '戊戌');
  eq('2026-11-02 建除', r.jianchuName, '破日');
  eq('2026-11-02 星期', r.week, '一');
}

/* 5. 打印当天结果 */
const r = computeDay(2026, 11, 2);
console.log('\n—— 2026-11-02 ——');
console.log('农历', `${r.lunar.year}年${r.lunar.leap ? '闰' : ''}${r.lunar.month}月${r.lunar.day}日`,
  '|', r.yearGZText + '年', r.monthGZText + '月', r.dayGZText + '日', '|', r.term.name, '|', r.jianchuName);
console.log('神煞:', r.shensha.map(s => s.name + '(' + s.kind + ')').join(' '));
console.log('宜:', r.yi.join(' '));
console.log('忌:', r.ji.join(' '));
console.log('冲突:', r.conflicts.join(' '));

/* 6. 抽样若干天，看建除是否顺行 */
console.log('\n—— 连续 8 天 ——');
for (let i = 0; i < 8; i++) {
  const rr = computeDay(2026, 11, 2 + i);
  console.log(`${rr.solar.m}-${rr.solar.d}`, rr.lunar.month + '月' + rr.lunar.day + '日', rr.dayGZText, rr.jianchuName,
    '宜' + rr.yi.length, '忌' + rr.ji.length, rr.shensha.map(s => s.name).join(','));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

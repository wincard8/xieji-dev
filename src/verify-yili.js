/* E2 段：用卷三~卷八「义例」的起例原文，独立重算各神煞所在日支，与引擎输出比对
 * 起例原文（KR3g0051）：
 *   月破   考原曰：月破者，月建所衝之日也
 *   大耗   曹震圭曰：大耗者月建擊衝破散之辰也，與月破同位
 *   月厭   堪輿經曰：正月陽建於寅，隂建在戌（逆行十二辰）
 *   劫煞   李鼎祚曰：寅午戌歲在亥，亥卯未歲在申，申子辰歲在巳，巳酉丑歲在寅
 *   災煞   神樞經曰：常居劫煞前一辰
 *   月煞   歴例曰：正月起丑，逆行四季
 *   九空   歴例曰：正月在辰，逆行四季
 *   月害   歴例曰：正月起巳，逆行十二辰
 *   大時   李鼎祚曰：正月起卯，逆行四仲
 *   天吏   歴例曰：正月起酉，逆行四仲
 *   小耗   舊月破，又為本月閉日之衝
 */
const E = require('./engine.js');

const Z = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const mod12 = n => ((n % 12) + 12) % 12;
/* 正月=寅(2)，"正月起X，逆行" => 寅月为 X，其后每辰退一位 */
function startFrom(startIdx, m, cycle) {
  const seq = cycle; // 4 个一组时为四季/四仲，12 个一组时为全辰
  const k = mod12(m - 2);
  return seq[k % seq.length];
}
const SIJI = [1, 10, 7, 4];   // 丑 戌 未 辰
const SIZHONG = [3, 0, 9, 6]; // 卯 子 酉 午
const SIZHONG2 = [9, 6, 3, 0];// 酉 午 卯 子

/* 独立实现（完全按原文） */
const RULE = {
  '月破': m => mod12(m + 6),
  '大耗': m => mod12(m + 6),
  '月厌': m => mod12(12 - m),
  '劫煞': m => [2, 6, 10].includes(m) ? 11 : [11, 3, 7].includes(m) ? 8 : [8, 0, 4].includes(m) ? 5 : 2,
  '灾煞': m => mod12(RULE['劫煞'](m) + 1),
  '月煞': m => startFrom(1, m, SIJI),
  '九空': m => startFrom(4, m, [4, 1, 10, 7]), // 辰 丑 戌 未
  '月害': m => mod12(5 - (m - 2)),
  '大时': m => startFrom(3, m, SIZHONG),
  '天吏': m => startFrom(9, m, SIZHONG2),
  '小耗': m => mod12(RULE['月破'](m) - 1)  // 本月闭日之冲：闭=建-1
};

/* 引擎实际输出：扫 2026-2027，记录每个 (月支, 神煞) 对应的日支 */
const actual = new Map();
const base = E.gregorianToJDN(2026, 1, 1);
for (let i = 0; i < 730; i++) {
  const g = E.jdnToGregorian(base + i);
  const r = E.computeDay(g.year, g.month, g.day);
  const m = Z.indexOf(r.rules.monthZhi);
  for (const s of r.shensha) {
    const key = s.name + '|' + m;
    if (!actual.has(key)) actual.set(key, s.dZhi === undefined ? r.dayZhi : s.dZhi);
  }
}

let pass = 0, fail = 0;
for (const [name, fn] of Object.entries(RULE)) {
  for (let m = 0; m < 12; m++) {
    const want = fn(m);
    const got = actual.get(name + '|' + m);
    if (got === undefined) continue;  // 该月未出现（如百忌之类）
    if (got === want) pass++;
    else { fail++; console.log(`✗ ${name} ${Z[m]}月：引擎 ${Z[got]}，义例 ${Z[want]}`); }
  }
}
console.log(`\nE2 段：按义例起例独立重算，通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);

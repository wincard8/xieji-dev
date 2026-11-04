/* E3 段：从用户校订的《卷十月表》xlsx 直接读表，独立算每天的等第，与引擎比对
 * 数据源：C:\Users\Administrator\Documents\钦定协纪辨方书 卷十 月表.xlsx（已转 JSON）
 */
const fs = require('fs');
const E = require('./engine.js');

const JSON_PATH = process.argv[2] || 'C:\\Users\\Administrator\\Documents\\_yuebiao.json';
const Z = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const raw = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const rows = raw[Object.keys(raw)[0]];
const header = rows[2];              // 等第 | 吉凶判例 | 平日 | 收日 | ...
const names = header.slice(2).filter(Boolean);   // 11 个神煞

/* 从单元格文本里抠出月份 */
function months(cell) {
  const out = [];
  for (const line of String(cell).split('\n')) {
    const m = line.match(/^([子丑寅卯辰巳午未申酉戌亥]+)月/);
    if (m) for (const ch of m[1]) out.push(Z.indexOf(ch));
  }
  return out;
}

/* 表：神煞 -> 六个等第各辖的月份 */
const T = {};
for (const n of names) T[n] = [[], [], [], [], [], []];
for (let gi = 0; gi < 6; gi++) {
  const row = rows[3 + gi];        // 上 上次 中 中次 下 下下
  for (let ci = 0; ci < names.length; ci++) {
    const cell = row[2 + ci];
    if (!cell || cell === '—') continue;
    T[names[ci]][gi] = months(cell);
  }
}

/* 独立算等第 */
function expectGrade(shenshaNames, monthZhi) {
  if (shenshaNames.includes('月破')) return 5;
  let g = -1;
  for (const n of shenshaNames) {
    if (!T[n]) continue;
    for (let gi = 0; gi < 6; gi++) if (T[n][gi].includes(monthZhi) && gi > g) g = gi;
  }
  if (shenshaNames.includes('月建') && g < 2) g = 2;
  return g;
}

let pass = 0, fail = 0;
const base = E.gregorianToJDN(2026, 1, 1);
for (let i = 0; i < 730; i++) {
  const g = E.jdnToGregorian(base + i);
  const r = E.computeDay(g.year, g.month, g.day);
  const m = Z.indexOf(r.rules.monthZhi);
  const want = expectGrade(r.shensha.map(s => s.name), m);
  const got = ['上', '上次', '中', '中次', '下', '下下'].indexOf(r.gradeName);
  if (want === got) pass++;
  else {
    fail++;
    if (fail <= 10) console.log(`✗ ${g.year}-${g.month}-${g.day} 引擎 ${r.gradeName}，月表 ${['上', '上次', '中', '中次', '下', '下下'][want]}（${r.rules.monthZhi}月 ${r.shensha.map(s => s.name).join(',')}）`);
  }
}
console.log(`\nE3 段：《卷十月表》直读比对 730 天，通过 ${pass}，失败 ${fail}`);

/* 分布统计 */
const dist = {};
for (let i = 0; i < 730; i++) {
  const g = E.jdnToGregorian(base + i);
  const r = E.computeDay(g.year, g.month, g.day);
  dist[r.gradeName] = (dist[r.gradeName] || 0) + 1;
}
console.log('两年等第分布:', JSON.stringify(dist));
process.exit(fail ? 1 : 0);

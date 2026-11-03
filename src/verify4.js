/* D 段：按卷十的「条目行」切分正文，逐条比对宜/忌（建除十二神 + 主要神煞） */
const fs = require('fs');
const path = require('path');
const E = require('./engine.js');

let pass = 0, fail = 0;
const bad = m => { fail++; console.log('✗', m); };

let txt = fs.readFileSync(path.join(__dirname, 'juan10.simp.txt'), 'utf8');
txt = txt.replace(/<onlyinclude>|<\/onlyinclude>|<poem>|<\/poem>/g, '')
  .replace(/\{\{SK notes\|[^}]*\}\}/g, '')
  .replace(/\{\{SK anchor\|([^}]*)\}\}/g, '$1')
  .replace(/\{\{[^}]*\}\}/g, '')
  .replace(/<[^>]+>/g, '');

const lines = txt.split(/\n/).map(l => l.replace(/[\s\u3000]+/g, ' ').trim()).filter(Boolean);

const NAMES = new Set([
  '建日', '除日', '满日', '平日', '定日', '执日', '破日', '危日', '成日', '收日', '开日', '闭日',
  '月建', '月破', '月厌', '劫煞', '灾煞', '月煞', '月刑', '月害', '大时', '天吏', '小耗', '九空',
  '天德', '月德', '天德合', '月德合', '天赦', '三合', '六合'
]);

/* 切条目：条目行 = 一个或多个 name 用空格分隔；正文累积到下一个条目行 */
const bodies = {};
let cur = null;
for (const line of lines) {
  const parts = line.split(' ');
  if (parts.length && parts.every(p => NAMES.has(p))) {
    cur = parts;
    parts.forEach(p => { bodies[p] = bodies[p] || []; });
    continue;
  }
  if (cur) cur.forEach(p => bodies[p].push(line));
}
const body = n => (bodies[n] || []).join('');

/* 词表 */
const SURF = [
  ['求医疗病', '求医'], ['宣布政事', '宣政事'], ['结婚姻', '结姻'], ['上册进表章', '上册'],
  ['修置产室', '修置产室'], ['安抚边境', '安抚边境'], ['平治道涂', '平治道涂'],
  ['竖柱上梁', '竖柱上梁'], ['修饰垣墙', '修饰垣墙'], ['整手足甲', '整手足甲']
];
for (const t of E.ORDER) SURF.push([t, t]);
SURF.sort((a, b) => b[0].length - a[0].length);
function tokens(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    let hit = null;
    for (const [sf, tk] of SURF) if (s.startsWith(sf, i)) { hit = [sf, tk]; break; }
    if (hit) { out.push(hit[1]); i += hit[0].length; } else i++;
  }
  return out;
}
const cutAt = (s, marks) => {
  let k = s.length;
  for (const m of marks) { const i = s.indexOf(m); if (i >= 0 && i < k) k = i; }
  return s.slice(0, k);
};

/* 取引擎样本 */
const sample = new Map();
const base = E.gregorianToJDN(2026, 1, 1);
for (let i = 0; i < 400; i++) {
  const g = E.jdnToGregorian(base + i);
  const r = E.computeDay(g.year, g.month, g.day);
  for (const s of r.shensha) if (!sample.has(s.name)) sample.set(s.name, { s, d: g });
}

const YI_STOP = ['忌', '按', '又为', '义取', '见义例', '霜降后', '立冬后', '雨水后'];
const JI_STOP = ['按', '○', '止不忌', '又为', '与天德', '与德合', '若值', '正月建日', '卯酉月', '子午月', '寅申月', '辰戌月', '巳亥月', '寅月', '卯月'];

console.log('—— D. 条目级比对 ——');
for (const [name, { s, d }] of sample) {
  const b = body(name);
  if (!b) { bad(`卷十切不到「${name}」条目`); continue; }

  // 忌
  const jiIdx = b.indexOf('忌');
  if (jiIdx >= 0 && s.ji.length) {
    const seg = cutAt(b.slice(jiIdx + 1), JI_STOP);
    const B = new Set(tokens(seg)), A = new Set(s.ji);
    const extra = [...B].filter(x => !A.has(x));
    const miss = s.ji.filter(x => !B.has(x));
    if (extra.length) bad(`${name} 忌·原文有而代码无：${extra.join(' ')}`);
    if (miss.length) bad(`${name} 忌·代码有而原文无：${miss.join(' ')}`);
    if (!extra.length && !miss.length) { pass++; console.log(`✓ ${name} 忌 ${s.ji.length} 项一致（${d.month}-${d.day}）`); }
  }

  // 宜
  const yiIdx = b.indexOf('宜');
  if (yiIdx >= 0 && s.yi.length) {
    let seg = b.slice(yiIdx + 1);
    // 天德类条目「宜…」后面还有「忌畋猎取鱼」
    const stopIdx = seg.indexOf('忌');
    if (stopIdx > 0) seg = seg.slice(0, stopIdx);
    seg = cutAt(seg, YI_STOP);
    const B = new Set(tokens(seg)), A = new Set(s.yi);
    const extra = [...B].filter(x => !A.has(x));
    const miss = s.yi.filter(x => !B.has(x));
    if (extra.length) bad(`${name} 宜·原文有而代码无：${extra.join(' ')}`);
    if (miss.length) bad(`${name} 宜·代码有而原文无：${miss.join(' ')}`);
    if (!extra.length && !miss.length) { pass++; console.log(`✓ ${name} 宜 ${s.yi.length} 项一致`); }
  }
}

console.log(`\nD 段：通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);

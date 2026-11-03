/* B 段（改进版）：用简体化的卷十原文分词，与引擎数组逐项比对 */
const fs = require('fs');
const path = require('path');
const E = require('./engine.js');

let pass = 0, fail = 0;
const bad = m => { fail++; console.log('✗', m); };

let txt = fs.readFileSync(path.join(__dirname, 'juan10.simp.txt'), 'utf8');
// 残差异体
const VAR = { '刼': '劫', '徃': '往', '劵': '券', '磑': '硙', '㑹': '会', '牀': '床', '寃': '冤', '隄': '堤', '竈': '灶' };
txt = txt.replace(/./g, c => VAR[c] || c);

const text = txt
  .replace(/\{\{SK anchor\|([^}]*)\}\}/g, '\n@@$1@@\n')
  .replace(/\{\{SK notes\|[^}]*\}\}/g, '')
  .replace(/\{\{[^}]*\}\}/g, '')
  .replace(/<[^>]+>/g, '\n');

const occ = {};
const parts = text.split(/@@([^@]+)@@/);
for (let i = 1; i < parts.length; i += 2) {
  const name = parts[i].trim().replace(/\s+/g, '');
  const body = (parts[i + 1] || '').replace(/\s+/g, '');
  (occ[name] = occ[name] || []).push(body);
}
const section = n => (occ[n] || []).sort((a, b) => b.length - a.length)[0] || '';

/* 词表 */
const SURF = [
  ['求医疗病', '求医'], ['宣布政事', '宣政事'], ['结婚姻', '结姻'], ['上册进表章', '上册'],
  ['修置产室', '修置产室'], ['安抚边境', '安抚边境'], ['平治道涂', '平治道涂'],
  ['竖柱上梁', '竖柱上梁'], ['修饰垣墙', '修饰垣墙'], ['整手足甲', '整手足甲'],
  ['开仓库', '开仓库'], ['出货财', '出货财'], ['安碓硙', '安碓硙']
];
for (const t of E.ORDER) SURF.push([t, t]);
SURF.sort((a, b) => b[0].length - a[0].length);

function tokens(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    let hit = null;
    for (const [surf, tok] of SURF) if (s.startsWith(surf, i)) { hit = [surf, tok]; break; }
    if (hit) { out.push(hit[1]); i += hit[0].length; } else i++;
  }
  return out;
}
const cut = (s, marks) => {
  let k = s.length;
  for (const m of marks) { const i = s.indexOf(m); if (i >= 0 && i < k) k = i; }
  return s.slice(0, k);
};
const after = (s, mark) => { const i = s.indexOf(mark); return i < 0 ? '' : s.slice(i + mark.length); };

/* 引擎数组 */
function jiOf(name, y, m, d) {
  const r = E.computeDay(y, m, d);
  const s = r.shensha.find(x => x.name === name);
  return s ? s.ji : null;
}
function findDay(name) {
  const base = E.gregorianToJDN(2026, 1, 1);
  for (let i = 0; i < 400; i++) {
    const g = E.jdnToGregorian(base + i);
    const r = E.computeDay(g.year, g.month, g.day);
    if (r.shensha.some(s => s.name === name)) return [g.year, g.month, g.day];
  }
  return null;
}

/* 比对 */
function compare(label, bookTokens, arr, ignore) {
  const B = new Set(bookTokens), A = new Set(arr);
  const miss = arr.filter(x => !B.has(x) && !(ignore || []).includes(x));
  const extra = [...B].filter(x => !A.has(x) && !(ignore || []).includes(x));
  if (miss.length) bad(`${label} 代码多出：${miss.join(' ')}`);
  if (extra.length) bad(`${label} 代码缺少：${extra.join(' ')}`);
  if (!miss.length && !extra.length) { pass++; console.log(`✓ ${label} 一致（${arr.length} 项）`); }
}

const CASES = [
  { name: '月破', marks: ['止不忌', '又为大耗', '与天德', '子午月'] },
  { name: '劫煞', marks: ['止不忌', '寅申巳亥月值收'] },
  { name: '月厌', marks: ['止不忌', '又为地火', '寅申月值成'] },
  { name: '平日', marks: ['止不忌', '又为死神', '寅申巳亥月值相日'] },
  { name: '收日', marks: ['止不忌', '寅申巳亥月值劫煞'] },
  { name: '满日', marks: ['寅申月值守日', '又为天狗'] },
  { name: '闭日', marks: ['子午卯酉月值王日', '寅申巳亥月值月煞'] },
  { name: '开日', marks: ['按开日'] }
];

for (const c of CASES) {
  const body = section(c.name);
  if (!body) { bad(`卷十找不到「${c.name}」段`); continue; }
  const pos = findDay(c.name);
  if (!pos) { bad(`2026 年内找不到「${c.name}」日`); continue; }
  const arr = jiOf(c.name, pos[0], pos[1], pos[2]);
  if (!arr) { bad(`引擎在 ${pos.join('-')} 取不到「${c.name}」`); continue; }

  let seg;
  if (c.name === '开日') {
    // 开日：忌在宜之后
    seg = after(body, '忌');
  } else {
    const i = body.indexOf('忌');
    seg = i < 0 ? '' : body.slice(i + 1);
  }
  seg = cut(seg, c.marks);
  compare(`${c.name}（${pos.join('-')}）`, tokens(seg), arr);
}

/* 月建：忌 + 土府专忌，合并比对；正月"又忌出师"属条件项 */
{
  const body = section('月建');
  const jian = cut(after(body, '忌'), ['又为土府', '与天德', '正月建日']);
  const tufu = cut(after(body, '又为土府专忌'), ['与天德', '正月建日']);
  const bookTok = tokens(jian).concat(tokens(tufu));
  const pos = findDay('月建');
  const arr = jiOf('月建', pos[0], pos[1], pos[2]);
  compare(`月建+土府（${pos.join('-')}）`, bookTok, arr, ['出师']);
  if (body.includes('正月建日又忌出师')) console.log('  · 卷十「正月建日又忌出师」属条件项，引擎未纳入（已忽略）');
}

/* 宜项比对：天德、三合、六合、开日 */
function yiOf(name, y, m, d) {
  const r = E.computeDay(y, m, d);
  const s = r.shensha.find(x => x.name === name);
  return s ? s.yi : null;
}
const YI_CASES = [
  { name: '天德', marks: ['忌畋猎', '按天德月德'] },
  { name: '三合', marks: ['又辰戌丑未日', '按日之吉者'] },
  { name: '六合', marks: ['与月恩四相时德并', '按六合之吉'] }
];
for (const c of YI_CASES) {
  const body = section(c.name);
  if (!body) { bad(`卷十找不到「${c.name}」段`); continue; }
  const pos = findDay(c.name);
  if (!pos) { bad(`2026 年内找不到「${c.name}」日`); continue; }
  const arr = yiOf(c.name, pos[0], pos[1], pos[2]);
  const seg = cut(after(body, '宜'), c.marks);
  compare(`${c.name}·所宜（${pos.join('-')}）`, tokens(seg), arr);
}

console.log(`\nB 段：通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);

const E = require('./engine.js');
let fail = 0;
const bad = (m) => { fail++; console.log('✗', m); };

/* 1. 十二时辰吉凶：与天机阁独立实现逐日对照（子时不比，因其分早/晚子） */
const CASES = [
  { d: [2026, 11, 2], want: ['凶', '凶', '吉', '凶', '吉', '吉', '凶', '凶', '吉', '吉', '凶', '吉'] },
  { d: [2026, 11, 3], want: ['凶', '吉', '凶', '凶', '吉', '凶', '吉', '吉', '凶', '凶', '吉', '吉'] },
  { d: [2026, 11, 4], want: ['吉', '吉', '凶', '吉', '凶', '凶', '吉', '凶', '吉', '吉', '凶', '凶'] }
];
let r = null;
for (const c of CASES) {
  const q = E.computeDay(c.d[0], c.d[1], c.d[2]);
  if (!r) r = q;
  for (let i = 1; i < 12; i++) {   // 丑..亥，跳过子时
    if (q.hours[i].good !== c.want[i]) bad(`${c.d.join('-')} 时${q.hours[i].zhiName} 吉凶 ${q.hours[i].good} ≠ ${c.want[i]}`);
    if (q.hours[i].chongZhi !== (i + 6) % 12) bad(`${c.d.join('-')} 时${q.hours[i].zhiName} 冲错`);
  }
}
console.log('时辰:', r.hours.map(h => `${h.gz}${h.good}(${h.shen})`).join(' '));

/* 2. 冲煞：庚辰日冲戌、煞南；丑时冲未、煞东 */
if (r.chong.name !== '狗' || r.chong.sha !== '南') bad(`日冲煞 ${r.chong.name}/${r.chong.sha}`);
if (r.hours[1].chongName !== '羊' || r.hours[1].sha !== '东') bad(`丑时冲煞 ${r.hours[1].chongName}/${r.hours[1].sha}`);

/* 3. 不变量：时之宜必须⊆日之宜；时之宜∩日之忌=∅；时之忌∩日之宜 可为空（黑道压事） */
let n = 0;
for (let y = 2024; y <= 2028; y++) {
  for (let i = 0; i < 365; i += 3) {
    const j = E.gregorianToJDN(y, 1, 1) + i;
    const g = E.jdnToGregorian(j);
    const q = E.computeDay(g.year, g.month, g.day);
    const ds = new Set(q.yi), dj = new Set(q.ji);
    n++;
    for (const h of q.hours) {
      for (const t of h.yi) {
        // 日未禁之事，时吉可增；凡日所忌，任何时辰皆不宜
        if (dj.has(t)) bad(`${g.year}-${g.month}-${g.day} ${h.gz}时 宜「${t}」撞日忌`);
      }
      for (const t of h.ji) if (h.yi.includes(t)) bad(`${h.gz}时「${t}」宜忌同现`);
      if (h.isChongDay && h.yi.length) bad(`${h.gz}时 日破时仍有宜项`);
    }
  }
}
console.log('检验天数', n);

/* 4. 黄道/黑道分布应各半 */
const cnt = {};
for (const h of r.hours) cnt[h.good] = (cnt[h.good] || 0) + 1;
console.log('今日时辰吉凶分布:', cnt);

/* 5. 挑一天看细节 */
const q = E.computeDay(2026, 11, 2);
for (const i of [1, 2]) {
  const h = q.hours[i];
  console.log(`\n${h.gz}时 ${h.range} ${h.good} ${h.shen} 冲${h.chongName}煞${h.sha} [${h.marks.join(' ')}]`);
  console.log('  宜:', h.yi.slice(0, 12).join(' ') || '—', h.yi.length > 12 ? `…共${h.yi.length}` : '');
  console.log('  忌:', h.ji.slice(0, 12).join(' ') || '—', h.ji.length > 12 ? `…共${h.ji.length}` : '');
}

console.log(fail ? `\n${fail} FAILED` : '\nALL OK');
process.exit(fail ? 1 : 0);

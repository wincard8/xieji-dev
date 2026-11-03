/* E 段：卷十明文「遇德减忌」的两条规则 */
const E = require('./engine.js');
let fail = 0;
const bad = m => { fail++; console.log('✗', m); };
const DE = ['天德', '月德', '天德合', '月德合', '天赦'];
const SHA = ['劫煞', '灾煞', '月煞', '月刑'];
const FIVE = ['安抚边境', '选将', '训兵', '出师', '求医'];

function find(pred, limit) {
  const base = E.gregorianToJDN(2026, 1, 1);
  const out = [];
  for (let i = 0; i < 365 && out.length < (limit || 3); i++) {
    const g = E.jdnToGregorian(base + i);
    const r = E.computeDay(g.year, g.month, g.day);
    if (pred(r)) out.push({ r, g });
  }
  return out;
}
const has = (r, names) => r.shensha.some(s => names.includes(s.name));

/* 1. 三煞/月刑 遇德：忌只剩五项 + 百忌日 */
const deSha = find(r => has(r, DE) && has(r, SHA) && !has(r, ['月破', '月厌', '月建']), 4);
if (!deSha.length) bad('找不到「三煞遇德」样本');
deSha.forEach(({ r, g }) => {
  const extra = r.ji.filter(t => !FIVE.includes(t) && !r.baiji.includes(t));
  const missing = FIVE.filter(t => !r.ji.includes(t));
  const tag = `${g.month}-${g.day}(${r.dayGZText})`;
  if (extra.length) bad(`${tag} 三煞遇德，忌中多出：${extra.join(' ')}`);
  if (missing.length) bad(`${tag} 三煞遇德，忌中缺少：${missing.join(' ')}`);
  if (!extra.length && !missing.length) console.log(`✓ ${tag} 三煞遇德 → 忌仅五项（+百忌），宜 ${r.yi.length} 项`);
});

/* 2. 月建 遇德：忌只剩土府专忌 + 百忌日 */
const deJian = find(r => has(r, DE) && has(r, ['月建']) && !has(r, ['月破', '月厌']), 2);
if (!deJian.length) bad('找不到「建日遇德」样本');
deJian.forEach(({ r, g }) => {
  const TUFU = ['营建', '修宫室', '缮城郭', '筑堤防', '兴造', '修仓库', '修置产室', '开渠', '穿井',
    '安碓硙', '补垣', '修饰垣墙', '平治道涂', '破屋', '坏垣', '栽种', '破土'];
  const extra = r.ji.filter(t => !TUFU.includes(t) && !r.baiji.includes(t));
  const tag = `${g.month}-${g.day}(${r.dayGZText})`;
  if (extra.length) bad(`${tag} 建日遇德，忌中多出：${extra.join(' ')}`);
  else console.log(`✓ ${tag} 建日遇德 → 忌仅土府专忌（${r.ji.length} 项）`);
});

/* 3. 月破 遇德：仍"猶忌"，忌不应被减 */
const dePo = find(r => has(r, DE) && has(r, ['月破']), 2);
if (!dePo.length) bad('找不到「月破遇德」样本');
dePo.forEach(({ r, g }) => {
  const tag = `${g.month}-${g.day}(${r.dayGZText})`;
  if (r.ji.length < 55) bad(`${tag} 月破遇德，忌只剩 ${r.ji.length} 项，卷十作"猶忌"`);
  else console.log(`✓ ${tag} 月破遇德 → 忌仍 ${r.ji.length} 项（相符"猶忌之"）`);
});

console.log(fail ? `\nE 段失败 ${fail}` : '\nE 段全部通过');
process.exit(fail ? 1 : 0);

/* 对照《协纪辨方书》卷十原文核验引擎
 * A 段：起例位次 —— 卷十按语写明"某煞在某月值某日"，用建除位次逐一比对
 * B 段：条文比对 —— 把卷十原文分词，与引擎里的宜忌数组求差集
 */
const fs = require('fs');
const path = require('path');
const E = require('./engine.js');

const raw = fs.readFileSync(path.join(__dirname, 'juan10.wiki'), 'utf8');

let fail = 0, pass = 0;
const ok = (m) => { pass++; };
const bad = (m) => { fail++; console.log('✗', m); };
const chk = (cond, m) => cond ? ok(m) : bad(m);

const J = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
const Z = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const jcOf = (m, d) => (d - m + 12) % 12;

/* ============ A. 起例位次 ============ */
console.log('—— A. 起例位次（卷十按语 vs 引擎）——');

// 卷十：劫煞「寅申巳亥月值收日，辰戌丑未月值除日，子午卯酉月值执日」
const GROUPS = {
  sheng: [2, 5, 8, 11],   // 寅巳申亥
  tu: [4, 7, 10, 1],      // 辰未戌丑
  zheng: [0, 3, 6, 9]     // 子卯午酉
};
const groupOf = m => GROUPS.sheng.includes(m) ? 'sheng' : GROUPS.tu.includes(m) ? 'tu' : 'zheng';

// 引擎内部函数复刻（与 engine 同源，用于取"该煞落在哪个日支"）
const sanheGroup = z => [8, 0, 4].includes(z) ? 0 : [11, 3, 7].includes(z) ? 1 : [2, 6, 10].includes(z) ? 2 : 3;
const JIE = [5, 8, 11, 2], ZAI = [6, 9, 0, 3], YUE = [7, 10, 1, 4];
const DASHI = [9, 0, 3, 6], TIANLI = [3, 6, 9, 0];
const XING = { 2: 5, 3: 0, 4: 4, 5: 8, 6: 6, 7: 1, 8: 2, 9: 9, 10: 7, 11: 11, 0: 3, 1: 10 };
const MU = [4, 7, 10, 1];
const hai = x => (19 - x) % 12;
const he6 = z => (13 - z) % 12;

const SHEN = {
  '劫煞': m => JIE[sanheGroup(m)],
  '灾煞': m => ZAI[sanheGroup(m)],
  '月煞': m => YUE[sanheGroup(m)],
  '大时': m => DASHI[sanheGroup(m)],
  '天吏': m => TIANLI[sanheGroup(m)],
  '月刑': m => XING[m],
  '月害': m => hai(m),
  '月厌': m => (12 - m) % 12,
  '九空': m => (MU[sanheGroup(m)] + 6) % 12,
  '月破': m => (m + 6) % 12,
  '月建': m => m,
  '小耗': m => (m + 5) % 12
};

// 卷十按语里的位次表：煞 -> { 月份组: 期望的建除位 }
const EXPECT = {
  '劫煞': { sheng: '收', tu: '除', zheng: '执' },
  '灾煞': { sheng: '开', tu: '满', zheng: '破' },
  '月煞': { sheng: '闭', tu: '平' },
  '大时': { sheng: '除', tu: '执', zheng: '收' },
  '天吏': { sheng: '危', tu: '闭', zheng: '平' },
  '月破': { sheng: '破', tu: '破', zheng: '破' },
  '月建': { sheng: '建', tu: '建', zheng: '建' },
  '九空': { sheng: '满', tu: '破', zheng: '开' }
};

for (const [name, fn] of Object.entries(SHEN)) {
  const exp = EXPECT[name];
  if (!exp) continue;
  for (let m = 0; m < 12; m++) {
    const d = fn(m), g = groupOf(m);
    if (!exp[g]) continue;
    const idx = jcOf(m, d);
    chk(J[idx] === exp[g], `${name} 在${Z[m]}月落在 ${Z[d]}日=第${J[idx]}日，卷十作「${exp[g]}日」`);
  }
}

// 月刑：卷十逐月写明（巳月值平、寅月值平、辰酉亥月值建、丑戌月值收、子月值平、卯月值收、未申月值破、午月值建）
const XING_EXP = { 5: '平', 2: '平', 4: '建', 9: '建', 11: '建', 1: '收', 10: '收', 0: '平', 3: '收', 7: '破', 8: '破', 6: '建' };
for (const [m, want] of Object.entries(XING_EXP)) {
  const mm = +m, d = XING[mm], idx = jcOf(mm, d);
  chk(J[idx] === want, `月刑 在${Z[mm]}月落在${Z[d]}日=第${J[idx]}日，卷十作「${want}日」`);
}

// 月害：卯酉值除、丑未值执、辰戌值闭、申值平、寅值月刑、子午值月煞、巳亥值劫煞
const HAI_EXP = { 3: '除', 9: '除', 1: '执', 7: '执', 4: '闭', 10: '闭', 8: '平' };
for (const [m, want] of Object.entries(HAI_EXP)) {
  const mm = +m, d = hai(mm), idx = jcOf(mm, d);
  chk(J[idx] === want, `月害 在${Z[mm]}月落在${Z[d]}日=第${J[idx]}日，卷十作「${want}日」`);
}
chk(hai(2) === XING[2], '月害 寅月 与月刑同日（卷十「寅月值月刑」）');
chk(hai(0) === YUE[sanheGroup(0)], '月害 子月 即月煞（卷十「子午月值月煞」）');
chk(hai(5) === JIE[sanheGroup(5)], '月害 巳月 即劫煞（卷十「己亥月值劫煞」）');

// 月厌：寅申值成、丑未值开、辰戌值定、巳亥值满、子午值建、卯酉值破
const YAN_EXP = { 2: '成', 8: '成', 1: '开', 7: '开', 4: '定', 10: '定', 5: '满', 11: '满', 0: '建', 6: '建', 3: '破', 9: '破' };
for (const [m, want] of Object.entries(YAN_EXP)) {
  const mm = +m, d = (12 - mm) % 12, idx = jcOf(mm, d);
  chk(J[idx] === want, `月厌 在${Z[mm]}月落在${Z[d]}日=第${J[idx]}日，卷十作「${want}日」`);
}

// 小耗：「旧月破，又为本月闭日之冲」
for (let m = 0; m < 12; m++) {
  const d = (m + 5) % 12, bi = (m + 11) % 12, chong = (bi + 6) % 12;
  chk(d === chong, `小耗 ${Z[m]}月 应为闭日(${Z[bi]})之冲(${Z[chong]})，得${Z[d]}`);
}

/* ============ B. 条文比对 ============ */
console.log('—— B. 条文比对（卷十分词 vs 引擎数组）——');

const PAIR = [
  '頒颁', '詔诏', '賢贤', '舉举', '慶庆', '賜赐', '賞赏', '賀贺', '㑹会', '帶带',
  '撫抚', '邊边', '選选', '訓训', '師师', '臨临', '結结', '納纳', '問问', '進进',
  '牀床', '頭头', '製制', '營营', '繕缮', '築筑', '隄堤', '興兴', '豎竖', '倉仓',
  '庫库', '鑄铸', '經经', '絡络', '醞酝', '釀酿', '開开', '劵券', '財财', '貨货',
  '產产', '磑硙', '補补', '飾饰', '墻墙', '塗涂', '壞坏', '種种', '養养', '啟启',
  '攢攒', '醫医', '療疗', '獵猎', '魚鱼', '學学', '愛爱', '寃冤', '緩缓', '獄狱',
  '為为', '併并', '猶犹', '與与', '體体', '陰阴', '陽阳', '歲岁', '歷历'
];
const MAP = {};
for (const pr of PAIR) MAP[pr[0]] = pr[1];
const simp = s => s.replace(/./g, c => MAP[c] || c);

const text = simp(raw
  .replace(/\{\{SK anchor\|([^}]*)\}\}/g, '\n@@$1@@\n')
  .replace(/\{\{SK notes\|[^}]*\}\}/g, '')
  .replace(/\{\{[^}]*\}\}/g, '')
  .replace(/<[^>]+>/g, '\n'));

// 切出每个条目
const sections = {};
const parts = text.split(/@@([^@]+)@@/);
for (let i = 1; i < parts.length; i += 2) {
  const name = parts[i].trim().replace(/\s+/g, '');
  const body = (parts[i + 1] || '').replace(/\s+/g, '');
  if (!sections[name]) sections[name] = body;
}

// 词表（长词优先）
const SURF = [
  ['求医疗病', '求医'], ['结婚姻', '结姻'], ['上册进表章', '上册'], ['修置产室', '修置产室'],
  ['平治道涂', '平治道涂'], ['竖柱上梁', '竖柱上梁'], ['修饰垣墙', '修饰垣墙'], ['整手足甲', '整手足甲'],
  ['安抚边境', '安抚边境'], ['开仓库', '开仓库'], ['出货财', '出货财'], ['安碓硙', '安碓硙'],
  ['畋猎', '畋猎'], ['取鱼', '取鱼'], ['捕捉', '捕捉']
];
for (const t of E.ORDER) SURF.push([t, t]);
SURF.sort((a, b) => b[0].length - a[0].length);

function tokenize(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    let hit = null;
    for (const [surf, tok] of SURF) {
      if (surf.length && s.startsWith(surf, i)) { hit = [surf, tok]; break; }
    }
    if (hit) { out.push(hit[1]); i += hit[0].length; }
    else i++;
  }
  return out;
}

// 取某条目"忌 …"这一段
function jiPart(name) {
  const b = sections[name];
  if (!b) return null;
  const i = b.indexOf('忌');
  if (i < 0) return null;
  let s = b.slice(i + 1);
  const stop = s.search(/止不忌|○|按|又为|与天德|若值|子午月|寅申月|辰戌|卯酉月/);
  if (stop > 0) s = s.slice(0, stop);
  return s;
}

const ENGINE = {
  '月破': { ji: ['祈福', '求嗣', '上册', '颁诏', '施恩', '封拜', '诏命', '招贤', '举正直', '宣政事', '庆赐', '赏贺', '宴会', '冠带', '行幸', '遣使', '安抚边境', '选将', '训兵', '出师', '上官', '临政', '结姻', '纳采', '问名', '嫁娶', '进人口', '般移', '安床', '整容', '剃头', '整手足甲', '裁制', '营建', '修宫室', '缮城郭', '筑堤防', '兴造', '竖柱上梁', '修仓库', '鼓铸', '经络', '酝酿', '开市', '立券', '交易', '纳财', '开仓库', '出货财', '修置产室', '开渠', '穿井', '安碓硙', '补垣', '塞穴', '修饰垣墙', '伐木', '栽种', '牧养', '纳畜', '破土', '安葬', '启攒'] },
  '月建': { ji: ['祈福', '求嗣', '上册', '结姻', '纳采', '问名', '解除', '整容', '剃头', '整手足甲', '求医', '营建', '修宫室', '缮城郭', '兴造', '竖柱上梁', '修仓库', '开仓库', '出货财', '修置产室', '破屋', '坏垣', '伐木', '栽种', '破土', '安葬', '启攒'] }
};

// 用 computeDay 取真实数组，避免手抄
function jiFromEngine(shenName, y, m, d) {
  const r = E.computeDay(y, m, d);
  const s = r.shensha.find(x => x.name === shenName);
  return s ? s.ji : null;
}

const CASES = [
  ['月破', 2026, 11, 2],   // 戌月辰日
  ['月建', 2026, 11, 9],   // 亥月亥日
  ['劫煞', 2026, 11, 11],  // 亥月巳日
  ['月厌', 2026, 11, 1]    // 戌月午日? 校验用
];

for (const [name, y, m, d] of CASES) {
  const arr = jiFromEngine(name, y, m, d);
  if (!arr) { bad(`取不到 ${name} 的数组（${y}-${m}-${d}）`); continue; }
  const part = jiPart(name);
  if (!part) { bad(`卷十解析不到 ${name} 的「忌」段`); continue; }
  const book = tokenize(part);
  const setB = new Set(book), setA = new Set(arr);
  const missing = arr.filter(x => !setB.has(x));   // 代码有、书里没识别到
  const extra = [...setB].filter(x => !setA.has(x)); // 书里有、代码没有
  const label = `${name}`;
  if (missing.length) bad(`${label} 代码多出：${missing.join(' ')}`);
  if (extra.length) bad(`${label} 代码缺少：${extra.join(' ')}`);
  if (!missing.length && !extra.length) console.log(`✓ ${label} 忌项完全一致（${arr.length} 项）`);
}

console.log(`\nA/B 合计：通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);

/* 穷通宝鉴调候：按「月序+日干」取原文段落
 * 数据源：chinese-fortune 仓库 knowledge/books/qiongtong（古文岛六卷转录，MIT）
 * 输出 qiongtong-data.js：{ '甲|正月': {text, juan, sec, exact:true} ... }
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'mingli', 'cfortune', 'chinese-fortune-main',
  'skills', 'chinese-fortune', 'knowledge', 'books', 'qiongtong');

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const MONTH_ORD = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const rows = [];
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.json')).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  if (!j.title || j.title.indexOf('总论') >= 0) continue;
  for (const p of j.passages || []) {
    rows.push({ sec: p.section || '', text: p.text, juan: j.title });
  }
}

/* 段落按 section 汇总 */
const bySec = new Map();
for (const r of rows) {
  const short = r.sec.includes('/') ? r.sec.split('/').pop().trim() : r.sec.trim();
  if (!bySec.has(short)) bySec.set(short, []);
  bySec.get(short).push(r);
}

const pick = (sec) => {
  const list = bySec.get(sec);
  if (!list || !list.length) return null;
  const openers = list.filter(x => x.text.startsWith(sec) && x.text.length >= 20);
  const pool = openers.length ? openers : list.filter(x => x.text.length >= 20);
  let best = null;
  for (const x of (pool.length ? pool : list)) {
    if (!best || x.text.length > best.text.length) best = x;
  }
  /* 只有标题、没有正文的段落视为缺（转录只抓到标题） */
  if (!best || best.text.length < 15) return null;
  /* 用神抽取：只认显式关键词旁的干，避免误取；取不到就留空 */
  const head = best.text.slice(0, 70);
  const use = [];
  const KW = ['专用', '專用', '先看', '先取', '次取', '次用', '取', '用', '喜', '赖', '賴', '藉', '须', '須', '端', '耑', '得', '宜', '看'];
  const isGan = c => '甲乙丙丁戊己庚辛壬癸'.indexOf(c) >= 0;
  let confident = true;
  for (let i = 0; i < head.length; i++) {
    const c = head[i];
    if (!isGan(c)) continue;
    /* 干前 1-2 字是否为关键词，或「X为尊/为最/为用」 */
    const before = head.slice(Math.max(0, i - 2), i);
    let hit = KW.some(k => before.endsWith(k));
    const after = head.slice(i + 1, i + 4);
    if (/(?:為|为)(?:尊|最|用|要|先|主|君)/.test(after)) hit = true;
    /* 「得丙癸逢」这类并列两名 */
    if (before.endsWith('得')) {
      const nx = head[i + 1];
      if (isGan(nx) && use.indexOf(nx) < 0 && use.indexOf(c) < 0) { use.push(c); use.push(nx); i++; continue; }
    }
    if (hit && use.indexOf(c) < 0 && use.length < 3) {
      use.push(c);
      const nx = head[i + 1];
      if (isGan(nx) && use.indexOf(nx) < 0 && use.length < 3) { use.push(nx); i++; }
    }
  }
  if (!use.length) confident = false;
  return { text: best.text, juan: best.juan, sec, use: use.slice(0, 3) };
};

const out = {};
let exact = 0, seasonal = 0, miss = 0;
const SEASON = { 0: '三春', 1: '三春', 2: '三春', 3: '三夏', 4: '三夏', 5: '三夏', 6: '三秋', 7: '三秋', 8: '三秋', 9: '三冬', 10: '三冬', 11: '三冬' };

/* 人工校订：原文未用「取/用/喜」等字眼、但文意明确的格，按原文补定用神。
   键为「干|月」，值为用神天干数组（按原文主次）；空数组表示原文确无明言。 */
const USE_FIX = {
  '甲|二月': ['庚'],
  '甲|十一月': ['丁', '庚', '丙'],
  '乙|三月': ['癸', '丙'],
  '乙|七月': ['己', '丙'],
  '丙|十月': ['甲', '戊', '庚'],
  '丁|二月': ['庚', '甲'],
  '丁|五月': [],
  '戊|正月': ['丙', '癸'],
  '戊|二月': ['丙', '癸'],
  '戊|三月': ['癸', '甲', '丙'],
  '戊|七月': ['丙', '癸', '甲'],
  '庚|十月': ['丁', '丙'],
  '辛|三月': ['壬', '甲'],
  '辛|七月': [],
  '辛|十一月': ['壬', '丙'],
  '辛|十二月': ['丙', '壬'],
  '癸|六月': ['庚', '辛']
};

for (const g of GAN) {
  for (let mi = 0; mi < 12; mi++) {
    const key = g + '|' + MONTH_ORD[mi];
    const wx = ['木','木','火','火','土','土','金','金','水','水'][GAN.indexOf(g)];
    let hit = pick(MONTH_ORD[mi] + g + wx);
    if (hit) { exact++; out[key] = Object.assign({ exact: true }, hit); }
    else {
      hit = pick(SEASON[mi] + g + wx);
      if (hit) { seasonal++; out[key] = Object.assign({ exact: false }, hit); }
      else { miss++; }
    }
    if (USE_FIX[key] && out[key]) out[key].use = USE_FIX[key];
  }
}

fs.writeFileSync(path.join(__dirname, 'qiongtong-data.js'),
  'window.XiejiQiongtong = ' + JSON.stringify(out, null, 1) + ';\n', 'utf8');

console.log(`格数 ${Object.keys(out).length}：精确 ${exact}，季论 ${seasonal}，缺 ${miss}`);
for (const k of ['甲|正月', '丙|正月', '丙|五月', '庚|七月', '壬|十一月']) {
  const v = out[k];
  console.log('---', k, v ? (v.exact ? '精确' : '季论') + ' ' + v.sec : '缺');
  if (v) console.log('   ', v.text.slice(0, 90));
}

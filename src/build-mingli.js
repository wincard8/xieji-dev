/* 抽取命理依据条文
 *   三命通会（Kanripo KR3g0042，四库本）
 *   渊海子平（维基文库全文 + chinese-fortune 语料库 304 篇，用于取格等篇目）
 * 输出 mingli-data.js：{ items: [{src, name, juan, text}] }
 */
const fs = require('fs');
const path = require('path');

const SM = path.join(__dirname, 'mingli', 'sanming');
const loadSM = n => fs.readFileSync(path.join(SM, `KR3g0042_${n}.txt`), 'utf8')
  .replace(/¶/g, '').replace(/<pb:[^>]+>/g, '').replace(/\s+/g, '');
const B = { 1: loadSM('001'), 2: loadSM('002'), 3: loadSM('003'), 4: loadSM('004'), 5: loadSM('005'), 6: loadSM('006') };

const SM_SPEC = [
  ['十神名义', 5, '以日干論甲乙在五行屬木', '官喜正不喜偏'],
  ['正官取格', 5, '正官者乃甲見辛乙見庚之例', '故只此月令為正'],
  ['旺衰与中和', 2, '大抵五行用法總無真實生死衰旺', '要以中和為貴'],
  ['用神与月令', 2, '故支中所藏者主命謂之人元', '日主最宜健旺是也'],
  ['大运折除', 2, '古人以大運則一辰十嵗', '凡行運在干兼用地支之神'],
  ['大运喜忌', 2, '損用神者欲運制之', '食欲運生不欲運梟絶'],
  ['三刑', 2, '論三刑隂符經曰', '造化人事其理一而已矣'],
  ['六害', 2, '六害者十二支凌戰之辰也', '更納音相尅者重']
];

const items = [];

/* 三命通会 */
for (const [name, juan, a, b] of SM_SPEC) {
  const t = B[juan];
  const i = t.indexOf(a);
  if (i < 0) { console.log('!! 三命通会起锚未找到', name); continue; }
  const j = t.indexOf(b, i);
  if (j < 0) { console.log('!! 三命通会止锚未找到', name); continue; }
  items.push({ src: '三命通会', name, juan: '卷' + '一二三四五六七'[juan - 1], text: t.slice(i, j + b.length) });
}

/* 渊海子平（维基文库）：篇首十神取象、地支藏遁歌 */
const yhRaw = fs.readFileSync(path.join(__dirname, 'mingli', 'yuanhai', 'yuanhai.wiki'), 'utf8');
const sections = {};
{
  const parts = yhRaw.split(/\n==+\s*([^=\n]+?)\s*==+\s*\n/);
  sections['(篇首)'] = parts[0];
  for (let i = 1; i < parts.length; i += 2) sections[parts[i].trim()] = parts[i + 1] || '';
}
const cleanWiki = s => s
  .replace(/\{\{[^}]*\}\}/g, '').replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
  .replace(/'''?/g, '').replace(/<[^>]+>/g, '')
  .replace(/^\s*[*#:;].*$/gm, '').replace(/\n{2,}/g, '\n').trim();

const YH_WIKI = [
  ['十神取象', '(篇首)', 360],
  ['地支藏遁', '又地支藏遁歌', 420]
];
for (const [name, sec, len] of YH_WIKI) {
  const body = sections[sec];
  if (!body) { console.log('!! 维基篇未找到', sec); continue; }
  items.push({ src: '渊海子平', name, juan: sec, text: cleanWiki(body).replace(/\s+/g, '').slice(0, len) });
}

/* 渊海子平（语料库 304 篇）：取格等 */
const YH_DIR = path.join(__dirname, 'mingli', 'cfortune', 'chinese-fortune-main',
  'skills', 'chinese-fortune', 'knowledge', 'books', 'yuanhai');
const yhByTitle = new Map();
for (const f of fs.readdirSync(YH_DIR).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(YH_DIR, f), 'utf8'));
  yhByTitle.set((j.title || '').trim(), (j.passages || []).map(p => p.text).join('\n'));
}
const YH_CORPUS = [
  ['月令取格', '宝法第二', 200],
  ['月支取格', '玄机赋', 180],
  ['看命六法', '看命口诀', 220],
  ['以日为主', '论日为主', 200],
  ['六亲·父', '论父', 150],
  ['六亲·母', '论母', 130],
  ['六亲·妻妾', '论妻妾', 170],
  ['六亲·子息', '论子息', 190],
  ['十二长生', '论天干生旺死绝', 200]
];
for (const [name, title, len] of YH_CORPUS) {
  const body = yhByTitle.get(title);
  if (!body) { console.log('!! 语料篇题未找到', title); continue; }
  items.push({ src: '渊海子平', name, juan: title, text: body.replace(/\s+/g, '').slice(0, len) });
}

fs.writeFileSync(path.join(__dirname, 'mingli-data.js'),
  'window.XiejiMingli = ' + JSON.stringify({ items }, null, 1) + ';\n', 'utf8');

console.log('条目', items.length);
for (const x of items) console.log(`【${x.src}·${x.name}】${x.juan} ${x.text.slice(0, 34)}…(${x.text.length})`);

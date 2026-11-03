/* 从 Kanripo 全文（kr/）抽取「义例」起例原文与卷十总论、铺注条例，
 * 生成 quotes-data.js，供 App「协纪原文」页引用。
 * 每条用首尾锚点截取，避免抓到上一条的尾巴。 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'kr');
const load = n => fs.readFileSync(path.join(DIR, `KR3g0051_${n}.txt`), 'utf8')
  .replace(/¶/g, '').replace(/<pb:[^>]+>/g, '').replace(/\s+/g, '');

const B = {
  3: load('003'), 4: load('004'), 5: load('005'),
  6: load('006'), 7: load('007'), 8: load('008'), 10: load('010')
};

/* name, 卷次, 起锚, 止锚 */
const SPEC = [
  ['建除十二神', 4, '厯書曰厯家以建除', '順行十二辰是也'],
  ['天德', 5, '天徳者天之福徳也', '可以興土功營宮室'],
  ['月德', 5, '月徳者月之徳神也', '利用其日'],
  ['天赦', 5, '天寳歴曰天赦者', '尤宜興造'],
  ['三合', 6, '曽門經曰三合者', '木之三合'],
  ['六合', 6, '六合者日月合宿之辰也', '合交易'],
  ['月建（土府）', 6, '亦猶月建之為土府', '不敢犯也'],
  ['月破', 4, '考原曰月破者', '與歲破義同'],
  ['大耗', 4, '樞要厯曰大耗者', '與月破同位'],
  ['月厌', 4, '堪輿經曰天老曰', '隂建在戌'],
  ['劫煞', 3, '神樞經曰劫煞者', '是也'],
  ['灾煞', 3, '神樞經曰災煞者', '當有疾患'],
  ['月煞', 6, '廣聖歴曰月殺者', '納羣畜'],
  ['月刑', 6, '按月刑之義', '嵗刑條下'],
  ['月害', 6, '神樞經曰月害者', '納奴婢'],
  ['大时', 6, '神樞經曰大時者', '㑹親'],
  ['天吏', 6, '樞要歴曰天吏者', '詞訟'],
  ['九空', 5, '廣聖歴曰九空者', '出入貨財'],
  ['小耗', 4, '舊月破為月小耗', '是小耗也']
];

const yili = [];
for (const [name, juan, a, b] of SPEC) {
  const t = B[juan];
  const i = t.indexOf(a);
  if (i < 0) { console.log('!! 未找到', name, a); continue; }
  const j = t.indexOf(b, i);
  if (j < 0) { console.log('!! 未找到尾', name, b); continue; }
  yili.push({ name, juan: '卷' + '一二三四五六七八九十'[juan - 1], text: t.slice(i, j + b.length) });
}

/* 卷十 总论 */
const t10 = B[10];
const xi = t10.indexOf('易傳曰');
const xu = xi >= 0 ? t10.slice(xi, t10.indexOf('作宜忌') + 3) : '';

/* 卷十 铺注条例（前六条） */
const pi = t10.indexOf('凡鋪註萬年書通書');
const pu = pi >= 0 ? t10.slice(pi, pi + 560) : '';

const data = { xulun: xu, puzhu: pu, yili };
fs.writeFileSync(path.join(__dirname, 'quotes-data.js'),
  'window.XiejiQuotes = ' + JSON.stringify(data, null, 1) + ';\n', 'utf8');

console.log('义例条目', yili.length, '｜总论', xu.length, '字｜铺注', pu.length, '字');
for (const x of yili) console.log('【' + x.name + '】' + x.juan + ' ' + x.text.slice(0, 46) + '…');

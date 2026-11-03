/* 生成 .ics 日历文件：每天一条全天事件，标题放农历+宜忌摘要，备注放全量宜忌 */
const fs = require('fs');
const path = require('path');
const E = require('./engine.js');

const MODERN = {
  '嫁娶': '结婚', '结姻': '订婚', '纳采': '提亲', '问名': '问名', '开市': '开业', '般移': '搬家',
  '营建': '动土', '兴造': '动土', '修宫室': '修造', '缮城郭': '修造', '竖柱上梁': '上梁',
  '破屋': '拆屋', '坏垣': '拆墙', '扫舍': '打扫', '解除': '解除', '求医': '求医', '求嗣': '求子',
  '立券': '签约', '交易': '交易', '纳财': '纳财', '安床': '安床', '裁制': '裁衣', '入学': '入学',
  '开仓库': '开仓', '出货财': '出货', '经络': '经络', '酝酿': '酿酒', '鼓铸': '冶炼',
  '开渠': '开渠', '穿井': '挖井', '安碓硙': '安磨', '补垣': '补墙', '塞穴': '堵穴',
  '修饰垣墙': '修墙', '平治道涂': '修路', '伐木': '伐木', '栽种': '栽种', '牧养': '牧养',
  '纳畜': '买畜', '破土': '破土', '安葬': '安葬', '启攒': '拾骨', '捕捉': '捕捉', '畋猎': '打猎',
  '取鱼': '捕鱼', '针刺': '针灸', '苫盖': '盖屋', '远回': '远归', '乘船': '乘船', '运谋': '谋划',
  '沐浴': '沐浴', '祭祀': '祭祀', '祈福': '祈福', '上册': '上表', '颁诏': '颁诏', '覃恩': '覃恩',
  '肆赦': '赦免', '施恩': '封赏', '封拜': '封赏', '诏命': '诏命', '招贤': '招贤', '举正直': '举贤',
  '宣政事': '布政', '行惠爱': '施惠', '雪冤枉': '雪冤', '缓刑狱': '缓刑', '庆赐': '庆赏',
  '赏贺': '庆赏', '宴会': '宴会', '冠带': '成人礼', '行幸': '出行', '遣使': '遣使',
  '安抚边境': '安边', '选将': '选将', '训兵': '练兵', '出师': '出师', '上官': '赴任',
  '临政': '上任', '进人口': '添丁', '整容': '整容', '剃头': '理发', '整手足甲': '修甲',
  '施恩惠': '施惠', '修仓库': '修仓', '修置产室': '修产室', '筑堤防': '筑堤'
};
const mod = t => MODERN[t] || t;

/* 标题里优先显示常用事 */
const COMMON = ['嫁娶', '开市', '般移', '求医', '入学', '裁制', '安床', '祭祀', '祈福', '求嗣', '立券',
  '交易', '纳财', '解除', '扫舍', '沐浴', '行幸', '安葬', '破土', '兴造', '栽种', '纳畜', '入宅'];

function modernList(list) {
  const seen = new Set(), out = [];
  for (const t of list) {
    const m = mod(t);
    if (!seen.has(m)) { seen.add(m); out.push({ m, t }); }
  }
  const rank = x => { const i = COMMON.indexOf(x.t); return i < 0 ? 99 : i; };
  out.sort((a, b) => rank(a) - rank(b));
  return out.map(x => x.m);
}
function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
/* RFC5545 折行：每行 ≤75 字节，按 UTF-8 字节切，不切断多字节字符 */
function fold(line) {
  const out = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch, 'utf8');
    if (bytes + b > 73) { out.push(cur); cur = ' '; bytes = 1; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function dstr(jdn) { const g = E.jdnToGregorian(jdn); return g.year + pad(g.month) + pad(g.day); }
function nowStamp() {
  const d = new Date();
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
}
const LUNAR_M = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const LUNAR_D = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

function event(jdn) {
  const g = E.jdnToGregorian(jdn);
  const r = E.computeDay(g.year, g.month, g.day);
  const lunar = (r.lunar.leap ? '闰' : '') + LUNAR_M[r.lunar.month - 1] + '月' + LUNAR_D[r.lunar.day - 1];
  const yi = modernList(r.yi), ji = modernList(r.ji);
  const sumYi = yi.slice(0, 3).join('·');
  const sumJi = ji.slice(0, 2).join('·');
  const summary = lunar + (sumYi ? ' 宜' + sumYi : '') + (sumJi ? ' 忌' + sumJi : '');

  const desc = [
    (yi.length ? '宜：' + yi.join(' ') : '宜：诸事不宜'),
    (ji.length ? '忌：' + ji.join(' ') : '忌：无忌'),
    '建除：' + r.jianchuName + ' · ' + r.levelText,
    '干支：' + r.yearGZText + '年 ' + r.monthGZText + '月 ' + r.dayGZText + '日',
    '神煞：' + r.shensha.map(s => s.name).join('、'),
    '依《钦定协纪辨方书》卷十「宜忌」'
  ].join('\n');

  return [
    'BEGIN:VEVENT',
    'UID:' + dstr(jdn) + '@xieji-huangli',
    'DTSTAMP:' + nowStamp(),
    'DTSTART;VALUE=DATE:' + dstr(jdn),
    'DTEND;VALUE=DATE:' + dstr(jdn + 1),
    fold('SUMMARY:' + esc(summary)),
    fold('DESCRIPTION:' + esc(desc)),
    'TRANSP:TRANSPARENT',
    'CATEGORIES:黄历',
    'END:VEVENT'
  ].join('\r\n');
}

const args = process.argv.slice(2);

/* ---------------- 时辰（定时事件） ---------------- */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Asia/Shanghai',
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:+0800',
  'TZOFFSETTO:+0800',
  'TZNAME:CST',
  'END:STANDARD',
  'END:VTIMEZONE'
];

function stamp(jdn, hh) {
  return dstr(jdn) + 'T' + pad(hh) + '0000';
}
function hourEvents(jdn, mode) {
  const g = E.jdnToGregorian(jdn);
  const r = E.computeDay(g.year, g.month, g.day);
  const list = [];
  for (const h of r.hours) {
    if (mode === 'good' && h.good !== '吉') continue;
    if (mode === 'bad' && h.good === '吉') continue;
    const startH = (2 * h.branch + 23) % 24;
    list.push({ startH, h });
  }
  list.sort((a, b) => a.startH - b.startH);   // 按钟点先后排列
  const out = [];
  for (const { startH, h } of list) {
    const endJdn = startH === 23 ? jdn + 1 : jdn;
    const endH = (startH + 2) % 24;
    const yi = modernList(h.yi), ji = modernList(h.ji);
    const head = yi.slice(0, 2).join('·');
    const summary = h.gz + '时 ' + h.good + ' ' + h.shen + (head ? ' 宜' + head : '');
    const desc = [
      '值神：' + h.shen + (h.godGood ? '（黄道）' : '（黑道）'),
      '冲' + h.chongName + ' · 煞' + h.sha + (h.marks.length ? ' · ' + h.marks.join('·') : ''),
      yi.length ? '宜：' + yi.join(' ') : '宜：诸事不宜（日破时）',
      ji.length ? '时忌：' + ji.join(' ') : '时忌：无',
      r.ji.length ? '日忌（前八项）：' + modernList(r.ji).slice(0, 8).join(' ') + ' …' : '日忌：无',
      '建除：' + r.jianchuName + ' · ' + r.levelText + ' · ' + r.dayGZText + '日',
      '依《钦定协纪辨方书》卷十「宜忌」'
    ].join('\n');
    out.push([
      'BEGIN:VEVENT',
      'UID:' + dstr(jdn) + 'T' + pad(startH) + '-' + h.branch + '@xieji-shichen',
      'DTSTAMP:' + nowStamp(),
      'DTSTART;TZID=Asia/Shanghai:' + stamp(jdn, startH),
      'DTEND;TZID=Asia/Shanghai:' + stamp(endJdn, endH),
      fold('SUMMARY:' + esc(summary)),
      fold('DESCRIPTION:' + esc(desc)),
      'TRANSP:TRANSPARENT',
      'CATEGORIES:时辰',
      'END:VEVENT'
    ].join('\r\n'));
  }
  return out;
}

function buildDayICS(startYear, endYear) {
  return buildDayRange(E.gregorianToJDN(startYear, 1, 1), E.gregorianToJDN(endYear, 12, 31),
    '协纪黄历 ' + startYear + '–' + endYear, 'xieji-huangli.ics');
}

function buildDayRange(start, end, title, name) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Xieji Huangli//CN', 'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + title,
    'X-WR-TIMEZONE:Asia/Shanghai',
    'X-WR-CALDESC:依《钦定协纪辨方书》卷十排布的每日宜忌'
  ];
  for (let j = start; j <= end; j++) lines.push(event(j));
  lines.push('END:VCALENDAR');
  return { text: lines.join('\r\n') + '\r\n', count: end - start + 1, name: name };
}

function buildHoursICS(fromYmd, days, mode) {
  const [y, m, d] = fromYmd.split('-').map(Number);
  const start = E.gregorianToJDN(y, m, d);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Xieji Huangli//CN', 'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:协纪时辰' + (mode === 'good' ? '·吉时' : mode === 'bad' ? '·凶时' : ''),
    'X-WR-TIMEZONE:Asia/Shanghai',
    'X-WR-CALDESC:十二时辰吉凶与宜忌（定时事件）'
  ].concat(VTIMEZONE);
  let count = 0;
  for (let i = 0; i < days; i++) {
    const evs = hourEvents(start + i, mode);
    count += evs.length;
    evs.forEach(e => lines.push(e));
  }
  lines.push('END:VCALENDAR');
  return { text: lines.join('\r\n') + '\r\n', count, name: 'xieji-shichen.ics' };
}

let result;
if (args[0] === 'hours') {
  result = buildHoursICS(args[2] || new Date().toISOString().slice(0, 10), +(args[3] || 90), args[1] || 'all');
} else if (args[0] === 'days') {
  const [y, m, d] = (args[1] || new Date().toISOString().slice(0, 10)).split('-').map(Number);
  const n = +(args[2] || 7), s = E.gregorianToJDN(y, m, d);
  result = buildDayRange(s, s + n - 1, '协纪黄历（试导 ' + n + ' 天）', 'xieji-test.ics');
} else {
  result = buildDayICS(+(args[0] || 2026), +(args[1] || 2027));
}

const out = path.join(__dirname, '..', result.name);
fs.writeFileSync(out, result.text, 'utf8');
const st = fs.statSync(out);
console.log('written', out, (st.size / 1024).toFixed(1) + ' KB', 'events:', result.count);

/* 校验 .ics：用法 node validate-ics.js ../xieji-huangli.ics [期望事件数] */
const fs = require('fs');
const path = require('path');

const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..', 'xieji-huangli.ics');
const expect = process.argv[3] ? +process.argv[3] : null;
const raw = fs.readFileSync(file, 'utf8');

let fail = 0;
const bad = m => { fail++; if (fail <= 8) console.log('✗', m); };

if (!/END:VCALENDAR\r\n$/.test(raw)) bad('文件未以 END:VCALENDAR+CRLF 结束');
if (/\n/.test(raw.replace(/\r\n/g, ''))) bad('存在裸 LF');

const phys = raw.split('\r\n');
const overlong = phys.filter(l => Buffer.byteLength(l, 'utf8') > 75).length;
if (overlong) bad(overlong + ' 行超过 75 字节');

const logical = [];
for (const l of phys) {
  if (l.startsWith(' ')) logical[logical.length - 1] += l.slice(1);
  else logical.push(l);
}

const need = ['UID', 'DTSTAMP', 'DTSTART', 'DTEND', 'SUMMARY'];
let ev = 0, depth = 0, cur = null, timed = 0, allDay = 0, tz = false;
const uids = new Set(), dup = [];
let prevStart = '';

for (const l of logical) {
  if (l === 'BEGIN:VTIMEZONE') { tz = true; continue; }
  if (l === 'BEGIN:VEVENT') { ev++; depth++; cur = {}; continue; }
  if (l === 'END:VEVENT') {
    depth--;
    for (const k of need) if (!cur[k]) bad('事件缺 ' + k);
    if (cur.UID) { if (uids.has(cur.UID)) dup.push(cur.UID); uids.add(cur.UID); }
    if (/T\d{6}$/.test(cur.DTSTART || '')) {
      timed++;
      if (!(cur.DTEND > cur.DTSTART)) bad('DTEND 不晚于 DTSTART: ' + cur.UID);
      if (cur.DTSTART < prevStart) bad('时间倒序: ' + cur.UID);
      prevStart = cur.DTSTART;
    } else allDay++;
    continue;
  }
  if (/^(BEGIN|END):VCALENDAR$/.test(l)) continue;
  const i = l.indexOf(':');
  if (i < 0) continue;
  const k = l.slice(0, i).split(';')[0];
  if (cur) cur[k] = l.slice(i + 1);
}
if (depth !== 0) bad('VEVENT 未闭合');
if (dup.length) bad('重复 UID: ' + dup.slice(0, 3).join(','));
if (expect && ev !== expect) bad('事件数 ' + ev + '，应为 ' + expect);

console.log(path.basename(file), '| 事件', ev, '（全天', allDay, '定时', timed, '）| 超长行', overlong,
  '| VTIMEZONE', tz ? '有' : '无');

// 抽查三条
const starts = logical.filter(l => /^DTSTART/.test(l));
console.log('首条:', starts[0]);
console.log('末条:', starts[starts.length - 1]);
const si = logical.findIndex(l => l.startsWith('DTSTART') && l.includes('20261102T09'));
if (si >= 0) {
  const s = logical.lastIndexOf('BEGIN:VEVENT', si), e = logical.indexOf('END:VEVENT', si);
  console.log('\n—— 2026-11-02 09:00 前后那条 ——');
  logical.slice(s, e + 1).forEach(l => console.log(l.replace(/\\n/g, ' ⏎ ')));
}

console.log(fail ? `\n${fail} 项失败` : '\n结构校验通过');
process.exit(fail ? 1 : 0);

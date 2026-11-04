/* 农历↔公历 往返一致性 + 边界 + 子时约定 */
const E = require('./engine.js');
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; if (fail <= 20) console.log('✗ ' + m); } };

/* 往返：农历→JDN→农历 必须回到原值 */
for (let y = 1901; y <= 2099; y++) {
  for (const m of E.lunarMonthsOf(y)) {
    for (const d of [1, 15, m.days]) {
      const j = E.lunarToJDN(y, m.month, d, m.leap);
      if (!j) { ok(false, `${y}-${m.month}-${d} 无法转换`); continue; }
      const back = E.toLunar(j);
      ok(back.year === y && back.month === m.month && back.day === d && !!back.leap === !!m.leap,
        `往返不符 ${y}-${m.leap ? '闰' : ''}${m.month}-${d} → ${back.year}-${back.month}-${back.day}`);
    }
  }
}

/* 边界：1900-01-01、2100-12-31 可算且不越界 */
{
  const a = E.computeDay(1900, 1, 1), b = E.computeDay(2100, 12, 31);
  ok(!!a.dayGZText && !!b.dayGZText, '边界日无法计算');
  ok(E.gregorianToJDN(1900, 1, 1) === 2415021, '1900-01-01 的 JDN 不是 2415021');
  ok(E.gregorianToJDN(2000, 1, 1) === 2451545, '2000-01-01 的 JDN 不是 2451545');
  ok(E.gregorianToJDN(2100, 12, 31) === 2488434, '2100-12-31 的 JDN 不是 2488434');
}

/* 日柱锚点：1949-10-01 = 甲子日（通行验证） */
{
  const r = E.computeDay(1949, 10, 1);
  ok(r.dayGZText === '甲子', `1949-10-01 应为甲子日，得 ${r.dayGZText}`);
}

/* 时辰：十二时辰覆盖 24 小时、子时跨日、时干五鼠遁自洽 */
{
  const r = E.computeDay(2026, 1, 1);
  const total = r.hours.reduce((n, h) => n + 2, 0);
  ok(total === 24, '十二时辰合计不是 24 小时');
  r.hours.forEach((h, i) => {
    const want = ((r.dayGZ % 5) * 2 + i) % 10;
    ok(h.stem === want, `${h.gz}时 时干不合五鼠遁`);
  });
  ok(r.hours[0].range.indexOf('23:00') === 0, '子时起点不是 23:00');
}

/* 月表：等第与官方表一致（读 data/月表_官方校对版.json） */
{
  const fs = require('fs');
  const p = 'archive/data/月表_官方校对版.json';
  if (fs.existsSync(p)) {
    const X = JSON.parse(fs.readFileSync(p, 'utf8'));
    const src = fs.readFileSync('engine.js', 'utf8');
    const Y = eval('(' + src.match(/const YUEBIAO = (\{[\s\S]*?\n  \});/)[1] + ')');
    for (const name of Object.keys(X)) for (let g = 0; g < 6; g++) {
      const a = (Y[name][g] || []).slice().sort((p, q) => p - q).join(',');
      const b = (X[name][String(g)] || []).slice().sort((p, q) => p - q).join(',');
      ok(a === b, `月表 ${name} 第${g}等不符`);
    }
  } else {
    console.log('（跳过月表比对：未找到 data/月表_官方校对版.json）');
  }
}

console.log(`\n往返/边界审核：通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);

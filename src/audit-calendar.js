/* 日历核心审核：不依赖任何外部数据，只查自洽与已知锚点 */
const E = require('./engine.js');
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; if (fail <= 40) console.log('✗ ' + m); } };

/* ---------- 1. 日柱：1900-2100 连续 ---------- */
{
  let prev = null;
  for (let j = E.gregorianToJDN(1900, 1, 1); j <= E.gregorianToJDN(2100, 12, 31); j++) {
    const g = E.jdnToGregorian(j);
    const r = E.computeDay(g.year, g.month, g.day);
    if (prev !== null) ok(r.dayGZ === (prev + 1) % 60, `${g.year}-${g.month}-${g.day} 日柱断档`);
    prev = r.dayGZ;
  }
}

/* ---------- 2. 农历自洽：每月初一是朔、月长 29/30、闰月无中气 ---------- */
{
  let checked = 0;
  for (let y = 1901; y <= 2099; y++) {
    const ms = E.lunarMonthsOf(y);
    ok(ms.length === 12 || ms.length === 13, `${y} 年有 ${ms.length} 个农历月`);
    let leapCount = ms.filter(m => m.leap).length;
    ok(leapCount <= 1, `${y} 年闰月 ${leapCount} 个`);
    ms.forEach(m => ok(m.days === 29 || m.days === 30, `${y} 年${m.leap ? '闰' : ''}${m.month}月 ${m.days} 天`));
    /* 每月初一须为朔日（与新月相差 < 1.5 天） */
    for (const m of ms) {
      const j = E.lunarToJDN(y, m.month, 1, m.leap);
      if (!j) continue;
      const k = Math.round((j - 2451550.1) / 29.530588861);
      const nm = E.newMoonJDN(k);
      ok(Math.abs(nm - j) <= 1, `${y} 年${m.leap ? '闰' : ''}${m.month}月初一非朔日（差 ${nm - j}）`);
      checked++;
    }
  }
  ok(checked > 2400, '农历月数异常：' + checked);
}

/* ---------- 3. 节气：每年 24 个、升序、间隔合理 ---------- */
{
  for (let y = 1901; y <= 2099; y++) {
    const list = [];
    for (let i = 0; i < 24; i++) list.push(E.solarTermJDN(y, i));
    for (let i = 1; i < 24; i++) {
      const gap = list[i] - list[i - 1];
      ok(gap >= 14 && gap <= 17, `${y} 年第${i}个节气间隔 ${gap} 天`);
    }
    ok(list[0] >= E.gregorianToJDN(y, 2, 1) && list[0] <= E.gregorianToJDN(y, 2, 7), `${y} 立春不在 2 月 1–7 日`);
  }
}

/* ---------- 4. 建除 = (日支 − 月支) mod 12 ---------- */
{
  for (let i = 0; i < 3000; i++) {
    const g = E.jdnToGregorian(E.gregorianToJDN(2000, 1, 1) + i * 3);
    const r = E.computeDay(g.year, g.month, g.day);
    const want = ((r.dayZhi - r.monthGZ.branch) % 12 + 12) % 12;
    ok(r.jianchu === want, `${g.year}-${g.month}-${g.day} 建除不符`);
  }
}

/* ---------- 5. 已知锚点（春节、闰月） ---------- */
{
  const spring = { 1900: [1, 31], 1950: [2, 17], 1985: [2, 20], 2000: [2, 5], 2010: [2, 14], 2020: [1, 25], 2024: [2, 10], 2025: [1, 29], 2026: [2, 17], 2033: [1, 31], 2050: [1, 23] };
  for (const [y, md] of Object.entries(spring)) {
    const j = E.lunarToJDN(+y, 1, 1, false);
    const g = E.jdnToGregorian(j);
    ok(g.month === md[0] && g.day === md[1], `${y} 春节 应为 ${md[0]}-${md[1]}，得 ${g.month}-${g.day}`);
  }
  const leaps = { 2023: 2, 2025: 6, 2028: 5, 2031: 3, 2033: 11, 2036: 6 };
  for (const [y, m] of Object.entries(leaps)) {
    const ms = E.lunarMonthsOf(+y);
    const lp = ms.filter(x => x.leap).map(x => x.month);
    ok(lp.length === 1 && lp[0] === m, `${y} 闰月应为 ${m}，得 ${lp.join(',') || '无'}`);
  }
}

/* ---------- 6. 立春换年：立春前一天年柱仍为旧年 ---------- */
{
  for (let y = 1950; y <= 2050; y++) {
    const lc = E.solarTermJDN(y, 0);          // 立春
    const a = E.computeDay(...Object.values(E.jdnToGregorian(lc - 1)));
    const b = E.computeDay(...Object.values(E.jdnToGregorian(lc)));
    ok(a.yearGZ === (b.yearGZ + 59) % 60, `${y} 立春换年不连续`);
  }
}

/* ---------- 7. 月柱换节：交节当天切换、前后相差一位 ---------- */
{
  for (let y = 1950; y <= 2050; y++) {
    for (let i = 0; i < 12; i++) {
      const t = E.solarTermJDN(y, i * 2);      // 十二节
      const a = E.computeDay(...Object.values(E.jdnToGregorian(t - 1)));
      const b = E.computeDay(...Object.values(E.jdnToGregorian(t)));
      ok(a.monthGZ.index === (b.monthGZ.index + 59) % 60, `${y} 第${i + 1}节未换月`);
    }
  }
}

console.log(`\n日历审核：通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);

/* 命理层全面审计 */
const E = require('./engine.js');
const GAN = E.GAN, ZHI = E.ZHI, WX = E.WX_NAME;
let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('✗ ' + msg); } };

/* 1. 藏干表：与《地支藏遁歌》对照 */
const VERSE = {
  0: ['癸'], 1: ['癸', '辛', '己'], 2: ['甲', '丙', '戊'], 3: ['乙'],
  4: ['乙', '戊', '癸'], 5: ['庚', '丙', '戊'], 6: ['丁', '己'], 7: ['乙', '己', '丁'],
  8: ['庚', '壬', '戊'], 9: ['辛'], 10: ['辛', '丁', '戊'], 11: ['壬', '甲']
};
for (let z = 0; z < 12; z++) {
  const got = E.ZHI_CANG[z].map(g => GAN[g]).sort().join('');
  const want = VERSE[z].slice().sort().join('');
  ok(got === want, `藏干 ${ZHI[z]}：得 ${got}，歌作 ${want}`);
}

/* 2. 十二长生：十干的长生/帝旺/墓 */
const CS = { '甲': [11, 3, 7], '乙': [6, 2, 10], '丙': [2, 6, 10], '丁': [9, 5, 1], '戊': [2, 6, 10],
  '己': [9, 5, 1], '庚': [5, 9, 1], '辛': [0, 8, 4], '壬': [8, 0, 4], '癸': [3, 11, 7] };
for (const [g, [sheng, wang, mu]] of Object.entries(CS)) {
  const gi = GAN.indexOf(g);
  ok(E.changSheng(gi, sheng) === '长生', `${g} 长生应在${ZHI[sheng]}，得 ${E.changSheng(gi, sheng)}`);
  ok(E.changSheng(gi, wang) === '帝旺', `${g} 帝旺应在${ZHI[wang]}，得 ${E.changSheng(gi, wang)}`);
  ok(E.changSheng(gi, mu) === '墓', `${g} 墓应在${ZHI[mu]}，得 ${E.changSheng(gi, mu)}`);
}

/* 3. 十神：渊海「以甲为例」 */
const T = { '甲': '比肩', '乙': '劫财', '丙': '食神', '丁': '伤官', '戊': '偏财', '己': '正财', '庚': '七杀', '辛': '正官', '壬': '偏印', '癸': '正印' };
for (const [g, want] of Object.entries(T)) {
  const got = E.shiShen(0, GAN.indexOf(g));
  ok(got === want, `甲见${g}：得 ${got}，应为 ${want}`);
}

/* 4. 建禄 / 月刃 */
const LU = { '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子' };
const REN = { '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子' };
for (const [g, z] of Object.entries(LU)) {
  const bz = { dayMaster: GAN.indexOf(g), year: { g: 0, z: 0 }, month: { g: 0, z: ZHI.indexOf(z) }, day: { g: 0, z: 0 } };
  const gj = E.geJu(bz);
  ok(gj.name === '建禄格', `${g}日${z}月应建禄，得 ${gj.name}`);
}
for (const [g, z] of Object.entries(REN)) {
  const bz = { dayMaster: GAN.indexOf(g), year: { g: 0, z: 0 }, month: { g: 0, z: ZHI.indexOf(z) }, day: { g: 0, z: 0 } };
  const gj = E.geJu(bz);
  ok(gj.name === '月刃格', `${g}日${z}月应月刃，得 ${gj.name}`);
}

/* 5. 大运：每步递进一位，且与月柱相连 */
const dy = E.daYun(1990, 6, 12, true, 8);
const base = E.computeDay(1990, 6, 12).monthGZ.index;
dy.list.forEach((d, i) => {
  const want = ((base + (dy.forward ? i + 1 : -(i + 1))) % 60 + 60) % 60;
  ok(d.idx === want, `第${i + 1}步大运应为${want}，得${d.idx}`);
});

/* 6. 小运：男女序列 */
for (let age = 1; age <= 12; age++) {
  const m = E.xiaoYun(age, true), f = E.xiaoYun(age, false);
  ok(m.idx === (2 + age - 1) % 60, `男${age}岁小运`);
  ok(f.idx === ((8 - (age - 1)) % 60 + 60) % 60, `女${age}岁小运`);
}

/* 7. 流月：十二个月干支应连续 */
const ly = E.liuYue(2026);
for (let i = 1; i < 12; i++) {
  ok(((ly[i].gan * 6 - ly[i].zhi * 5) + 60) % 60 === (((ly[0].gan * 6 - ly[0].zhi * 5) % 60) + i) % 60,
    `流月 ${i + 1} 不连续`);
}

/* 8. 打分边界 & 无 NaN */
let bad = 0;
for (let i = 0; i < 400; i++) {
  const g = E.jdnToGregorian(E.gregorianToJDN(2026, 1, 1) + i * 3);
  const r = E.computeDay(g.year, g.month, g.day);
  const s = E.scoreOf(r.dayGZ, r.dayZhi, [0, 4], [1, 2], { main: 0, second: 4 });
  if (!(s >= 0 && s <= 100) || Number.isNaN(s)) bad++;
}
ok(bad === 0, `打分越界或 NaN ${bad} 次`);

/* 9. 六亲/病药 无 undefined */
const bz = E.baziOf(1990, 6, 12, 6);
E.liuQin(bz, true).forEach(x => ok(x.role && x.shi && x.status, `六亲字段缺失 ${JSON.stringify(x)}`));
const gj = E.geJu(bz), st = E.geJuStatus(bz, gj);
ok('bing' in st && 'yao' in st, '病药字段缺失');

/* 10. 调候表完整性 */
global.window = {};
require('./qiongtong-data.js');
const Q = window.XiejiQiongtong;
let cells = 0, noUse = 0;
for (const g of GAN) for (const m of ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']) {
  const c = Q[g + '|' + m];
  if (c) { cells++; if (!c.use || !c.use.length) noUse++; }
}
ok(cells >= 110, `调候有效格数应≥110，得 ${cells}`);
console.log(`  调候无"用神"抽取的格：${noUse}`);

console.log(`\n审计：通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);

/* =====================================================================
   协纪黄历引擎 —— 历法 + 建除 + 神煞 + 宜忌
   规则底本：《钦定协纪辨方书》卷十「宜忌」（四库全书本）
   历法口径：北京时间 UTC+8；定朔定气；年柱以立春、月柱以节为界
   ===================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.XiejiEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RAD = Math.PI / 180;

  /* ---------------------------------------------------------------- 儒略日 */
  function gregorianToJDN(y, m, d) {
    const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
      Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  function jdnToGregorian(jdn) {
    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor(146097 * b / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor(1461 * d / 4);
    const m = Math.floor((5 * e + 2) / 153);
    return {
      year: 100 * b + d - 4800 + Math.floor(m / 10),
      month: m + 3 - 12 * Math.floor(m / 10),
      day: e - Math.floor((153 * m + 2) / 5) + 1
    };
  }
  // JDN + 0.5 == 当日 00:00 UT 的儒略日
  function dateToJD(y, m, d, hour) {
    return gregorianToJDN(y, m, d) - 0.5 + (hour || 0) / 24;
  }

  /* ------------------------------------------------------------- ΔT (TT-UT) */
  function deltaT(year) {
    let t, u;
    if (year < 1900) { u = (year - 1820) / 100; return -20 + 32 * u * u; }
    if (year < 1920) { t = year - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
    if (year < 1941) { t = year - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3; }
    if (year < 1961) { t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
    if (year < 1986) { t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
    if (year < 2005) { t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
    if (year < 2050) { t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    u = (year - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - year);
  }

  /* --------------------------------------------------------- 太阳视黄经(度) */
  function sunLongitude(jdTT) {
    const T = (jdTT - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * RAD)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD)
      + 0.000289 * Math.sin(3 * M * RAD);
    const omega = 125.04 - 1934.136 * T;
    let lam = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
    return ((lam % 360) + 360) % 360;
  }

  /* 时区：1929 年前时宪历用北京地方平太阳时（约 UTC+7:45:40），其后用东八区 */
  function tzOffsetHours(year) {
    return year < 1929 ? (7 + 45 / 60 + 40 / 3600) : 8;
  }

  const TERM_NAMES = ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];
  // 立春 = 315°，每隔 15° 一个节气
  const TERM_LON = TERM_NAMES.map((_, i) => (315 + 15 * i) % 360);

  // 返回某年某节气的 JDN（北京时间所在民用日）
  const termCache = new Map();
  function solarTermJDN(year, idx) {
    const key = year * 100 + idx;
    if (termCache.has(key)) return termCache.get(key);
    const target = TERM_LON[idx];
    // 粗估：立春 ≈ 2月4日，每节气约 15.22 天
    let jd = gregorianToJDN(year, 2, 4) + 0.5 + idx * 15.2184;
    for (let i = 0; i < 10; i++) {
      const lon = sunLongitude(jd);
      let diff = target - lon;
      diff = ((diff + 180) % 360 + 360) % 360 - 180;
      if (Math.abs(diff) < 1e-7) break;
      jd += diff / 0.9856473;
    }
    const g = jdnToGregorian(Math.floor(jd));
    const jdUT = jd - deltaT(g.year) / 86400;
    const jdn = Math.floor(jdUT + tzOffsetHours(g.year) / 24 + 0.5);
    termCache.set(key, jdn);
    return jdn;
  }

  // 节气标签 (year, i)：i=0 立春（该年 2 月）… i=23 大寒（次年 1 月）
  function termIndexOfJDN(jdn) {
    const { year } = jdnToGregorian(jdn);
    let best = -1, bestJdn = -Infinity;
    for (let yy = year - 1; yy <= year + 1; yy++) {
      for (let i = 0; i < 24; i++) {
        const t = solarTermJDN(yy, i);
        if (t <= jdn && t > bestJdn) { bestJdn = t; best = i; }
      }
    }
    return best;
  }
  function termInfo(jdn) {
    const { year } = jdnToGregorian(jdn);
    let prev = null, next = null;
    for (let yy = year - 1; yy <= year + 1; yy++) {
      for (let i = 0; i < 24; i++) {
        const t = solarTermJDN(yy, i);
        if (t <= jdn && (!prev || t > prev.jdn)) prev = { jdn: t, idx: i, name: TERM_NAMES[i] };
        if (t > jdn && (!next || t < next.jdn)) next = { jdn: t, idx: i, name: TERM_NAMES[i] };
      }
    }
    return { idx: prev.idx, name: prev.name, jdn: prev.jdn, nextJdn: next.jdn, nextName: next.name, nextIdx: next.idx };
  }

  /* --------------------------------------------------------- 朔望 */
  function newMoonJDE(k) {
    const T = k / 1236.85;
    const JDE = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T
      - 0.000000150 * T ** 3 + 0.00000000073 * T ** 4;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    const M = (2.5534 + 29.10535670 * k - 0.0000014 * T * T - 0.00000011 * T ** 3) * RAD;
    const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T ** 3 - 0.000000058 * T ** 4) * RAD;
    const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T ** 3 + 0.000000011 * T ** 4) * RAD;
    const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T ** 3) * RAD;
    let c = -0.40720 * Math.sin(Mp)
      + 0.17241 * E * Math.sin(M)
      + 0.01608 * Math.sin(2 * Mp)
      + 0.01039 * Math.sin(2 * F)
      + 0.00739 * E * Math.sin(Mp - M)
      - 0.00514 * E * Math.sin(Mp + M)
      + 0.00208 * E * E * Math.sin(2 * M)
      - 0.00111 * Math.sin(Mp - 2 * F)
      - 0.00057 * Math.sin(Mp + 2 * F)
      + 0.00056 * E * Math.sin(2 * Mp + M)
      - 0.00042 * Math.sin(3 * Mp)
      + 0.00042 * E * Math.sin(M + 2 * F)
      + 0.00038 * E * Math.sin(M - 2 * F)
      - 0.00024 * E * Math.sin(2 * Mp - M)
      - 0.00017 * Math.sin(Om)
      - 0.00007 * Math.sin(Mp + 2 * M)
      + 0.00004 * Math.sin(2 * Mp - 2 * F)
      + 0.00004 * Math.sin(3 * M)
      + 0.00003 * Math.sin(Mp + M - 2 * F)
      + 0.00003 * Math.sin(2 * Mp + 2 * F)
      - 0.00003 * Math.sin(Mp + M + 2 * F)
      + 0.00003 * Math.sin(Mp - M + 2 * F)
      - 0.00002 * Math.sin(Mp - M - 2 * F)
      - 0.00002 * Math.sin(3 * Mp + M)
      + 0.00002 * Math.sin(4 * Mp);
    return JDE + c;
  }
  const nmCache = new Map();
  function newMoonJDN(k) {
    if (nmCache.has(k)) return nmCache.get(k);
    const jde = newMoonJDE(k);
    const { year } = jdnToGregorian(Math.floor(jde + 0.5));
    const jdUT = jde - deltaT(year) / 86400;
    const jdn = Math.floor(jdUT + tzOffsetHours(year) / 24 + 0.5);
    nmCache.set(k, jdn);
    return jdn;
  }
  function newMoonIndexNear(jdn) {
    let k = Math.round((jdn - 2451550.1) / 29.530588861);
    let guard = 0;
    while (newMoonJDN(k) > jdn && guard++ < 10) k--;
    guard = 0;
    while (newMoonJDN(k + 1) <= jdn && guard++ < 10) k++;
    return k;
  }

  /* --------------------------------------------------------- 农历 */
  // 一"岁"：从含冬至之月（十一月）到下一个冬至月之前的各月
  function suiMonths(suiYear) {
    // suiYear: 该岁的冬至所在的公历年（即 Y-1 的冬至）
    const dz = solarTermJDN(suiYear, 21);     // 冬至
    const k11 = newMoonIndexNear(dz);
    const dzNext = solarTermJDN(suiYear + 1, 21);
    const k11b = newMoonIndexNear(dzNext);
    const n = k11b - k11;
    const months = [];
    for (let i = 0; i < n; i++) {
      const start = newMoonJDN(k11 + i);
      const end = newMoonJDN(k11 + i + 1);
      months.push({ start, end, k: k11 + i, zhongqi: hasZhongqi(start, end) });
    }
    // 编月序：11 月起
    let leapIdx = -1;
    if (n === 13) {
      for (let i = 1; i < n; i++) { if (!months[i].zhongqi) { leapIdx = i; break; } }
    }
    let num = 11, prevNum = 11;
    for (let i = 0; i < n; i++) {
      if (i === 0) { months[i].month = 11; months[i].leap = false; }
      else if (i === leapIdx) { months[i].month = prevNum; months[i].leap = true; }
      else {
        num = num % 12 + 1;
        months[i].month = num; months[i].leap = false;
      }
      if (!months[i].leap) prevNum = months[i].month;
    }
    return months;
  }
  function hasZhongqi(startJDN, endJDN) {
    // 月初 00:00 与月末 00:00 的太阳视黄经
    const l1 = sunLongitude(dateToJDJDN(startJDN));
    const l2 = sunLongitude(dateToJDJDN(endJDN));
    const a = l1, b = l2 < l1 ? l2 + 360 : l2;
    for (let m = 0; m < 360; m += 30) {
      let x = m;
      while (x < a) x += 360;
      if (x < b) return true;
    }
    return false;
  }
  function dateToJDJDN(jdn) { // 该日 00:00 北京时的 TT 儒略日（近似）
    const g = jdnToGregorian(jdn);
    return dateToJD(g.year, g.month, g.day, -8) + deltaT(g.year) / 86400;
  }

  const lunarYearCache = new Map();
  function lunarYear(Y) {
    if (lunarYearCache.has(Y)) return lunarYearCache.get(Y);
    const m1 = suiMonths(Y - 1);   // 十一月(Y-1)、十二月、正月(Y) …
    const m2 = suiMonths(Y);       // 十一月(Y)、十二月 …
    const idx1 = m1.findIndex(x => x.month === 1 && !x.leap);
    const idx2 = m2.findIndex(x => x.month === 1 && !x.leap);
    if (idx1 < 0 || idx2 < 0) return null;
    const start = m1[idx1].start;
    const next = m2[idx2].start;
    const months = m1.slice(idx1).concat(m2.slice(0, idx2)); // 正月 … 十二月
    const info = { Y, start, next, months };
    lunarYearCache.set(Y, info);
    return info;
  }

  function toLunar(jdn) {
    let Y = jdnToGregorian(jdn).year;
    let info = lunarYear(Y);
    if (jdn < info.start) { Y -= 1; info = lunarYear(Y); }
    if (jdn >= info.next) { Y += 1; info = lunarYear(Y); }
    for (const m of info.months) {
      if (jdn >= m.start && jdn < m.end) {
        return { year: Y, month: m.month, leap: !!m.leap, day: jdn - m.start + 1, monthStart: m.start };
      }
    }
    return null;
  }

  /* --------------------------------------------------------- 干支 */
  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

  function gz(idx) { return GAN[((idx % 10) + 10) % 10] + ZHI[((idx % 12) + 12) % 12]; }
  function gzIndex(g, z) { // 求 0..59
    const gi = GAN.indexOf(g), zi = ZHI.indexOf(z);
    for (let i = 0; i < 60; i++) if (i % 10 === gi && i % 12 === zi) return i;
    return 0;
  }
  function dayGZ(jdn) { return (jdn + 49) % 60; } // 1900-01-01 = 甲戌

  function yearGZ(jdn) {
    const g = jdnToGregorian(jdn);
    const lichun = solarTermJDN(g.year, 0);
    const y = jdn < lichun ? g.year - 1 : g.year;
    return (y - 4) % 60;
  }
  function monthBranchIndex(jdn) {
    const t = termInfo(jdn);
    // 立春=寅月(2)，每过一个"节"(偶数位节气)换一月
    const jieIdx = Math.floor(t.idx / 2); // 0=立春
    return (2 + jieIdx) % 12;
  }
  function monthGZ(jdn) {
    const yGZ = yearGZ(jdn);
    const ys = yGZ % 10;
    const br = monthBranchIndex(jdn);
    const mIdx = ((br - 2) + 12) % 12;
    const stem = ((ys % 5) * 2 + 2 + mIdx) % 10;
    return { index: (() => { for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === br) return i; })(), stem, branch: br };
  }

  /* --------------------------------------------------------- 建除十二神 */
  const JIANCHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
  function jianchuIndex(dayZhi, monthZhi) { return ((dayZhi - monthZhi) % 12 + 12) % 12; }

  /* --------------------------------------------------------- 用事词表 */
  const ORDER = ('祭祀 祈福 求嗣 上册 颁诏 覃恩 肆赦 施恩 封拜 诏命 招贤 举正直 宣政事 行惠爱 雪冤枉 缓刑狱 ' +
    '庆赐 赏贺 宴会 冠带 施恩惠 行幸 遣使 安抚边境 选将 训兵 出师 上官 临政 结姻 纳采 问名 嫁娶 进人口 般移 安床 ' +
    '整容 剃头 整手足甲 裁制 营建 修宫室 缮城郭 筑堤防 兴造 竖柱上梁 修仓库 鼓铸 经络 酝酿 开市 立券 交易 ' +
    '纳财 开仓库 出货财 修置产室 开渠 穿井 安碓硙 补垣 塞穴 修饰垣墙 平治道涂 破屋 坏垣 伐木 栽种 牧养 纳畜 ' +
    '破土 安葬 启攒 解除 沐浴 求医 扫舍 捕捉 畋猎 取鱼 入学 针刺 苫盖 远回 乘船 运谋').split(' ').filter(Boolean);
  const ORDER_IDX = new Map(ORDER.map((t, i) => [t, i]));

  const GLOSS = {
    上册: '上表章、进呈文书', 覃恩: '施恩、大赦类', 肆赦: '赦免', 施恩: '施恩封拜（授官）', 施恩惠: '施恩惠、抚恤孤寡',
    封拜: '封官授爵', 诏命: '诏命公卿', 招贤: '招贤举正直', 宣政事: '宣政事、布政', 行惠爱: '行惠爱',
    雪冤枉: '雪冤、缓刑狱', 庆赐: '庆赐赏贺', 宴会: '宴会', 冠带: '冠带、成人礼', 行幸: '出行巡幸',
    遣使: '遣使', 安抚边境: '安抚边境', 选将: '选将', 训兵: '训兵', 出师: '出师', 上官: '上官赴任',
    临政: '临政亲民', 结姻: '结婚姻（定亲）', 纳采: '纳采', 问名: '问名', 嫁娶: '嫁娶（成婚）',
    进人口: '收养、进人口', 般移: '搬家迁徙', 安床: '安床', 整容: '整容', 剃头: '剃头（理发）',
    整手足甲: '剪手足甲', 裁制: '裁衣制衣', 营建: '营建宫室', 修宫室: '修宫室', 缮城郭: '修城郭',
    筑堤防: '筑堤防', 兴造: '兴造动土', 竖柱上梁: '竖柱上梁', 修仓库: '修仓库', 鼓铸: '冶铸',
    经络: '经络（织机、布线）', 酝酿: '酿酒', 开市: '开市（开业）', 立券: '立券', 交易: '交易',
    纳财: '纳财', 开仓库: '开仓库', 出货财: '出货财', 修置产室: '修置产室', 开渠: '开渠',
    穿井: '穿井（掘井）', 安碓硙: '安碓磨', 补垣: '补墙', 塞穴: '塞鼠穴', 修饰垣墙: '修墙粉刷',
    平治道涂: '修路', 破屋: '拆屋', 坏垣: '拆墙', 伐木: '伐木', 栽种: '栽种', 牧养: '牧养',
    纳畜: '买畜', 破土: '破土（开穴）', 安葬: '安葬', 启攒: '启攒（拾骨迁葬）', 解除: '解除、禳解',
    沐浴: '沐浴', 求医: '求医治病', 扫舍: '打扫、扫舍宇', 捕捉: '捕捉', 畋猎: '打猎',
    取鱼: '捕鱼', 入学: '入学', 针刺: '针灸', 苫盖: '盖屋', 远回: '远行归回', 乘船: '乘船渡水',
    运谋: '运谋画策'
  };

  /* --------------------------------------------------------- 卷十原文 */
  const PO_YI = ['求医', '破屋', '坏垣'];
  const PO_BAI = ['祭祀', '覃恩', '肆赦', '施恩惠', '行惠爱', '雪冤枉', '缓刑狱', '入学', '解除', '沐浴',
    '求医', '扫舍', '平治道涂', '破屋', '坏垣', '捕捉', '畋猎', '取鱼'];
  const SHA_BAI = ['祭祀', '覃恩', '肆赦', '施恩惠', '行惠爱', '雪冤枉', '缓刑狱', '入学', '沐浴', '扫舍',
    '平治道涂', '伐木', '捕捉', '畋猎', '取鱼'];
  const YAN_BAI = ['祭祀', '覃恩', '肆赦', '施恩惠', '行惠爱', '雪冤枉', '缓刑狱', '入学', '沐浴', '扫舍',
    '捕捉', '畋猎', '取鱼'];

  const MASTER = ('祈福 求嗣 上册 颁诏 施恩 封拜 诏命 招贤 举正直 宣政事 庆赐 赏贺 宴会 冠带 行幸 遣使 ' +
    '安抚边境 选将 训兵 出师 上官 临政 结姻 纳采 问名 嫁娶 进人口 般移 安床 整容 剃头 整手足甲 裁制 ' +
    '营建 修宫室 缮城郭 筑堤防 兴造 竖柱上梁 修仓库 鼓铸 经络 酝酿 开市 立券 交易 纳财 开仓库 出货财 ' +
    '修置产室 开渠 穿井 安碓硙 补垣 塞穴 修饰垣墙 伐木 栽种 牧养 纳畜 破土 安葬 启攒').split(' ');

  const minus = (arr, rm) => arr.filter(x => !rm.includes(x));
  const plus = (arr, add) => Array.from(new Set(arr.concat(add)));

  /* 平日/收日 忌（卷十原文） */
  const PING_JI = plus(minus(MASTER, ['整容', '剃头', '整手足甲', '伐木', '安碓硙', '补垣', '塞穴', '修饰垣墙']), ['解除', '求医']);
  const PING_BU = ['祭祀', '覃恩', '肆赦', '施恩惠', '行惠爱', '雪冤枉', '缓刑狱', '入学', '沐浴', '整容', '剃头',
    '整手足甲', '安碓硙', '补垣', '塞穴', '扫舍', '修饰垣墙', '平治道涂', '破屋', '坏垣', '伐木', '捕捉', '畋猎', '取鱼'];
  /* 收日 忌：卷十"止不忌"含 进人口、修仓库、纳财、栽种、牧养、纳畜，故从忌中剔出 */
  const SHOU_JI = minus(PING_JI, ['进人口', '修仓库', '纳财', '栽种', '牧养', '纳畜']);
  const SHOU_BU = plus(PING_BU, ['进人口', '纳财', '纳畜', '修仓库']);

  /* 三煞/月刑 忌：卷十原文无「伐木」（伐木只在月破、月厌条中忌） */
  const SAN_SHA_JI = plus(minus(MASTER, ['伐木']), ['解除', '求医', '破屋', '坏垣']);

  /* 大时（大败·咸池）忌：卷十原文（比"通用凶表"窄得多，无颁诏、宣政事、庆赐、赏贺、宴会、裁制等） */
  const DASHI_JI = ['祈福', '求嗣', '上册', '施恩', '封拜', '诏命', '招贤', '举正直', '行幸', '遣使',
    '安抚边境', '选将', '训兵', '出师', '上官', '临政', '结姻', '纳采', '问名', '嫁娶', '进人口',
    '般移', '安床', '解除', '求医', '营建', '修宫室', '缮城郭', '筑堤防', '兴造', '竖柱上梁',
    '修仓库', '开市', '立券', '交易', '纳财', '开仓库', '出货财', '修置产室', '栽种', '牧养', '纳畜', '乘船'];

  /* 天吏（致死）忌：同大时，另加冠带、少修置产室 */
  const TIANLI_JI = ['祈福', '求嗣', '上册', '施恩', '封拜', '诏命', '招贤', '举正直', '冠带', '行幸', '遣使',
    '安抚边境', '选将', '训兵', '出师', '上官', '临政', '结姻', '纳采', '问名', '嫁娶', '进人口',
    '般移', '安床', '解除', '求医', '营建', '修宫室', '缮城郭', '筑堤防', '兴造', '竖柱上梁',
    '修仓库', '开市', '立券', '交易', '纳财', '开仓库', '出货财', '栽种', '牧养', '纳畜'];

  /* 月建（建日）忌 */
  const JIAN_JI = ['祈福', '求嗣', '上册', '结姻', '纳采', '问名', '解除', '整容', '剃头', '整手足甲', '求医',
    '营建', '修宫室', '缮城郭', '兴造', '竖柱上梁', '修仓库', '开仓库', '出货财', '修置产室', '破屋', '坏垣',
    '伐木', '栽种', '破土', '安葬', '启攒'];
  const TUFU_JI = ['营建', '修宫室', '缮城郭', '筑堤防', '兴造', '修仓库', '修置产室', '开渠', '穿井',
    '安碓硙', '补垣', '修饰垣墙', '平治道涂', '破屋', '坏垣', '栽种', '破土'];

  /* 月厌 忌 */
  const YAN_JI = plus(MASTER, ['解除', '求医', '破屋', '坏垣', '平治道涂', '远回']);

  /* 吉神：天德/月德/合（卷十"所宜"） */
  const DE_YI = ('祭祀 祈福 求嗣 上册 颁诏 覃恩 肆赦 施恩 封拜 诏命 招贤 举正直 施恩惠 宣政事 行惠爱 雪冤枉 缓刑狱 ' +
    '庆赐 赏贺 宴会 行幸 遣使 安抚边境 选将 训兵 出师 上官 临政 结姻 纳采 问名 嫁娶 般移 解除 求医 裁制 ' +
    '营建 缮城郭 兴造 竖柱上梁 修仓库 栽种 牧养 纳畜 安葬').split(' ');
  const DE_JI = ['畋猎', '取鱼'];

  const SANHE_YI = ['庆赐', '赏贺', '宴会', '结姻', '纳采', '问名', '嫁娶', '进人口', '裁制', '修宫室',
    '缮城郭', '兴造', '竖柱上梁', '修仓库', '经络', '酝酿', '立券', '交易', '纳财', '安碓硙', '纳畜'];
  const LIUHE_YI = ['宴会', '结姻', '嫁娶', '进人口', '经络', '酝酿', '立券', '交易', '纳财', '纳畜', '安葬'];

  /* 建除十二神（卷十） */
  const JIANCHU_DATA = [
    {
      name: '建日', note: '兵福', yi: ['施恩', '封拜', '诏命', '招贤', '举正直', '行幸', '遣使', '上官', '临政', '安抚边境', '选将', '训兵', '出师'],
      ji: [], cite: '建日：宜施恩封拜、诏命公卿、招贤举正直、行幸遣使、上官赴任、临政亲民；又为兵福，宜安抚边境、选将训兵出师。'
    },
    {
      name: '除日', note: '吉期·兵宝', yi: ['解除', '沐浴', '整容', '剃头', '整手足甲', '求医', '扫舍', '施恩', '封拜', '举正直', '行幸', '遣使', '上官', '临政', '安抚边境', '选将', '训兵', '出师'],
      ji: [], cite: '除日：宜解除、沐浴、整容、剃头、整手足甲、求医疗病、扫舍宇；又为吉期，宜施恩封拜、举正直、行幸遣使、上官赴任、临政亲民；又为兵宝，宜安抚边境、选将训兵出师。'
    },
    {
      name: '满日', note: '天巫·福德', yi: ['进人口', '裁制', '修仓库', '经络', '开市', '立券', '交易', '纳财', '开仓库', '出货财', '补垣', '塞穴', '祭祀', '祈福', '上册', '庆赐', '赏贺', '宴会', '修宫室', '缮城郭'],
      ji: ['施恩', '封拜', '诏命', '招贤', '举正直', '上官', '临政', '结姻', '纳采', '问名', '求医'],
      cite: '满日：宜进人口、裁制、修仓库、经络、开市、立券、交易、纳财、开仓库、出货财、补垣、塞穴；又为天巫，宜祭祀祈福；又为福德，宜上册进表章、庆赐赏贺宴会、修宫室缮城郭。忌施恩封拜、诏命公卿、招贤举正直、上官赴任、临政亲民、结姻、纳采问名、求医疗病（天狗）。'
    },
    {
      name: '平日', note: '死神', yi: ['修饰垣墙', '平治道涂'], ji: PING_JI,
      cite: '平日：宜修饰垣墙、平治道涂（义取诸平）。忌：祈福、求嗣、上册、颁诏、施恩封拜、诏命公卿、招贤举正直、宣布政事、庆赐赏贺宴会、冠带、行幸遣使、安抚边境、选将训兵出师、上官赴任、临政亲民、结姻、纳采问名、嫁娶、进人口、般移、安床、解除、求医、裁制、营建宫室、修宫室、缮城郭、筑堤防、兴造动土、竖柱上梁、修仓库、鼓铸、经络、酝酿、开市、立券交易、纳财、开仓库、出货财、修置产室、开渠、穿井、栽种、牧养、纳畜、破土、安葬、启攒。止不忌祭祀、覃恩、肆赦、施恩惠、行惠爱、雪冤枉、缓刑狱、入学、沐浴、整容、剃头、整手足甲、安碓硙、补垣、塞穴、扫舍宇、修饰垣墙、平治道涂、破屋坏垣、伐木、捕捉、畋猎、取鱼。'
    },
    {
      name: '定日', note: '时阴', yi: ['冠带', '运谋'], ji: [],
      cite: '定日：宜冠带；又为时阴，宜运谋算画计策。'
    },
    {
      name: '执日', note: '', yi: ['捕捉'], ji: [], cite: '执日：宜捕捉。霜降后立春前宜畋猎，雨水后立夏前宜取鱼。'
    },
    {
      name: '破日', note: '', yi: PO_YI, ji: [], cite: '破日：宜求医疗病、破屋坏垣（义取诸破）。'
    },
    {
      name: '危日', note: '', yi: ['安抚边境', '选将', '训兵', '安床'], ji: [],
      cite: '危日：宜安抚边境、选将训兵、安床。立冬后立春前宜伐木，霜降后立春前宜畋猎，雨水后立夏前宜取鱼。'
    },
    {
      name: '成日', note: '天喜·天医', yi: ['入学', '安抚边境', '般移', '筑堤防', '开市', '施恩', '封拜', '举正直', '庆赐', '赏贺', '宴会', '行幸', '遣使', '上官', '临政', '结姻', '纳采', '问名', '嫁娶', '求医'], ji: [],
      cite: '成日：宜入学、安抚边境、般移、筑堤防、开市；又为天喜，宜施恩封拜、举正直、庆赐赏贺宴会、行幸遣使、上官赴任、临政亲民、结姻、纳采问名、嫁娶；又为天医，宜求医疗病。'
    },
    {
      name: '收日', note: '', yi: ['进人口', '纳财', '捕捉', '纳畜'], ji: SHOU_JI, bai: SHOU_BU,
      cite: '收日：宜进人口、纳财、捕捉、纳畜（义取诸收）。忌同平日，唯不忌进人口、纳财、纳畜、修仓库。'
    },
    {
      name: '开日', note: '时阳·生气', yi: ['祭祀', '祈福', '求嗣', '上册', '颁诏', '覃恩', '肆赦', '施恩', '封拜', '诏命', '招贤', '举正直', '施恩惠', '宣政事', '行惠爱', '雪冤枉', '缓刑狱', '庆赐', '赏贺', '宴会', '入学', '行幸', '遣使', '上官', '临政', '般移', '解除', '求医', '裁制', '修宫室', '缮城郭', '兴造', '竖柱上梁', '开市', '修置产室', '开渠', '穿井', '安碓硙', '栽种', '牧养'],
      ji: ['伐木', '畋猎', '取鱼', '破土', '安葬'],
      cite: '开日：宜祭祀、祈福、求嗣、上册进表章、颁诏、覃恩肆赦、施恩封拜、诏命公卿、招贤举正直、宣政事、行惠爱、雪冤枉缓刑狱、庆赐赏贺宴会、入学、行幸遣使、上官赴任、临政亲民、般移、解除、求医疗病、裁制、修宫室、缮城郭、兴造动土、竖柱上梁、开市、修置产室、开渠穿井、安碓硙、栽种牧养。忌伐木、畋猎取鱼、破土、安葬、启攒。'
    },
    {
      name: '闭日', note: '血支', yi: ['筑堤防', '补垣', '塞穴'],
      ji: ['上册', '颁诏', '施恩', '封拜', '诏命', '招贤', '举正直', '宣政事', '庆赐', '赏贺', '宴会', '行幸', '遣使', '出师', '上官', '临政', '结姻', '纳采', '问名', '嫁娶', '进人口', '般移', '安床', '求医', '营建', '修宫室', '兴造', '竖柱上梁', '开市', '开仓库', '出货财', '修置产室', '开渠', '穿井', '针刺'],
      cite: '闭日：宜筑堤防、补垣塞穴（义取诸闭）。忌上册进表章、颁诏、施恩封拜、诏命公卿、招贤举正直、宣布政事、庆赐赏贺宴会、行幸遣使、出师、上官赴任、临政亲民、结姻、纳采问名、嫁娶、进人口、般移、安床、求医、营建宫室、修宫室、兴造动土、竖柱上梁、开市、开仓库出货财、修置产室、开渠穿井；又为血支，专忌针刺。'
    }
  ];

  /* --------------------------------------------------------- 神煞起例 */
  function sanheGroup(zhi) { // 0水 1木 2火 3金
    if ([8, 0, 4].includes(zhi)) return 0;      // 申子辰
    if ([11, 3, 7].includes(zhi)) return 1;     // 亥卯未
    if ([2, 6, 10].includes(zhi)) return 2;     // 寅午戌
    return 3;                                    // 巳酉丑
  }
  const JIE_SHA = [5, 8, 11, 2];      // 劫煞（绝地）：水绝巳、木绝申、火绝亥、金绝寅
  const ZAI_SHA = [6, 9, 0, 3];       // 灾煞（正冲旺神）
  const YUE_SHA = [7, 10, 1, 4];      // 月煞（尽地）
  const DA_SHI = [9, 0, 3, 6];        // 大时／大败（沐浴）：水酉 木子 火卯 金午
  const TIAN_LI = [3, 6, 9, 0];       // 天吏／致死（死地）：水卯 木午 火酉 金子
  const MU = [4, 7, 10, 1];           // 三合墓库：辰未戌丑

  const XING = { 2: 5, 3: 0, 4: 4, 5: 8, 6: 6, 7: 1, 8: 2, 9: 9, 10: 7, 11: 11, 0: 3, 1: 10 }; // 月刑
  const DE = { 2: { t: 'gan', v: 3 }, 3: { t: 'zhi', v: 8 }, 4: { t: 'gan', v: 8 }, 5: { t: 'gan', v: 7 }, 6: { t: 'zhi', v: 11 }, 7: { t: 'gan', v: 0 }, 8: { t: 'gan', v: 9 }, 9: { t: 'zhi', v: 2 }, 10: { t: 'gan', v: 2 }, 11: { t: 'gan', v: 1 }, 0: { t: 'zhi', v: 5 }, 1: { t: 'gan', v: 6 } };
  const HE_GAN = [5, 6, 7, 8, 9, 0, 1, 2, 3, 4]; // 干五合（甲己、乙庚…）甲0→己5

  function heZhi(z) { return (13 - z) % 12; }

  function shensha(jdn, ctx) {
    const { dayZhi, dayGan, monthZhi, monthGan } = ctx;
    const g = sanheGroup(monthZhi);
    const list = [];
    const add = (name, kind, yi, ji, cite, extra) => list.push(Object.assign({ name, kind, yi: yi || [], ji: ji || [], cite: cite || '' }, extra || {}));

    /* —— 建除 —— */
    const jc = ctx.jianchu;
    const d = JIANCHU_DATA[jc];
    add(d.name, '建除', d.yi, d.ji, d.cite, { bai: d.bai });

    /* —— 月建 / 土府 —— */
    if (dayZhi === monthZhi) {
      add('月建', '凶', [], JIAN_JI.concat(TUFU_JI),
        '月建（小时、土府）：忌祈福、求嗣、上册、结姻、纳采问名、解除、整容剃头、整手足甲、求医疗病、营建宫室、修宫室、缮城郭、兴造动土、竖柱上梁、修仓库、开仓库出货财、修置产室、破屋坏垣、伐木、栽种、破土、安葬、启攒；土府专忌营建、修宫室、缮城郭、筑堤防、兴造动土、修仓库、修置产室、开渠穿井、安碓硙、补垣、修饰垣墙、平治道涂、破屋坏垣、栽种、破土。');
    }
    /* —— 月破（必为破日）—— */
    if (dayZhi === (monthZhi + 6) % 12) {
      add('月破', '大凶', PO_YI, MASTER.slice(),
        '月破（大耗）：忌祈福、求嗣、上册进表章、颁诏、施恩封拜、诏命公卿、招贤举正直、宣布政事、庆赐赏贺宴会、冠带、行幸遣使、安抚边境、选将训兵出师、上官赴任、临政亲民、结姻、纳采问名、嫁娶、进人口、般移、安床、整容剃头、整手足甲、裁制、营建宫室、修宫室、缮城郭、筑堤防、兴造动土、竖柱上梁、修仓库、鼓铸、经络、酝酿、开市、立券交易、纳财、开仓库出货财、修置产室、开渠穿井、安碓硙、补垣塞穴、修饰垣墙、伐木、栽种、牧养、纳畜、破土、安葬、启攒。与天德月德天德合月德合并犹忌之，止不忌祭祀、覃恩、肆赦、施恩惠、行惠爱、雪冤枉、缓刑狱、入学、解除、沐浴、求医疗病、扫舍宇、平治道涂、破屋坏垣、捕捉、畋猎、取鱼。',
        { bai: PO_BAI });
    }
    /* —— 月厌 —— */
    if (dayZhi === (12 - monthZhi) % 12) {
      add('月厌', '大凶', [], YAN_JI,
        '月厌（地火）：忌祈福、求嗣、上册、颁诏、施恩封拜、诏命公卿、招贤举正直、宣布政事、庆赐赏贺宴会、冠带、行幸遣使、安抚边境、选将训兵出师、上官赴任、临政亲民、结姻、纳采问名、嫁娶、进人口、般移、远回、安床、解除、整容剃头、整手足甲、求医疗病、裁制、营建宫室、修宫室、缮城郭、筑堤防、兴造动土、竖柱上梁、修仓库、鼓铸、经络、酝酿、开市、立券交易、纳财、开仓库出货财、修置产室、开渠穿井、安碓硙、补垣塞穴、修饰垣墙、平治道涂、破屋坏垣、伐木、栽种牧养、纳畜、破土、安葬、启攒。止不忌祭祀、覃恩、肆赦、施恩惠、行惠爱、雪冤枉、缓刑狱、入学、沐浴、扫舍宇、捕捉、畋猎、取鱼。',
        { bai: YAN_BAI });
    }
    /* —— 三煞 —— */
    if (dayZhi === JIE_SHA[g]) add('劫煞', '凶', [], SAN_SHA_JI, '劫煞：忌祈福、求嗣、上册、颁诏、施恩封拜、诏命公卿、招贤举正直、宣布政事、庆赐赏贺宴会、冠带、行幸遣使、安抚边境、选将训兵出师、上官赴任、临政亲民、结姻、纳采问名、嫁娶、进人口、般移、安床、解除、整容剃头、整手足甲、求医疗病、裁制、营建宫室、修宫室、缮城郭、筑堤防、兴造动土、竖柱上梁、修仓库、鼓铸、经络、酝酿、开市、立券交易、纳财、开仓库出货财、修置产室、开渠穿井、安碓硙、补垣塞穴、修饰垣墙、破屋坏垣、栽种牧养、纳畜、破土、安葬、启攒。止不忌祭祀、覃恩、肆赦、施恩惠、行惠爱、雪冤枉、缓刑狱、入学、沐浴、扫舍宇、平治道涂、伐木、捕捉、畋猎、取鱼。', { bai: SHA_BAI });
    if (dayZhi === ZAI_SHA[g]) add('灾煞', '凶', [], SAN_SHA_JI, '灾煞（天火）：忌同劫煞；又为天火，忌苫盖。', { bai: SHA_BAI });
    if (dayZhi === YUE_SHA[g]) add('月煞', '凶', [], SAN_SHA_JI, '月煞（月虚）：忌同劫煞；又为月虚，忌修仓库、开仓库出货财。', { bai: SHA_BAI });
    /* —— 月刑 / 月害 —— */
    if (dayZhi === XING[monthZhi]) add('月刑', '凶', [], SAN_SHA_JI, '月刑：忌同三煞。', { bai: SHA_BAI });
    if (dayZhi === (19 - monthZhi) % 12) {
      add('月害', '凶', [], ['祈福', '求嗣', '上册', '庆赐', '赏贺', '宴会', '安抚边境', '选将', '训兵', '出师', '结姻', '纳采', '问名', '嫁娶', '进人口', '求医', '修仓库', '经络', '酝酿', '开市', '立券', '交易', '纳财', '开仓库', '出货财', '牧养', '纳畜', '破土', '安葬', '启攒'],
        '月害：忌祈福、求嗣、上册、庆赐赏贺宴会、安抚边境、选将训兵出师、结姻、纳采问名、嫁娶、进人口、求医疗病、修仓库、经络、酝酿、开市、立券交易、纳财、开仓库出货财、修置产室、牧养纳畜、破土、安葬、启攒。');
    }
    /* —— 大时 / 天吏 —— */
    if (dayZhi === DA_SHI[g]) add('大时', '凶', [], DASHI_JI, '大时（大败、咸池）：忌祈福、求嗣、上册、施恩封拜、诏命公卿、招贤举正直、冠带、行幸遣使、安抚边境、选将训兵出师、上官赴任、临政亲民、结姻、纳采问名、嫁娶、进人口、般移、安床、解除、求医疗病、营建宫室、修宫室、缮城郭、筑堤防、兴造动土、竖柱上梁、修仓库、开市、立券交易、纳财、开仓库出货财、修置产室、栽种牧养、纳畜；又为咸池，忌取鱼乘船渡水。');
    if (dayZhi === TIAN_LI[g]) add('天吏', '凶', [], TIANLI_JI, '天吏（致死）：忌祈福、求嗣、上册、施恩封拜、诏命公卿、招贤举正直、冠带、行幸遣使、安抚边境、选将训兵出师、上官赴任、临政亲民、结姻、纳采问名、嫁娶、进人口、般移、安床、解除、求医疗病、营建宫室、修宫室、缮城郭、筑堤防、兴造动土、竖柱上梁、修仓库、开市、立券交易、纳财、开仓库出货财、修置产室、栽种牧养、纳畜。');
    /* —— 小耗 / 九空 —— */
    if (dayZhi === (monthZhi + 5) % 12) add('小耗', '凶', [], ['修仓库', '开市', '立券', '交易', '纳财', '开仓库', '出货财'], '小耗（旧月破）：忌修仓库、开市、立券交易、纳财、开仓库出货财。');
    if (dayZhi === (MU[g] + 6) % 12) add('九空', '凶', [], ['进人口', '修仓库', '开市', '立券', '交易', '纳财', '开仓库', '出货财'], '九空（三合库地之冲）：忌进人口、修仓库、开市、立券交易、纳财、开仓库出货财。');
    /* —— 吉神 —— */
    const de = DE[monthZhi];
    const isDe = (de.t === 'gan') ? (dayGan === de.v) : (dayZhi === de.v);
    const yueDeGan = [8, 0, 2, 6][g]; // 申子辰壬、亥卯未甲、寅午戌丙、巳酉丑庚
    if (isDe) add('天德', '吉', DE_YI, DE_JI, '天德：宜祭祀、祈福、求嗣、上册进表章、颁诏、覃恩肆赦、施恩封拜、诏命公卿、招贤举正直、宣政事、行惠爱、雪冤枉缓刑狱、庆赐赏贺宴会、行幸遣使、安抚边境、选将训兵出师、上官赴任、临政亲民、结姻、纳采问名、嫁娶、般移、解除、求医疗病、裁制、营建宫室、修宫室、缮城郭、兴造动土、竖柱上梁、修仓库、栽种牧养纳畜、安葬。忌畋猎取鱼。');
    if (dayGan === yueDeGan) add('月德', '吉', DE_YI, DE_JI, '月德：所宜同天德，忌畋猎取鱼。');
    if (de.t === 'gan' && dayGan === HE_GAN[de.v]) add('天德合', '吉', DE_YI, DE_JI, '天德合：所宜同天德。');
    if (de.t === 'zhi' && dayZhi === heZhi(de.v)) add('天德合', '吉', DE_YI, DE_JI, '天德合：所宜同天德。');
    if (dayGan === HE_GAN[yueDeGan]) add('月德合', '吉', DE_YI, DE_JI, '月德合：所宜同天德。');
    /* 天赦 */
    const season = Math.floor(((monthZhi - 2) + 12) % 12 / 3); // 0春 1夏 2秋 3冬（以节为界）
    const SHE = [{ g: 4, z: 2 }, { g: 0, z: 6 }, { g: 4, z: 8 }, { g: 0, z: 0 }][season];
    if (dayGan === SHE.g && dayZhi === SHE.z) add('天赦', '吉', minus(DE_YI, ['出师']), DE_JI.concat(['出师']), '天赦：所宜同天德，忌畋猎取鱼；卷十「不用以出师」，故出师不入宜。');
    /* 月恩 / 四相 / 时德 / 天愿 / 天恩（卷五义例三，起例见各路历例） */
    const mIdx = ((monthZhi - 2) % 12 + 12) % 12;            // 0=正月
    const YUE_EN = [2, 3, 6, 5, 4, 7, 8, 9, 6, 1, 0, 7];     // 正丙 二丁 三庚 四己 五戊 六辛 七壬 八癸 九庚 十乙 十一甲 十二辛
    if (dayGan === YUE_EN[mIdx])
      add('月恩', '吉', ['营建', '嫁娶', '般移', '祭祀', '上官', '纳财'], [],
        '月恩：阳建所生之干也，子母相从谓之月恩。其日宜营造、婚姻、移徙、祭祀、上官、纳财。历例：正月丙、二月丁、三月庚、四月己、五月戊、六月辛、七月壬、八月癸、九月庚、十月乙、十一月甲、十二月辛。');
    const season2 = mIdx < 3 ? 0 : mIdx < 6 ? 1 : mIdx < 9 ? 2 : 3;   // 春 夏 秋 冬
    const SIXIANG = [[2, 3], [4, 5], [8, 9], [0, 1]];                // 春丙丁 夏戊己 秋壬癸 冬甲乙
    if (SIXIANG[season2].indexOf(dayGan) >= 0)
      add('四相', '吉', ['营建', '兴造', '栽种', '般移'], [],
        '四相：四时王相之辰也。其日宜修营起工、养育生财、栽植种莳、移徙远行。历例：春丙丁、夏戊己、秋壬癸、冬甲乙（不用庚辛）。');
    const SHIDE = [6, 4, 0, 2];                                       // 春午 夏辰 秋子 冬寅
    if (dayZhi === SHIDE[season2])
      add('时德', '吉', ['营建', '兴造', '栽种', '般移'], [],
        '时德：与四相同义，四相取天干、时德取地支。春木生火取午、夏火生土取辰、秋金生水取子、冬水生木取寅。其日所宜同四相。');
    const TIANYUAN = [[0, 6], [0, 10], [1, 9], [2, 0], [3, 1], [4, 6], [0, 2], [2, 4], [7, 3], [4, 4], [0, 0], [9, 7]];
    if (dayGan === TIANYUAN[mIdx][0] && dayZhi === TIANYUAN[mIdx][1])
      add('天愿', '吉', ['嫁娶', '纳财', '宴会'], [],
        '天愿：月中善神也，所值之日宜嫁娶、纳财、敦睦亲族。历例：正月甲午、二月甲戌、三月乙酉、四月丙子、五月丁丑、六月戊午、七月甲寅、八月丙辰、九月辛卯、十月戊辰、十一月甲子、十二月癸未。');
    let tianEn = false;
    const dgzIdx = ((dayGan * 6 - dayZhi * 5) % 60 + 60) % 60;
    for (const [a, b] of [[0, 4], [15, 19], [45, 49]]) if (dgzIdx >= a && dgzIdx <= b) tianEn = true;
    if (tianEn)
      add('天恩', '吉', ['施恩', '宣政事', '宴会'], [],
        '天恩：施德宽下之辰也。其日可以施恩赏、布政事、恤孤惸、兴宴乐。历例：甲子至戊辰、己卯至癸未、己酉至癸丑，凡十五日。');
    /* 三合 / 六合 */
    const diff = ((dayZhi - monthZhi) % 12 + 12) % 12;
    if (diff === 4 || diff === 8) add('三合', '吉', SANHE_YI, [], '三合：宜庆赐赏贺宴会、结姻、纳采问名、嫁娶、进人口、裁制、修宫室、缮城郭、兴造动土、竖柱上梁、修仓库、经络、酝酿、立券交易、纳财、安碓硙、纳畜。');
    if (dayZhi === heZhi(monthZhi)) add('六合', '吉', LIUHE_YI, [], '六合：宜宴会、结姻、嫁娶、进人口、经络、酝酿、立券交易、纳财、纳畜、安葬。');

    return list;
  }

  /* --------------------------------------------------------- 时令加项 */
  function seasonalAdds(jcName, jdn) {
    const t = termInfo(jdn).idx; // 立春=0
    const inWin = (a, b) => (a <= b ? (t >= a && t < b) : (t >= a || t < b));
    const out = [];
    const hunt = inWin(17, 0)   // 霜降后立春前
    const fish = inWin(1, 6);   // 雨水后立夏前
    const wood = inWin(20, 0);  // 立冬后立春前
    if (jcName === '执日' || jcName === '收日' || jcName === '危日') {
      if (hunt) out.push('畋猎');
      if (fish) out.push('取鱼');
    }
    if (jcName === '危日' && wood) out.push('伐木');
    return out;
  }

  /* --------------------------------------------------------- 百忌日 */
  const BAIJI_GAN = { 0: ['开仓库', '出货财'], 1: ['栽种'], 3: ['剃头'], 6: ['经络'], 7: ['酝酿'], 8: ['开渠'] };
  const BAIJI_ZHI = { 1: ['冠带'], 2: ['祭祀'], 3: ['穿井'], 5: ['行幸'], 6: ['苫盖'], 7: ['求医'], 8: ['安床'], 9: ['宴会'], 11: ['嫁娶'] };

  /* --------------------------------------------------------- 分类 */
  const CATS = [
    ['祭祀祈福', ['祭祀', '祈福', '求嗣', '上册', '颁诏', '覃恩', '肆赦', '施恩', '封拜', '诏命', '招贤', '举正直', '宣政事', '行惠爱', '雪冤枉', '缓刑狱', '庆赐', '赏贺', '宴会', '冠带']],
    ['婚嫁', ['结姻', '纳采', '问名', '嫁娶', '进人口']],
    ['出行赴任', ['行幸', '遣使', '安抚边境', '选将', '训兵', '出师', '上官', '临政', '般移', '远回', '乘船']],
    ['营造修作', ['营建', '修宫室', '缮城郭', '筑堤防', '兴造', '竖柱上梁', '修仓库', '修置产室', '开渠', '穿井', '安碓硙', '补垣', '塞穴', '修饰垣墙', '平治道涂', '破屋', '坏垣', '苫盖', '鼓铸']],
    ['工商交易', ['开市', '立券', '交易', '纳财', '开仓库', '出货财', '经络', '酝酿']],
    ['农畜渔猎', ['栽种', '牧养', '纳畜', '伐木', '捕捉', '畋猎', '取鱼']],
    ['丧葬', ['破土', '安葬', '启攒']],
    ['医病禳解', ['求医', '解除', '针刺']],
    ['起居杂事', ['沐浴', '扫舍', '整容', '剃头', '整手足甲', '入学', '安床', '裁制', '运谋']]
  ];
  const HEAVY = ['月破', '月厌', '劫煞', '灾煞', '月煞', '月刑'];
  const DE_SHEN = ['天德', '月德', '天德合', '月德合', '天赦', '月恩', '四相'];

  /* --------------------------------------------------------- 时家 */
  // 十二值神（黄黑道）：青龙所临之时支 = (2×日支 + 8) mod 12，余十一神顺行
  // 即 子午日青龙在申、丑未日在戌、寅申日在子、卯酉日在寅、辰戌日在辰、巳亥日在午
  const HUANGDAO = ['青龙', '明堂', '天刑', '朱雀', '金匮', '宝光', '白虎', '玉堂', '天牢', '玄武', '司命', '勾陈'];
  const IS_GOOD = [1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0];
  const HOUR_RANGE = ['23:00–00:59', '01:00–02:59', '03:00–04:59', '05:00–06:59',
    '07:00–08:59', '09:00–10:59', '11:00–12:59', '13:00–14:59',
    '15:00–16:59', '17:00–18:59', '19:00–20:59', '21:00–22:59'];
  const SHA_DIR = ['南', '西', '北', '东'];            // 三合局三煞方：水南 木西 火北 金东
  const LU = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];        // 日禄：甲寅 乙卯 丙戊巳 丁己午 庚申 辛酉 壬亥 癸子
  const GUIREN = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 8: [3, 5], 9: [3, 5], 7: [6, 2] };
  const YIMA = [2, 5, 8, 11];                          // 驿马：申子辰寅、亥卯未巳、寅午戌申、巳酉丑亥
  const SMALL = ['祭祀', '祈福', '求嗣', '解除', '沐浴', '扫舍', '求医', '裁制', '安床',
    '整容', '剃头', '整手足甲', '平治道涂', '捕捉', '畋猎', '取鱼', '入学'];

  function xunKong(dgz) {
    const s = Math.floor(dgz / 10);
    return [(10 - 2 * s + 12) % 12, (11 - 2 * s + 12) % 12];
  }

  /* --------------------------------------------------------- 卷十「月表」六等
     数据来源：《钦定协纪辨方书》卷十 月表（原书第 220–221 页），
     已据影印件校订为结构化表：神煞 → 六个等第各辖哪些月建（0=子 … 11=亥）
     上 / 上次 / 中 / 中次 / 下 / 下下 */
  const YUEBIAO = {
    '平日': [[11], [5], [8], [2, 3, 6, 9], [0, 1, 4, 7, 10], []],
    '收日': [[2, 8], [], [4, 5, 7, 11], [0, 1, 6, 9, 10], [3], []],
    '闭日': [[], [], [], [0, 1, 3, 4, 6, 7, 9, 10], [2, 5, 8, 11], []],
    '劫煞': [[2, 8], [1, 4, 7, 10], [5, 11], [0, 3, 6, 9], [], []],
    '灾煞': [[], [2, 5, 8, 11], [1, 4, 7, 10], [], [0, 6], [3, 9]],
    '月煞': [[], [3, 9], [], [0, 6], [1, 2, 4, 5, 7, 8, 10, 11], []],
    '月刑': [[], [5], [], [1, 2, 4, 9, 10, 11], [0, 3, 6, 7, 8], []],
    '月害': [[], [], [1, 3, 5, 7, 8, 9, 11], [0, 2, 4, 6, 10], [], []],
    '月厌': [[], [], [1, 2, 7, 8], [4, 5, 10, 11], [0, 6], [3, 9]],
    '大时': [[2, 4, 5, 8, 10, 11], [], [1, 7], [0, 6, 9], [3], []],
    '天吏': [[], [], [2, 5, 8, 11], [1, 3, 4, 6, 7, 9, 10], [0], []]
  };
  const GRADE_NAME = ['上', '上次', '中', '中次', '下', '下下'];
  const GRADE_LEVEL = ['大吉', '吉', '平', '小凶', '凶', '大凶'];
  const GRADE_LEVEL_N = [-2, -1, 0, 1, 2, 3];

  /* 取当日等第：表中诸煞取最重者；月破固定最下（卷十「破日…诸事不宜」） */
  function gradeOf(ss, monthZhi) {
    if (ss.some(s => s.name === '月破')) return { g: 5, from: '月破' };
    let g = 0, from = null;
    for (const s of ss) {
      const col = YUEBIAO[s.name];
      if (!col) continue;
      for (let gi = 0; gi < 6; gi++) {
        if (col[gi].indexOf(monthZhi) >= 0 && gi > g) { g = gi; from = s.name; }
      }
    }
    if (ss.some(s => s.name === '月建') && g < 2) { g = 2; from = '月建'; }
    return { g, from };
  }

  /* 六等的行为：按卷十判词
     上  从宜不从忌
     上次 遇德从宜不从忌；不遇从宜亦从忌
     中  遇德从宜不从忌；不遇从忌不从宜
     中次 遇德从宜亦从忌；不遇从忌不从宜
     下  遇德从忌不从宜；不遇诸事皆忌
     下下 遇德亦诸事皆忌 */
  function policyOf(g, hasDe) {
    if (g === 0) return 'yi';
    if (g === 1) return hasDe ? 'yi' : 'both';
    if (g === 2) return hasDe ? 'yi' : 'ji';
    if (g === 3) return hasDe ? 'both' : 'ji';
    if (g === 4) return hasDe ? 'ji' : 'none';
    return 'none';
  }

  /* --------------------------------------------------------- 主计算 */
  function computeDay(y, m, d) {
    const jdn = gregorianToJDN(y, m, d);
    const lunar = toLunar(jdn);
    const dgz = dayGZ(jdn);
    const dayGan = dgz % 10, dayZhi = dgz % 12;
    const ygz = yearGZ(jdn);
    const mgz = monthGZ(jdn);
    const monthZhi = mgz.branch;
    const jc = jianchuIndex(dayZhi, monthZhi);
    const t = termInfo(jdn);
    const ctx = { dayGan, dayZhi, monthZhi, monthGan: mgz.stem, jianchu: jc };

    const ss = shensha(jdn, ctx);
    const seaAdd = seasonalAdds(JIANCHU[jc] + '日', jdn);

    /* 合并宜忌 —— 依卷十「铺注条例」：凶煞所忌为硬约束，吉神宜项遇忌即去；
       大凶临日而无德神相解者（协纪谓"吉神失力"），只列该煞"止不忌"之事 */
    const yiSet = new Set(), jiSet = new Set(), src = new Map();
    const push = (set, token, from) => {
      set.add(token);
      if (!src.has(token)) src.set(token, []);
      const arr = src.get(token);
      if (!arr.includes(from)) arr.push(from);
    };

    const heavy = ss.filter(s => HEAVY.includes(s.name));
    const hasDe = ss.some(s => DE_SHEN.includes(s.name));
    const hardPo = ss.some(s => s.name === '月破' || s.name === '月厌');
    const shanSha = ss.filter(s => ['劫煞', '灾煞', '月煞', '月刑', '月害'].includes(s.name));
    const jianDay = ss.some(s => s.name === '月建');

    /* 等第（月表） */
    const gr = gradeOf(ss, monthZhi);
    const policy = policyOf(gr.g, hasDe);

    /* 卷十明文的两条"遇德减忌"：
       三煞／月刑「與天德月德天德合月德合併，止忌安撫邊境、選將、訓兵、出師、求醫療病，餘皆不忌」
       月建「與天德月德天德合月德合天赦月恩四相併，止忌營建宫室…破土，餘皆不忌」 */
    const DE_SHA_JI = ['安抚边境', '选将', '训兵', '出师', '求医'];
    /* 卷十明文：三煞／月刑「與天德月德…併，止忌安撫邊境、選將、訓兵、出師、求醫療病，餘皆不忌」
       劫煞另有一条：「寅申月又值六合，止忌（同上五項），餘皆不忌」——故六合亦触发减忌 */
    const hasLiuhe = ss.some(s => s.name === '六合');
    const hasJiesha = ss.some(s => s.name === '劫煞');
    const deSha = (hasDe || (hasLiuhe && hasJiesha)) && shanSha.length > 0 && !hardPo && !jianDay;
    const deJian = hasDe && jianDay && !hardPo;

    for (const s of ss) for (const x of s.ji) push(jiSet, x, s.name);
    if (policy !== 'none') {
      for (const s of ss) for (const x of s.yi) push(yiSet, x, s.name);
      for (const x of seaAdd) push(yiSet, x, JIANCHU[jc] + '日（时令）');
    }
    /* 卷十「止不忌」：义为不注宜、亦不注忌——故从忌中剔出，绝不入宜集 */
    for (const s of ss) if (s.bai) for (const x of s.bai) jiSet.delete(x);
    if (jc === 6) for (const x of PO_YI) push(yiSet, x, '破日专宜');

    /* 彭祖百忌：后世通书俗忌，不属《协纪》月表体系，故不入宜忌，只单列备参 */
    const baiji = [];
    (BAIJI_GAN[dayGan] || []).forEach(x => { if (baiji.indexOf(x) < 0) baiji.push(x); });
    (BAIJI_ZHI[dayZhi] || []).forEach(x => { if (baiji.indexOf(x) < 0) baiji.push(x); });

    /* 遇德减忌：只保留卷十点名的几项 */
    if (deSha) {
      const keep = new Set(DE_SHA_JI);
      for (const t of Array.from(jiSet)) if (!keep.has(t)) jiSet.delete(t);
    } else if (deJian) {
      const keep = new Set(TUFU_JI);
      for (const t of Array.from(jiSet)) if (!keep.has(t)) jiSet.delete(t);
    }

    /* 百忌日既不属协纪，也从宜集剔除，避免与止不忌相抵 */
    for (const t of baiji) yiSet.delete(t);

    /* 依等第处理宜忌相抵 */
    const conflicts = [];
    if (policy === 'yi') {
      for (const t of Array.from(jiSet)) if (yiSet.has(t) && baiji.indexOf(t) < 0) jiSet.delete(t);
    } else if (policy === 'both') {
      for (const t of yiSet) if (jiSet.has(t)) conflicts.push(t);
    } else {
      for (const t of Array.from(yiSet)) if (jiSet.has(t)) { yiSet.delete(t); conflicts.push(t); }
    }

    /* 卷十「止忌」的几项是硬忌，虽遇德、虽"从宜"也不得改为宜 */
    if (deSha) {
      for (const t of DE_SHA_JI) { jiSet.add(t); yiSet.delete(t); }
    } else if (deJian) {
      for (const t of TUFU_JI) { jiSet.add(t); yiSet.delete(t); }
    }

    const byOrder = (a, b) => (ORDER_IDX.has(a) ? ORDER_IDX.get(a) : 999) - (ORDER_IDX.has(b) ? ORDER_IDX.get(b) : 999);
    const yi = Array.from(yiSet).sort(byOrder);
    const ji = Array.from(jiSet).sort(byOrder);

    /* 层级（由等第决定） */
    const level = GRADE_LEVEL_N[gr.g];
    const levelText = GRADE_LEVEL[gr.g];
    const gradeName = GRADE_NAME[gr.g];

    /* 按类归并（忌项多时便于阅读） */
    const groupByCat = tokens => {
      const used = new Set();
      const out = CATS.map(([name, list]) => {
        const hit = tokens.filter(t => list.includes(t));
        hit.forEach(t => used.add(t));
        return { name, items: hit };
      }).filter(g => g.items.length);
      const rest = tokens.filter(t => !used.has(t));
      if (rest.length) out.push({ name: '其他', items: rest });
      return out;
    };

    /* 时辰：值神（黄黑道）＋冲煞＋时家吉神＋时之宜忌 */
    const kong = xunKong(dgz);
    const dayYiSet = new Set(yi), dayJiSet = new Set(ji);
    const hours = [];
    for (let b = 0; b < 12; b++) {
      const stem = ((dayGan % 5) * 2 + b) % 10;
      const shenIdx = ((b - (2 * dayZhi + 8)) % 12 + 12) % 12;
      const shen = HUANGDAO[shenIdx];
      const godGood = !!IS_GOOD[shenIdx];
      const chongZhi = (b + 6) % 12;
      const sha = SHA_DIR[sanheGroup(b)];
      const isChongDay = b === (dayZhi + 6) % 12;      // 时冲日支：日破时
      const isKong = kong[0] === b || kong[1] === b;   // 旬空
      const lu = LU[dayGan] === b;                     // 日禄时
      const guiren = (GUIREN[dayGan] || []).indexOf(b) >= 0;
      const yima = YIMA[sanheGroup(dayZhi)] === b;     // 驿马时
      const liuhe = heZhi(dayZhi) === b;               // 时合日支

      /* 时冲日支＝日破时：不改写黄黑道吉凶（保持与通书对照一致），只清空宜、全忌、加注 */
      const bigBad = false;
      const good = godGood ? '吉' : '凶';

      let hy = [];
      if (!isChongDay) {
        hy = godGood ? yi.slice() : yi.filter(t => SMALL.includes(t));
        if (lu) hy = hy.concat(['纳财', '上官']);
        if (guiren) hy = hy.concat(['上官', '临政']);
        if (yima) hy = hy.concat(['行幸', '般移']);
        if (liuhe) hy = hy.concat(['宴会', '结姻']);
        hy = Array.from(new Set(hy)).filter(t => !dayJiSet.has(t)).sort(byOrder);
      }

      let hj = [];
      if (isChongDay) hj = ji.slice();
      else {
        if (isKong) hj = hj.concat(['纳财', '上官', '行幸']);
        if (!godGood) hj = hj.concat(['嫁娶', '开市', '出行', '上官', '兴造', '安葬']);
        hj = Array.from(new Set(hj)).filter(t => !hy.includes(t)).sort(byOrder);
      }

      const note = isChongDay ? '时冲日支，为日破时，诸事不宜，大事另择'
        : (isKong ? '旬空之时，宜缓不宜急，大事另择'
          : (godGood ? '黄道时，可行本日所宜之事' : '黑道时，只取本日所宜中的小事，大事另择'));

      const marks = [];
      if (lu) marks.push('日禄');
      if (guiren) marks.push('天乙贵人');
      if (yima) marks.push('驿马');
      if (liuhe) marks.push('六合');
      if (isKong) marks.push('旬空');
      if (isChongDay) marks.push('时破日');

      hours.push({
        branch: b, stem, gz: GAN[stem] + ZHI[b], zhiName: ZHI[b], range: HOUR_RANGE[b],
        shen, godGood, good, chongZhi, chongName: ANIMALS[chongZhi], sha,
        marks, yi: hy, ji: hj, isChongDay, isKong, note
      });
    }

    const shaDay = SHA_DIR[sanheGroup(dayZhi)];
    const chongDay = (dayZhi + 6) % 12;

    return {
      solar: { y, m, d }, jdn,
      week: ['日', '一', '二', '三', '四', '五', '六'][(jdn + 1) % 7],
      lunar, dayGZ: dgz, dayGan, dayZhi, yearGZ: ygz, monthGZ: mgz,
      yearGZText: gz(ygz), monthGZText: gz(mgz.index), dayGZText: gz(dgz),
      animal: ANIMALS[ygz % 12],
      term: t, jianchu: jc, jianchuName: JIANCHU[jc] + '日',
      shensha: ss, yi, ji, src: Object.fromEntries(src), conflicts, baiji, hours,
      level, levelText, gradeName, gradeFrom: gr.from, policy,
      suppress: policy === 'none', hasDe, heavy: heavy.map(s => s.name),
      yiGroups: groupByCat(yi), jiGroups: groupByCat(ji),
      chong: { zhi: chongDay, name: ANIMALS[chongDay], sha: shaDay },
      rules: {
        monthZhi: ZHI[monthZhi], jianchu: JIANCHU[jc],
        isPo: dayZhi === (monthZhi + 6) % 12
      }
    };
  }

  /* 农历 → 儒略日（逐日扫描该农历年，闰月以 leap 区分） */
  function lunarToJDN(y, m, d, leap) {
    const start = gregorianToJDN(y, 1, 10);
    const limit = start + 430;
    for (let jdn = start; jdn < limit; jdn++) {
      const L = toLunar(jdn);
      if (L.year === y && L.month === m && L.day === d && !!L.leap === !!leap) return jdn;
    }
    return null;
  }
  /* 某农历年的月份表：[{month, leap, days}] */
  function lunarMonthsOf(y) {
    const start = lunarToJDN(y, 1, 1, false);
    if (start === null) return [];
    const out = [];
    let cur = null;
    for (let jdn = start; jdn < start + 400; jdn++) {
      const L = toLunar(jdn);
      if (L.year !== y) { if (cur) cur.days = jdn - cur.start; break; }
      if (!cur || cur.start !== L.monthStart) {
        if (cur) cur.days = L.monthStart - cur.start;
        cur = { month: L.month, leap: L.leap, start: L.monthStart, days: 0 };
        out.push(cur);
      }
    }
    return out;
  }

  /* ---------------- 八字：四柱、十神、刑冲合害 ---------------- */
  const GAN_WX = g => Math.floor(g / 2) % 5;          // 0木1火2土3金4水
  const SHENG = i => (i + 1) % 5;                      // 我生
  const KE = i => (i + 2) % 5;                         // 我克

  function shiShen(meGan, otherGan) {
    const me = GAN_WX(meGan), ot = GAN_WX(otherGan);
    const sameYin = (meGan % 2) === (otherGan % 2);
    if (me === ot) return sameYin ? '比肩' : '劫财';
    if (ot === SHENG(me)) return sameYin ? '食神' : '伤官';
    if (ot === KE(me)) return sameYin ? '偏财' : '正财';
    if (me === KE(ot)) return sameYin ? '七杀' : '正官';
    return sameYin ? '偏印' : '正印';
  }

  /* 五鼠遁：日干定子时天干 */
  function hourGan(dayGan, hourZhi) { return ((dayGan % 5) * 2 + hourZhi) % 10; }

  function baziOf(y, m, d, hourZhi) {
    const r = computeDay(y, m, d);
    const hz = (hourZhi === undefined || hourZhi === null) ? null : hourZhi;
    const yg = r.yearGZ % 10, dg = r.dayGZ % 10;
    const mg = (r.monthGZ && typeof r.monthGZ === 'object')
      ? { g: r.monthGZ.stem, z: r.monthGZ.branch, idx: r.monthGZ.index }
      : { g: r.monthGZ % 10, z: r.monthGZ % 12, idx: r.monthGZ };
    return {
      year: { g: yg, z: r.yearGZ % 12, idx: r.yearGZ },
      month: mg,
      day: { g: dg, z: r.dayZhi, idx: r.dayGZ },
      hour: hz === null ? null : { g: hourGan(dg, hz), z: hz },
      dayMaster: dg,
      yearText: r.yearGZText, monthText: r.monthGZText, dayText: r.dayGZText,
      hourText: hz === null ? '' : GAN[hourGan(dg, hz)] + ZHI[hz],
      jieqi: r.term ? r.term.name : ''
    };
  }

  /* 旬空：由六十甲子序号定 */
  function xunKong(idx) {
    const start = idx - (idx % 10);
    return [(start + 10) % 12, (start + 11) % 12];
  }

  const HE6 = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const HAI6 = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8];
  const XING_GROUP = (() => {
    const g = new Array(12).fill(-1);
    [0, 3].forEach(z => g[z] = 0);       // 子卯
    [2, 5, 8].forEach(z => g[z] = 1);    // 寅巳申
    [1, 10, 7].forEach(z => g[z] = 2);   // 丑戌未
    [4, 6, 9, 11].forEach(z => g[z] = 3); // 自刑
    return g;
  })();

  /* 当日（日柱）与命局四柱的关系 */
  function dayRelations(dayG, dayZ, bz) {
    const out = [];
    const pillars = [['年', bz.year], ['月', bz.month], ['日', bz.day]];
    if (bz.hour) pillars.push(['时', bz.hour]);
    for (const [label, p] of pillars) {
      if (dayZ === (p.z + 6) % 12) out.push({ type: '冲', pillar: label, text: '冲' + label + '柱' + ZHI[p.z] });
      if (dayZ === HE6[p.z]) out.push({ type: '合', pillar: label, text: '合' + label + '柱' + ZHI[p.z] });
      if (dayZ === HAI6[p.z]) out.push({ type: '害', pillar: label, text: '害' + label + '柱' + ZHI[p.z] });
      if (XING_GROUP[dayZ] >= 0 && XING_GROUP[dayZ] === XING_GROUP[p.z] && dayZ !== p.z && XING_GROUP[dayZ] !== 3)
        out.push({ type: '刑', pillar: label, text: '刑' + label + '柱' + ZHI[p.z] });
      if (dayZ === p.z && [4, 6, 9, 11].indexOf(dayZ) >= 0)
        out.push({ type: '自刑', pillar: label, text: '自刑（' + ZHI[dayZ] + '）' });
      /* 天克地冲 */
      if (dayZ === (p.z + 6) % 12 && GAN_WX(dayG) === KE(GAN_WX(p.g)))
        out.push({ type: '天克地冲', pillar: label, text: '天克地冲' + label + '柱（' + GAN[p.g] + ZHI[p.z] + '）' });
    }
    const shi = shiShen(bz.dayMaster, dayG);
    const kong = xunKong(bz.day.idx);
    return { list: out, shiShen: shi, kong: kong, kongHit: pillars.filter(pp => kong.indexOf(pp[1].z) >= 0).map(pp => pp[0]) };
  }

  /* ---------------- 五行旺衰与喜用（基础算法，非命理断言） ---------------- */
  const WX_NAME = ['木', '火', '土', '金', '水'];
  const ZHI_WX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]; // 子水 丑土 寅木 卯木 辰土 巳火 午火 未土 申金 酉金 戌土 亥水

  /* 地支藏干（据《渊海子平·地支藏遁歌》，主气在前） */
  const ZHI_CANG = [
    [9],            // 子 癸
    [5, 7, 9],      // 丑 己 辛 癸
    [0, 2, 4],      // 寅 甲 丙 戊
    [1],            // 卯 乙
    [4, 1, 9],      // 辰 戊 乙 癸
    [2, 4, 6],      // 巳 丙 戊 庚
    [3, 5],         // 午 丁 己
    [5, 1, 3],      // 未 己 乙 丁
    [6, 8, 4],      // 申 庚 壬 戊
    [7],            // 酉 辛
    [4, 7, 3],      // 戌 戊 辛 丁
    [8, 0]          // 亥 壬 甲
  ];
  const CANG_W = w => w === 1 ? [1] : (w === 2 ? [0.7, 0.3] : [0.6, 0.25, 0.15]);

  function baziWuxing(bz) {
    const ps = [bz.year, bz.month, bz.day].concat(bz.hour ? [bz.hour] : []);
    const me = GAN_WX(bz.dayMaster);
    const shengMe = (me + 4) % 5, keMe = (me + 3) % 5, woKe = (me + 2) % 5, woSheng = (me + 1) % 5;

    const force = [0, 0, 0, 0, 0];
    const raw = [0, 0, 0, 0, 0];
    ps.forEach((p, i) => {
      const gw = GAN_WX(p.g);
      force[gw] += 1; raw[gw] += 1;
      const cang = ZHI_CANG[p.z], w = CANG_W(cang.length);
      const mul = (i === 1) ? 1.5 : 1;            // 月令加权
      cang.forEach((g, k) => {
        const ww = w[k] * mul;
        force[GAN_WX(g)] += ww;
        raw[GAN_WX(g)] += CANG_W(cang.length)[k];
      });
    });

    const total = force.reduce((a, b) => a + b, 0);
    const support = force[me] + force[shengMe];
    const ratio = support / total;

    /* 得令：月支主气与日主同类或生我 */
    const yueMain = GAN_WX(ZHI_CANG[bz.month.z][0]);
    const deLing = (yueMain === me || yueMain === shengMe);
    /* 得地：月支以外，地支藏干中有与日主同类者（通根） */
    let deDi = 0;
    ps.forEach((p, i) => {
      if (i === 1) return;
      if (ZHI_CANG[p.z].some(g => GAN_WX(g) === me)) deDi++;
    });
    /* 得势：天干（除日干）中同我或生我者 */
    let deShi = 0;
    ps.forEach((p, i) => {
      if (i === 2) return;
      const gw = GAN_WX(p.g);
      if (gw === me || gw === shengMe) deShi++;
    });

    const strong = ratio >= 0.5;
    let fav = strong ? [keMe, woKe, woSheng] : [shengMe, me];
    let unf = strong ? [shengMe, me] : [keMe, woKe, woSheng];
    const tiaohou = [11, 0, 1].indexOf(bz.month.z) >= 0 ? 1 : ([5, 6, 7].indexOf(bz.month.z) >= 0 ? 4 : -1);
    if (tiaohou >= 0 && fav.indexOf(tiaohou) < 0) fav = fav.concat([tiaohou]);
    unf = unf.filter(w => fav.indexOf(w) < 0);

    return {
      counts: raw.map(v => Math.round(v * 10) / 10),
      force: force.map(v => Math.round(v * 100) / 100),
      ratio: Math.round(ratio * 100) / 100,
      strong: strong, strengthText: strong ? '身强' : '身弱',
      deLing: deLing, deDi: deDi, deShi: deShi,
      fav: fav, unf: unf, tiaohou: tiaohou,
      favText: fav.map(w => WX_NAME[w]).join('、'),
      unfText: unf.map(w => WX_NAME[w]).join('、')
    };
  }

  /* 当日干支五行对喜忌的粗打分（0–100）
     th（可选）：调候用神 { main, second } 五行序号——原文明定「主用／次用」者另行加权 */
  function scoreOf(dayGan, dayZhi, fav, unf, th) {
    let s = 50;
    const g = GAN_WX(dayGan), z = ZHI_WX[dayZhi];
    if (fav.indexOf(g) >= 0) s += 14; else if (unf.indexOf(g) >= 0) s -= 14;
    if (fav.indexOf(z) >= 0) s += 10; else if (unf.indexOf(z) >= 0) s -= 10;
    if (th) {
      if (th.main === g) s += 9; else if (th.main === z) s += 6;
      if (th.second === g) s += 5; else if (th.second === z) s += 3;
    }
    return Math.max(0, Math.min(100, Math.round(s)));
  }

  /* ---------------- 大运与流年 ---------------- */
  /* 阳年男／阴年女 顺行，其余逆行；出生到最近"节"的天数折合起运（三日一岁） */
  function qiYun(y, m, d, male) {
    const r0 = computeDay(y, m, d);
    const j0 = gregorianToJDN(y, m, d);
    const yangYear = (r0.yearGZ % 10) % 2 === 0;
    const forward = (yangYear && male) || (!yangYear && !male);
    let days = 15;
    for (let k = 1; k <= 40; k++) {
      const jj = forward ? j0 + k : j0 - k;
      const g = jdnToGregorian(jj);
      const r = computeDay(g.year, g.month, g.day);
      if (r.monthGZ.index !== r0.monthGZ.index) { days = k; break; }
    }
    return { forward: forward, days: days, startAge: days / 3 };
  }

  function daYun(y, m, d, male, count) {
    const q = qiYun(y, m, d, male);
    const r0 = computeDay(y, m, d);
    const out = [];
    const n = count || 8;
    for (let i = 1; i <= n; i++) {
      const idx = ((r0.monthGZ.index + (q.forward ? i : -i)) % 60 + 60) % 60;
      const ageStart = q.startAge + (i - 1) * 10;
      out.push({
        idx: idx,
        text: GAN[idx % 10] + ZHI[idx % 12],
        gan: idx % 10, zhi: idx % 12,
        from: Math.floor(ageStart), to: Math.floor(ageStart) + 10
      });
    }
    return { forward: q.forward, startAge: q.startAge, list: out };
  }

  function liuNian(year) {
    const r = computeDay(year, 6, 1);
    return { idx: r.yearGZ, text: r.yearGZText, gan: r.yearGZ % 10, zhi: r.yearGZ % 12 };
  }

  /* 月令取格（渊海子平：以日为主，先看提纲；月支取格，乃分贵贱） */
  const GE_NAME = {
    '正官': '正官格', '七杀': '偏官格', '正财': '正财格', '偏财': '偏财格',
    '食神': '食神格', '伤官': '伤官格', '正印': '印绶格', '偏印': '枭神格',
    '比肩': '建禄格', '劫财': '月刃格'
  };
  const LU_ZHI = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];   // 十干禄：甲寅 乙卯 丙巳 丁午 戊巳 己午 庚申 辛酉 壬亥 癸子
  function geJu(bz) {
    const me = bz.dayMaster, mz = bz.month.z;
    /* 建禄、月刃先于藏干取格 */
    if (mz === LU_ZHI[me]) {
      return { name: '建禄格', shiShen: '比肩', gan: me, by: '月令临官', zhi: mz, text: GAN[me] + ZHI[mz] };
    }
    if (me % 2 === 0 && mz === (LU_ZHI[me] + 1) % 12) {
      return { name: '月刃格', shiShen: '劫财', gan: me + 1, by: '月令帝旺', zhi: mz, text: GAN[me] + ZHI[mz] };
    }
    const cang = ZHI_CANG[mz];
    const gans = [bz.year.g, bz.month.g].concat(bz.hour ? [bz.hour.g] : []);
    const exposed = cang.filter(g => gans.indexOf(g) >= 0);
    const gan = exposed.length ? exposed[0] : cang[0];
    const shi = shiShen(me, gan);
    return {
      name: GE_NAME[shi] || shi,
      shiShen: shi,
      gan: gan,
      by: exposed.length ? '透干' : '本气',
      zhi: mz,
      text: GAN[gan] + ZHI[mz]
    };
  }

  /* 格局成败：据《渊海子平·看命口诀》「逢官看财，逢煞看印，逢印看官」等
     只在四柱十神齐备/冲突时给判断，不做旺衰以外的强弱推演 */
  function geJuStatus(bz, gj) {
    const me = bz.dayMaster;
    const ps = [bz.year, bz.month, bz.day].concat(bz.hour ? [bz.hour] : []);
    const has = {};                       // 十神 → 出现次数
    const add = g => { const s = shiShen(me, g); has[s] = (has[s] || 0) + 1; };
    ps.forEach(p => { add(p.g); ZHI_CANG[p.z].forEach(add); });
    const hasAny = arr => arr.some(s => has[s]);
    const tou = {};
    ps.forEach(p => { const k = shiShen(me, p.g); tou[k] = (tou[k] || 0) + 1; });
    const touAny = arr => arr.some(s => tou[s]);

    const reasons = [];
    let verdict = '平';
    let bing = null, yao = null, yaoBy = '';
    const name = gj.name;

    if (name === '正官格') {
      if (touAny(['伤官'])) { verdict = '破'; reasons.push('伤官见官，格破'); bing = '伤官'; yao = '正印'; yaoBy = '印制伤官'; }
      else if (hasAny(['正财', '偏财'])) { verdict = '成'; reasons.push('逢官看财，财生官'); }
      if (touAny(['七杀'])) { verdict = verdict === '成' ? '平' : '破'; reasons.push('官杀混杂'); bing = bing || '七杀'; yao = yao || '食神'; yaoBy = yaoBy || '食神制杀'; }
    } else if (name === '偏官格') {
      if (hasAny(['食神', '正印', '偏印'])) { verdict = '成'; reasons.push('煞看印、食神制杀'); }
      if (hasAny(['正财', '偏财']) && !hasAny(['食神', '正印', '偏印'])) { verdict = '破'; reasons.push('财生煞而无制'); bing = '正财'; yao = '比肩'; yaoBy = '比劫制财'; }
    } else if (name === '正财格' || name === '偏财格') {
      if (touAny(['比肩', '劫财'])) { verdict = '破'; reasons.push('比劫夺财'); bing = '比肩'; yao = '正官'; yaoBy = '官杀制比劫'; }
      else if (hasAny(['食神', '伤官'])) { verdict = '成'; reasons.push('食伤生财'); }
    } else if (name === '印绶格' || name === '枭神格') {
      if (touAny(['正财', '偏财'])) { verdict = '破'; reasons.push('财破印'); bing = '正财'; yao = '比肩'; yaoBy = '比劫制财'; }
      else if (hasAny(['正官', '七杀'])) { verdict = '成'; reasons.push('逢印看官，官印相生'); }
    } else if (name === '食神格') {
      if (touAny(['偏印'])) { verdict = '破'; reasons.push('枭神夺食'); bing = '偏印'; yao = '正财'; yaoBy = '财制枭印'; }
      else if (hasAny(['正财', '偏财'])) { verdict = '成'; reasons.push('食神生财'); }
    } else if (name === '伤官格') {
      if (touAny(['正官'])) { verdict = '破'; reasons.push('伤官见官'); bing = '伤官'; yao = '正印'; yaoBy = '印制伤官'; }
      else if (hasAny(['正财', '偏财'])) { verdict = '成'; reasons.push('伤官生财'); }
    } else if (name === '建禄格' || name === '月刃格') {
      if (hasAny(['正财', '偏财', '正官', '七杀'])) { verdict = '成'; reasons.push('禄刃喜财官'); }
      else { verdict = '平'; reasons.push('禄刃无财官可依'); }
    }

    /* 月支被冲，格根受损 */
    const chong = ps.some(p => p.z === (bz.month.z + 6) % 12);
    if (chong) { reasons.push('月令被冲，格根不稳'); if (verdict === '成') verdict = '平'; }

    return { verdict: verdict, reasons: reasons, name: name, bing: bing, yao: yao, yaoBy: yaoBy };
  }

  /* 十二长生：阳干顺行、阴干逆行
     长生起点：甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯 */
  const CS_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  const CS_START = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
  function changSheng(gan, zhi) {
    const start = CS_START[gan];
    const idx = (gan % 2 === 0) ? ((zhi - start + 12) % 12) : ((start - zhi + 12) % 12);
    return CS_NAMES[idx];
  }

  /* 六亲：据《渊海子平》论父/论母/论妻妾/论子息
     父=偏财　母=正印　兄弟=比肩劫财　男命妻=正财、子=七杀、女=正官；女命夫=正官、子=伤官、女=食神 */
  function liuQin(bz, male) {
    const me = bz.dayMaster;
    const ps = [bz.year, bz.month, bz.day].concat(bz.hour ? [bz.hour] : []);
    const labels = ['年', '月', '日', '时'];
    /* 记录每个十神第一次出现的位置：{ pos, gan, zhi } */
    const where = {};
    ps.forEach((p, i) => {
      const s = shiShen(me, p.g);
      if (i !== 2 && !where[s]) where[s] = { pos: labels[i] + '干', gan: p.g, zhi: p.z, tou: true };
      ZHI_CANG[p.z].forEach(g => {
        const t = shiShen(me, g);
        if (!where[t]) where[t] = { pos: labels[i] + '支藏' + GAN[g], gan: g, zhi: p.z, tou: false };
      });
    });
    const rows = [
      { role: '父', shi: ['偏财'] },
      { role: '母', shi: ['正印'] },
      { role: '兄弟', shi: ['比肩', '劫财'] },
      male ? { role: '妻', shi: ['正财'] } : { role: '夫', shi: ['正官'] },
      male ? { role: '子', shi: ['七杀'] } : { role: '子', shi: ['伤官'] },
      male ? { role: '女', shi: ['正官'] } : { role: '女', shi: ['食神'] }
    ];
    return rows.map(r => {
      let hit = null;
      for (const s of r.shi) if (where[s]) { hit = where[s]; break; }
      return {
        role: r.role,
        shi: r.shi.join('/'),
        status: hit ? (hit.tou ? '透干' : '藏干') : '无',
        stage: hit ? changSheng(hit.gan, hit.zhi) : '',
        pos: hit ? hit.pos : ''
      };
    });
  }

  /* 大运／流年吉凶：喜忌 + 长生 + 冲刑命局（本程序自定口径） */
  function yunScore(gan, zhi, bz, fav, unf) {
    let s = 50;
    const g = GAN_WX(gan), z = ZHI_WX[zhi];
    if (fav && fav.indexOf(g) >= 0) s += 12; else if (unf && unf.indexOf(g) >= 0) s -= 12;
    if (fav && fav.indexOf(z) >= 0) s += 10; else if (unf && unf.indexOf(z) >= 0) s -= 10;
    const cs = changSheng(bz.dayMaster, zhi);
    if (cs === '长生' || cs === '临官' || cs === '帝旺') s += 8;
    else if (cs === '死' || cs === '墓' || cs === '绝') s -= 8;
    const ps = [bz.year, bz.month, bz.day].concat(bz.hour ? [bz.hour] : []);
    ps.forEach(p => {
      if (zhi === (p.z + 6) % 12) s -= 6;
      else if (XING_GROUP[zhi] >= 0 && XING_GROUP[zhi] === XING_GROUP[p.z] && zhi !== p.z && XING_GROUP[zhi] !== 3) s -= 3;
    });
    return { score: Math.max(0, Math.min(100, Math.round(s))), stage: cs };
  }

  /* 取用神（相神）：据《渊海子平·看命口诀》「逢官看财，逢煞看印，逢印看官」一路 */
  function yongShen(gj) {
    const R = {
      '正官格': { shi: '正财', by: '逢官看财' },
      '偏官格': { shi: '正印', by: '逢煞看印' },
      '印绶格': { shi: '正官', by: '逢印看官' },
      '枭神格': { shi: '正官', by: '逢印看官' },
      '正财格': { shi: '食神', by: '财喜食生' },
      '偏财格': { shi: '食神', by: '财喜食生' },
      '食神格': { shi: '正财', by: '食神生财' },
      '伤官格': { shi: '正财', by: '伤官生财' },
      '建禄格': { shi: '正财', by: '禄喜财官' },
      '月刃格': { shi: '七杀', by: '刃喜杀制' }
    };
    const r = R[gj.name];
    return r ? { shi: r.shi, by: r.by, name: gj.name } : null;
  }

  /* 流月：按节气月取 12 个干支（取每月 15 日为样本日，月柱已按节分） */
  function liuYue(year) {
    const out = [];
    for (let m = 1; m <= 12; m++) {
      const r = computeDay(year, m, 15);
      out.push({ month: m, gan: r.monthGZ.stem, zhi: r.monthGZ.branch, text: GAN[r.monthGZ.stem] + ZHI[r.monthGZ.branch] });
    }
    return out;
  }

  /* 小运：据《渊海子平·论行小运法》「男一岁起丙寅顺行，女一岁起壬申逆行」 */
  function xiaoYun(age, male) {
    const n = Math.max(1, age) - 1;
    const idx = male ? ((2 + n) % 60) : ((8 - n) % 60 + 60) % 60;
    return { idx: idx, gan: idx % 10, zhi: idx % 12, text: GAN[idx % 10] + ZHI[idx % 12], age: age };
  }

  return {
    gregorianToJDN, jdnToGregorian, toLunar, lunarToJDN, lunarMonthsOf, computeDay,
    baziOf, shiShen, dayRelations, xunKong, baziWuxing, scoreOf, WX_NAME, ZHI_WX, ZHI_CANG,
    geJu, geJuStatus, liuQin, changSheng, CS_NAMES, yunScore, yongShen, liuYue, xiaoYun,
    qiYun, daYun, liuNian,
    sunLongitude, solarTermJDN, TERM_NAMES, newMoonJDN,
    GAN, ZHI, ANIMALS, JIANCHU, ORDER, GLOSS, JIANCHU_DATA, deltaT
  };
});

/* 协纪黄历 · 手机版（单页 App 外壳） */
(function () {
  'use strict';
  var E = window.XiejiEngine;
  var ZHI = E.ZHI, GAN = E.GAN, ANIMALS = E.ANIMALS;
  function toast(msg) {
    var d = document.createElement('div');
    d.textContent = msg;
    d.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(40,32,26,.92);' +
      'color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;z-index:9999;max-width:80vw;text-align:center';
    document.body.appendChild(d);
    setTimeout(function () { d.parentNode && d.parentNode.removeChild(d); }, 1600);
  }

  /* ---------------- 词表 ---------------- */
  var MODERN = {
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

  /* 纳音三十，按干支序每两位一名 */
  var NAYIN = ('海中金 炉中火 大林木 路旁土 剑锋金 山头火 涧下水 城头土 白蜡金 杨柳木 泉中水 屋上土 ' +
    '霹雳火 松柏木 长流水 沙中金 山下火 平地木 壁上土 金箔金 覆灯火 天河水 大驿土 钗钏金 ' +
    '桑柘木 大溪水 沙中土 天上火 石榴木 大海水').split(' ');

  var ORGAN = ['胆', '肝', '肺', '大肠', '胃', '脾', '心', '小肠', '膀胱', '肾', '心包', '三焦'];

  var WX_WORDS = { 木: '青绿', 火: '红紫', 土: '黄棕', 金: '米白', 水: '黑蓝' };
  var WX_SWATCH = {
    木: ['#4F7A4A', '#7FA36F', '#B7CBA4'],
    火: ['#B3202A', '#D0604F', '#E9A79B'],
    土: ['#B08B4F', '#CBA871', '#E2CDA4'],
    金: ['#BDB6A6', '#D6D0C2', '#EBE7DD'],
    水: ['#2F4858', '#4C6B80', '#93AEBD']
  };
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  function shengWo(w) { for (var k in SHENG) if (SHENG[k] === w) return k; return w; }
  function keWo(w) { for (var k in KE) if (KE[k] === w) return k; return w; }

  var THINGS = [
    { t: '结婚', k: ['嫁娶', '结姻'] }, { t: '搬家', k: ['般移'] }, { t: '开业', k: ['开市'] },
    { t: '动土', k: ['兴造', '营建'] }, { t: '修造', k: ['修宫室', '缮城郭'] }, { t: '安葬', k: ['安葬'] },
    { t: '破土', k: ['破土', '启攒'] }, { t: '出行', k: ['行幸'] }, { t: '赴任', k: ['上官', '临政'] },
    { t: '求医', k: ['求医'] }, { t: '入学', k: ['入学'] }, { t: '祭祀', k: ['祭祀'] },
    { t: '签约', k: ['立券', '交易'] }, { t: '纳财', k: ['纳财'] }, { t: '栽种', k: ['栽种'] },
    { t: '买畜', k: ['纳畜', '牧养'] }
  ];

  /* ---------------- 状态 ---------------- */
  var now = new Date();
  var S = {
    y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate(),
    tab: 'home', sheet: '', calY: now.getFullYear(), calM: now.getMonth() + 1,
    tsTab: 'yi', thing: 0, days: 60, quoteOpen: -1,
    zodiac: null, zMode: 'range', zMonth: '',
    bY: 1990, bM: 1, bD: 1, bLeap: false, bHz: null, qName: '', bz: null,
    bMale: true, quiz: null,
    favManual: null, unfManual: null, wx: null, favNow: null, unfNow: null
  };
  try {
    var _z = localStorage.getItem('xieji.zodiac');
    if (_z !== null && _z !== '') S.zodiac = +_z;
    var _zm = localStorage.getItem('xieji.zmonth');
    if (_zm) S.zMonth = _zm;
    var _b = localStorage.getItem('xieji.birth');
    if (_b) {
      var _o = JSON.parse(_b);
      if (_o && _o.bY) {
        S.bY = _o.bY; S.bM = _o.bM; S.bD = _o.bD; S.bLeap = !!_o.bLeap;
      if (S.bHz === null || S.bHz === undefined) { S.bHz = null; }
      else S.bHz = +_o.bHz;
      S.bMale = (_o.male === undefined) ? true : !!_o.male;
      }
    }
    var _f = localStorage.getItem('xieji.favor');
    if (_f) {
      var _fo = JSON.parse(_f);
      if (_fo && _fo.fav && _fo.fav.length) { S.favManual = _fo.fav; S.unfManual = _fo.unf || []; }
    }
  } catch (e) { /* 本地文件可能禁用 localStorage */ }
  function saveZodiac(v) {
    S.zodiac = v;
    try { localStorage.setItem('xieji.zodiac', String(v)); } catch (e) { }
  }
  function saveBirth() {
    try {
      localStorage.setItem('xieji.birth', JSON.stringify({
        bY: S.bY, bM: S.bM, bD: S.bD, bLeap: S.bLeap, bHz: S.bHz, male: S.bMale
      }));
    } catch (e) { }
  }
  function birthSolar() {
    var j = E.lunarToJDN(S.bY, S.bM, S.bD, S.bLeap);
    return j === null ? null : E.jdnToGregorian(j);
  }
  function bzNow() {
    var j = E.lunarToJDN(S.bY, S.bM, S.bD, S.bLeap);
    if (j === null) return null;
    var g = E.jdnToGregorian(j);
    try { return E.baziOf(g.year, g.month, g.day, S.bHz); } catch (e) { return null; }
  }
  S.bz = bzNow();
  var cache = {};

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function isToday() {
    var t = new Date();
    return t.getFullYear() === S.y && t.getMonth() + 1 === S.m && t.getDate() === S.d;
  }
  function day() {
    var key = S.y + '-' + S.m + '-' + S.d;
    if (!cache[key]) {
      var r = E.computeDay(S.y, S.m, S.d);
      r.nayin = NAYIN[Math.floor(r.dayGZ / 2)] || '';
      r.wx = r.nayin.slice(-1);
      cache[key] = r;
    }
    return cache[key];
  }
  function lunarText(r) { return (r.lunar.leap ? '闰' : '') + lunarMonthName(r.lunar.month) + lunarDayName(r.lunar.day); }
  function lunarMonthName(m) { return ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'][m - 1] + '月'; }
  function lunarDayName(d) {
    return ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
      '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
      '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'][d - 1];
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var SHISHEN_TXT = {
    '比肩': '同伴相助，宜合作、找搭档',
    '劫财': '争利分财，防破财、忌合伙',
    '食神': '才华舒展，宜创作、餐饮、洽谈',
    '伤官': '锋芒外露，宜表达创新，忌顶撞上级',
    '偏财': '意外之财，宜投资、谈生意',
    '正财': '稳定收入，宜签合约、求财',
    '七杀': '压力冲突，宜静守，忌冒险',
    '正官': '名分责任，宜求职、见贵人',
    '偏印': '思绪偏门，宜钻研，忌多疑',
    '正印': '贵人扶持，宜学习、考证、求教'
  };

  /* ---------------- 对比海报 ---------------- */
  var GRADE_SCORE = { '上': 95, '上次': 85, '中': 70, '中次': 55, '下': 40, '下下': 20 };

  function wrapText(x, text, cx, y, maxW, lh) {
    var line = '', lines = [];
    for (var i = 0; i < text.length; i++) {
      var t = line + text[i];
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = text[i]; }
      else line = t;
    }
    if (line) lines.push(line);
    lines.forEach(function (l, i) { x.fillText(l, cx, y + i * lh); });
    return y + lines.length * lh;
  }

  function makePoster(r, score, rel) {
    var W = 750, H = 1000, dpr = 2;
    var c = document.createElement('canvas');
    c.width = W * dpr; c.height = H * dpr;
    var x = c.getContext('2d');
    x.scale(dpr, dpr);
    x.fillStyle = '#F7F2E9'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#DCCBA6'; x.lineWidth = 3; x.strokeRect(26, 26, W - 52, H - 52);
    x.textAlign = 'center';
    x.fillStyle = '#7A6A52';
    x.font = '600 24px "Songti SC","SimSun",serif';
    x.fillText('协 纪 黄 历', W / 2, 92);
    x.fillStyle = '#2B2620';
    x.font = '600 40px "Songti SC","SimSun",serif';
    x.fillText(r.dayGZText + '日', W / 2, 160);
    x.font = '22px sans-serif';
    x.fillStyle = '#7A6A52';
    x.fillText(S.y + '年' + S.m + '月' + S.d + '日 · ' + lunarText(r), W / 2, 196);

    var trad = GRADE_SCORE[r.gradeName] || 70;

    /* 传统分 */
    x.fillStyle = '#8C1620';
    x.font = '600 88px "Songti SC","SimSun",serif';
    x.fillText(String(trad), W / 2 - 110, 340);
    x.font = '24px sans-serif';
    x.fillStyle = '#7A6A52';
    x.fillText('传统黄历', W / 2 - 110, 376);
    x.font = '20px sans-serif';
    x.fillText(r.gradeName + ' · ' + r.levelText, W / 2 - 110, 404);

    /* 个人分 */
    x.fillStyle = score < 40 ? '#4A4239' : '#B3202A';
    x.font = '600 88px "Songti SC","SimSun",serif';
    x.fillText(String(score), W / 2 + 110, 340);
    x.font = '24px sans-serif';
    x.fillStyle = '#7A6A52';
    x.fillText('你的分数', W / 2 + 110, 376);
    x.font = '20px sans-serif';
    x.fillText(S.favNow ? ('喜' + S.favNow.map(function (w) { return E.WX_NAME[w]; }).join('')) : '未设喜忌', W / 2 + 110, 404);

    x.strokeStyle = '#DCCBA6'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(90, 450); x.lineTo(W - 90, 450); x.stroke();

    /* 结论 */
    var diff = trad - score;
    var harsh2 = rel ? rel.list.filter(function (t) { return t.type === '冲' || t.type === '刑' || t.type === '天克地冲' || t.type === '自刑'; }) : [];
    var head, sub;
    if (harsh2.length) { head = '今天在冲你的命局'; sub = '传统评分再高，也该避开'; }
    else if (diff >= 25) { head = '大家都在抢的吉日'; sub = '其实不太适合你'; }
    else if (diff <= -15) { head = '别人眼里平常的一天'; sub = '对你却有不少助力'; }
    else { head = '传统与你的看法'; sub = '大体一致'; }

    x.fillStyle = '#2B2620';
    x.font = '600 38px "Songti SC","SimSun",serif';
    x.fillText(head, W / 2, 520);
    x.fillText(sub, W / 2, 578);

    /* 原因 */
    var reasons = [];
    if (rel) rel.list.forEach(function (t) {
      if (t.type === '冲' || t.type === '刑' || t.type === '天克地冲' || t.type === '自刑') reasons.push(t.text);
    });
    if (S.favNow) {
      var ganWx = Math.floor((r.dayGZ % 10) / 2) % 5;
      var zhiWx = E.ZHI_WX[r.dayZhi];
      var tg = [];
      if (S.favNow.indexOf(ganWx) >= 0) tg.push('日干' + E.WX_NAME[ganWx] + '为你所喜');
      else if (S.unfNow && S.unfNow.indexOf(ganWx) >= 0) tg.push('日干' + E.WX_NAME[ganWx] + '为你所忌');
      if (S.favNow.indexOf(zhiWx) >= 0) tg.push('日支' + E.WX_NAME[zhiWx] + '为你所喜');
      else if (S.unfNow && S.unfNow.indexOf(zhiWx) >= 0) tg.push('日支' + E.WX_NAME[zhiWx] + '为你所忌');
      if (tg.length) reasons.push(tg.join('，'));
    }
    if (!reasons.length) reasons.push('与命局无冲刑，五行不违喜忌');

    x.font = '26px sans-serif';
    x.fillStyle = '#4A4239';
    var yy = 672;
    x.fillStyle = '#A2968A';
    x.font = '20px sans-serif';
    x.fillText('为什么', W / 2, 640);
    x.font = '26px sans-serif';
    x.fillStyle = '#4A4239';
    reasons.slice(0, 3).forEach(function (t) {
      x.fillText('· ' + t, W / 2, yy);
      yy += 46;
    });

    /* 底 */
    x.fillStyle = '#A2968A';
    x.font = '20px sans-serif';
    x.fillText('四柱 ' + (S.bz ? S.bz.yearText + ' ' + S.bz.monthText + ' ' + S.bz.dayText + (S.bz.hourText ? ' ' + S.bz.hourText : '') : ''), W / 2, 900);
    x.fillText('wincard8.github.io/huangli', W / 2, 936);

    return c.toDataURL('image/png');
  }

  /* 事项对应的"得力十神"，用于场景加权（本程序自定口径） */
  var THING_SHISHEN = {
    '结婚': ['正财', '正官', '食神'], '搬家': ['正印', '偏印'], '开业': ['正财', '偏财'],
    '动土': ['偏财', '食神'], '修造': ['正财', '食神'], '安葬': ['正印', '偏印'],
    '破土': ['偏财'], '出行': ['食神', '正官'], '赴任': ['正官', '正印'],
    '求医': ['正印', '偏印'], '入学': ['正印', '偏印'], '祭祀': ['正印'],
    '签约': ['正财', '正官'], '纳财': ['正财', '偏财'], '栽种': ['食神'], '买畜': ['正财']
  };
  /* 十干禄 */
  var LU = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];

  function thingScore(r, th) {
    if (!S.bz || !S.favNow) return null;
    var rel = null;
    try { rel = E.dayRelations(r.dayGZ, r.dayZhi, S.bz); } catch (e) { return null; }
    var sc = E.scoreOf(r.dayGZ, r.dayZhi, S.favNow, S.unfNow || [], S.th);
    rel.list.forEach(function (x) {
      if (x.type === '天克地冲') sc -= 30;
      else if (x.type === '冲' && x.pillar === '日') sc -= 25;
      else if (x.type === '冲') sc -= 12;
      else if (x.type === '刑' || x.type === '自刑') sc -= 8;
    });
    var want = THING_SHISHEN[th.t] || [];
    if (want.indexOf(rel.shiShen) >= 0) sc += 8;
    if (r.dayZhi === LU[S.bz.dayMaster]) sc += 6;
    return Math.max(0, Math.min(100, Math.round(sc)));
  }

  /* ---------------- 五行体质测试（趣味口径） ---------------- */
  var QUIZ = [
    { q: '你更怕冷还是怕热？', a: [['怕冷', 1, 2], ['怕热', 4, 2], ['都不明显', 2, 1]] },
    { q: '做事节奏更接近？', a: [['急躁，说干就干', 1, 2], ['慢条斯理', 4, 2], ['不急不缓', 2, 1]] },
    { q: '情绪上更容易？', a: [['易怒、上头', 0, 2], ['易焦虑、多思', 3, 2], ['情绪平稳', 2, 1]] },
    { q: '体型偏哪一类？', a: [['偏瘦偏高', 0, 2], ['偏壮结实', 3, 2], ['圆润易胖', 4, 2]] },
    { q: '睡眠状况？', a: [['入睡难、易醒', 1, 2], ['睡得沉、起不来', 4, 2], ['一般', 3, 1]] },
    { q: '口味偏好？', a: [['嗜辣', 1, 2], ['嗜酸', 0, 2], ['嗜甜', 2, 2], ['嗜咸', 4, 2], ['清淡', 3, 1]] }
  ];

  function quizResult() {
    var sc = [0, 0, 0, 0, 0];
    (S.quiz || []).forEach(function (ai, qi) {
      if (ai === null || ai === undefined) return;
      var a = QUIZ[qi] && QUIZ[qi].a[ai];
      if (a) sc[a[1]] += a[2];
    });
    var order = [0, 1, 2, 3, 4].sort(function (x, y) { return sc[y] - sc[x]; });
    return { sc: sc, fav: order.slice(0, 2), unf: order.slice(3) };
  }

  /* 调候用神（穷通宝鉴）：返回主用/次用的五行序号 */
  var MONTH_ORD = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  function tiaohouOf(bz) {
    var Q = window.XiejiQiongtong || {};
    if (!bz) return null;
    var mi = (bz.month.z - 2 + 12) % 12;
    var cell = Q[GAN[bz.dayMaster] + '|' + MONTH_ORD[mi]];
    if (!cell) return null;
    var wxOf = function (g) { return [0, 0, 1, 1, 2, 2, 3, 3, 4, 4][GAN.indexOf(g)]; };
    var use = cell.use || [];
    return {
      main: use.length ? wxOf(use[0]) : null,
      second: use.length > 1 ? wxOf(use[1]) : null,
      gans: use, cell: cell
    };
  }

  /* 时辰的个人化：用日主喜忌＋长生＋冲刑给每个时辰打分 */
  function hourPersonal(h) {
    if (!S.bz || !S.favNow) return null;
    var sc = E.yunScore(h.stem, h.branch, S.bz, S.favNow, S.unfNow || []);
    var harm = [];
    try {
      var rel = E.dayRelations(h.stem, h.branch, S.bz);
      rel.list.forEach(function (x) {
        if (x.type === '冲' || x.type === '天克地冲' || x.type === '刑' || x.type === '自刑') harm.push(x.text);
      });
    } catch (e) { }
    return { sc: sc.score, cs: sc.stage, harm: harm };
  }

  function modern(list) {
    var out = [], seen = {};
    list.forEach(function (t) {
      var m = MODERN[t] || t;
      if (!seen[m]) { seen[m] = 1; out.push({ m: m, t: t }); }
    });
    return out;
  }

  /* 依等第政策把「宜」「忌」「两见」拆开：政策落在"显示词"这一层，
     避免 修宫室/缮城郭 同译作"修造"这类一词多源造成的假重合 */
  function displayLists(r) {
    var yi = modern(r.yi).sort(sortCommon);
    var ji = modern(r.ji).sort(sortCommon);
    var jiLabel = {}, yiLabel = {};
    ji.forEach(function (x) { jiLabel[x.m] = 1; });
    yi.forEach(function (x) { yiLabel[x.m] = 1; });

    var both = yi.filter(function (x) { return jiLabel[x.m]; });
    var bothCount = both.length;
    var pol = r.policy;

    if (pol === 'yi') {
      /* 上等：从宜不从忌，忌中剔除与宜相重者 */
      ji = ji.filter(function (x) { return !yiLabel[x.m]; });
    } else {
      /* 上次「不遇」、中次「遇德」等"从宜亦从忌"者，以及从忌不从宜：
         一律只列于忌，宜中不再重复 */
      yi = yi.filter(function (x) { return !jiLabel[x.m]; });
    }
    both = [];
    return { yi: yi, ji: ji, both: both, bothCount: bothCount };
  }

  function renderList(items) {
    if (!items.length) return '<span class="mini">—</span>';
    return items.map(function (x) {
      return '<span title="协纪原文：' + esc(x.t) + '">' + esc(x.m) + '</span>';
    }).join('');
  }
  var COMMON = ['嫁娶', '开市', '般移', '求医', '入学', '裁制', '安床', '祭祀', '祈福', '求嗣', '立券', '交易',
    '纳财', '解除', '扫舍', '沐浴', '行幸', '安葬', '破土', '兴造', '栽种', '纳畜', '入宅'];
  function sortCommon(a, b) {
    var ia = COMMON.indexOf(a.t), ib = COMMON.indexOf(b.t);
    if (ia < 0) ia = 99;
    if (ib < 0) ib = 99;
    return ia - ib;
  }
  function yiHtml(r, max) {
    var arr = modern(r.yi).sort(sortCommon);
    if (!arr.length) return '<span style="color:#A2968A">诸事不宜</span>';
    return arr.map(function (x) { return '<span title="协纪原文：' + esc(x.t) + '">' + esc(x.m) + '</span>'; }).join('');
  }
  function jiHtml(r, max) {
    var arr = modern(r.ji).sort(sortCommon);
    if (!arr.length) return '<span style="color:#A2968A">无忌</span>';
    return arr.map(function (x) { return '<span title="协纪原文：' + esc(x.t) + '">' + esc(x.m) + '</span>'; }).join('');
  }

  /* ---------------- .ics 导出 ---------------- */
  var ENC = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;
  function bytesOf(ch) { return ENC ? ENC.encode(ch).length : (ch.charCodeAt(0) > 127 ? 3 : 1); }
  function icsEsc(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }
  function icsFold(line) {
    var out = [], cur = '', b = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i), n = bytesOf(ch);
      if (b + n > 73) { out.push(cur); cur = ' '; b = 1; }
      cur += ch; b += n;
    }
    out.push(cur);
    return out.join('\r\n');
  }
  function ymd(jdn) {
    var g = E.jdnToGregorian(jdn);
    return g.year + pad(g.month) + pad(g.day);
  }
  function buildICS(days) {
    var t = new Date();
    var stamp = t.getUTCFullYear() + pad(t.getUTCMonth() + 1) + pad(t.getUTCDate()) + 'T' +
      pad(t.getUTCHours()) + pad(t.getUTCMinutes()) + pad(t.getUTCSeconds()) + 'Z';
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Xieji Huangli//CN', 'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH', 'X-WR-CALNAME:协纪黄历', 'X-WR-TIMEZONE:Asia/Shanghai'];
    var base = E.gregorianToJDN(S.y, S.m, S.d);
    for (var i = 0; i < days; i++) {
      var jdn = base + i, g = E.jdnToGregorian(jdn), r;
      try { r = E.computeDay(g.year, g.month, g.day); } catch (e) { continue; }
      var yi = modern(r.yi).sort(sortCommon).map(function (x) { return x.m; });
      var ji = modern(r.ji).sort(sortCommon).map(function (x) { return x.m; });
      var sum = lunarText(r) + (yi.length ? ' 宜' + yi.slice(0, 3).join('·') : '') + (ji.length ? ' 忌' + ji.slice(0, 2).join('·') : '');
      var desc = [
        yi.length ? '宜：' + yi.join(' ') : '宜：诸事不宜',
        ji.length ? '忌：' + ji.join(' ') : '忌：无忌',
        '建除：' + r.jianchuName + ' · ' + r.levelText,
        '干支：' + r.yearGZText + '年 ' + r.monthGZText + '月 ' + r.dayGZText + '日',
        '神煞：' + r.shensha.map(function (s) { return s.name; }).join('、'),
        '依《钦定协纪辨方书》卷十「宜忌」'
      ].join('\n');
      L.push('BEGIN:VEVENT', 'UID:' + ymd(jdn) + '@xieji-huangli', 'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + ymd(jdn), 'DTEND;VALUE=DATE:' + ymd(jdn + 1),
        icsFold('SUMMARY:' + icsEsc(sum)), icsFold('DESCRIPTION:' + icsEsc(desc)),
        'TRANSP:TRANSPARENT', 'CATEGORIES:黄历', 'END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return L.join('\r\n') + '\r\n';
  }
  var VTIMEZONE = ['BEGIN:VTIMEZONE', 'TZID:Asia/Shanghai', 'BEGIN:STANDARD', 'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0800', 'TZOFFSETTO:+0800', 'TZNAME:CST', 'END:STANDARD', 'END:VTIMEZONE'];
  function icsTime(jdn, hh) { return ymd(jdn) + 'T' + pad(hh) + '0000'; }

  function buildHoursICS(days, mode) {
    var t = new Date();
    var stamp = t.getUTCFullYear() + pad(t.getUTCMonth() + 1) + pad(t.getUTCDate()) + 'T' +
      pad(t.getUTCHours()) + pad(t.getUTCMinutes()) + pad(t.getUTCSeconds()) + 'Z';
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Xieji Huangli//CN', 'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH', 'X-WR-CALNAME:协纪时辰', 'X-WR-TIMEZONE:Asia/Shanghai',
      'X-WR-CALDESC:十二时辰吉凶与宜忌（定时事件）'].concat(VTIMEZONE);
    var base = E.gregorianToJDN(S.y, S.m, S.d), count = 0;
    for (var i = 0; i < days; i++) {
      var jdn = base + i, g = E.jdnToGregorian(jdn), r;
      try { r = E.computeDay(g.year, g.month, g.day); } catch (e) { continue; }
      var list = r.hours.filter(function (h) {
        return mode === 'all' || (mode === 'good' ? h.good === '吉' : h.good !== '吉');
      }).map(function (h) { return { h: h, startH: (2 * h.branch + 23) % 24 }; })
        .sort(function (a, b) { return a.startH - b.startH; });
      list.forEach(function (it) {
        var h = it.h, startH = it.startH;
        var endJdn = startH === 23 ? jdn + 1 : jdn;
        var endH = (startH + 2) % 24;
        var yi = modern(h.yi).sort(sortCommon).map(function (x) { return x.m; });
        var ji = modern(h.ji).sort(sortCommon).map(function (x) { return x.m; });
        var head = yi.slice(0, 2).join('·');
        var sum = h.gz + '时 ' + h.good + ' ' + h.shen + (head ? ' 宜' + head : '');
        var desc = [
          '值神：' + h.shen + (h.godGood ? '（黄道）' : '（黑道）'),
          '冲' + h.chongName + ' · 煞' + h.sha + (h.marks.length ? ' · ' + h.marks.join('·') : ''),
          yi.length ? '宜：' + yi.join(' ') : '宜：诸事不宜（日破时）',
          ji.length ? '时忌：' + ji.join(' ') : '时忌：无',
          r.ji.length ? '日忌（前八项）：' + modern(r.ji).sort(sortCommon).slice(0, 8).map(function (x) { return x.m; }).join(' ') + ' …' : '日忌：无',
          '建除：' + r.jianchuName + ' · ' + r.levelText + ' · ' + r.dayGZText + '日',
          '依《钦定协纪辨方书》卷十「宜忌」'
        ].join('\n');
        L.push('BEGIN:VEVENT', 'UID:' + ymd(jdn) + 'T' + pad(startH) + '-' + h.branch + '@xieji-shichen',
          'DTSTAMP:' + stamp,
          'DTSTART;TZID=Asia/Shanghai:' + icsTime(jdn, startH),
          'DTEND;TZID=Asia/Shanghai:' + icsTime(endJdn, endH),
          icsFold('SUMMARY:' + icsEsc(sum)), icsFold('DESCRIPTION:' + icsEsc(desc)),
          'TRANSP:TRANSPARENT', 'CATEGORIES:时辰', 'END:VEVENT');
        count++;
      });
    }
    L.push('END:VCALENDAR');
    return { text: L.join('\r\n') + '\r\n', count: count };
  }

  function downloadBlob(text, name) {
    var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }

  function downloadICS() {
    downloadBlob(buildICS(365), 'xieji-huangli.ics');
  }
  function downloadHoursICS() {
    var r = buildHoursICS(14, 'all');
    downloadBlob(r.text, 'xieji-shichen.ics');
  }

  /* ---------------- 视图 ---------------- */
  function baziHtml(r, rel) {
    var b = S.bz;
    var cols = [['年', b.yearText], ['月', b.monthText], ['日', b.dayText], ['时', b.hourText || '—']];
    var grid = cols.map(function (c) {
      return '<div><span class="mini">' + c[0] + '柱</span><b class="serif">' + esc(c[1]) + '</b></div>';
    }).join('');
    var wx = S.wx;
    var rows = '';
    if (wx) {
      rows += '<div class="dress-txt" style="margin-top:10px">日主 <b>' + GAN[b.dayMaster] + '</b>（' +
        esc(wx.strengthText) + '·支持 ' + Math.round(wx.ratio * 100) + '%' +
        '·' + (wx.deLing ? '得令' : '失令') + '·得地' + wx.deDi + '·得势' + wx.deShi + '）；今日' +
        esc(r.dayGZText) + '日，为你的「<b>' + rel.shiShen + '</b>」。<span class="mini">' +
        esc(SHISHEN_TXT[rel.shiShen] || '') + '</span></div>';
      var _gj = E.geJu(b);
      var _st = E.geJuStatus(b, _gj);
      rows += '<div class="dress-txt">格局：<b>' + esc(_gj.name) + '</b>（月令' + esc(ZHI[_gj.zhi]) + '·' +
        (_gj.by === '月令临官' ? '临官' : _gj.by === '月令帝旺' ? '帝旺' : _gj.by + esc(E.GAN[_gj.gan])) + '）· <b>' +
        esc(_st.verdict) + '格</b>' +
        (_st.reasons.length ? '　<span class="mini">' + esc(_st.reasons.join('；')) + '</span>' : '') + '</div>';
      if (_st.bing) {
        var OFF = { '比肩': 0, '劫财': 0, '食神': 1, '伤官': 1, '偏财': 2, '正财': 2, '七杀': 3, '正官': 3, '偏印': 4, '正印': 4 };
        var meWx = Math.floor(b.dayMaster / 2) % 5;
        var yaoWx = (meWx + (OFF[_st.yao] || 0)) % 5;
        var inFav = S.favNow && S.favNow.indexOf(yaoWx) >= 0;
        rows += '<div class="dress-txt">病药：病＝' + esc(_st.bing) + '，药＝<b>' + esc(_st.yao) + '</b>' +
          '（' + esc(_st.yaoBy) + '·' + esc(E.WX_NAME[yaoWx]) + '）' +
          '　<span class="mini">' + (inFav ? '药在喜用，可解' : '药不在喜用，需岁运补') + '</span></div>';
      }
      rows += '<div class="dress-txt">六亲：' + E.liuQin(b, S.bMale).map(function (x) {
        return esc(x.role) + '·' + esc(x.shi) + '（' + esc(x.status) + (x.stage ? '·' + esc(x.stage) : '') + '）';
      }).join('　') + '</div>';
      rows += '<div class="dress-txt">日主坐' + esc(ZHI[b.day.z]) + '（' + esc(E.changSheng(b.dayMaster, b.day.z)) + '）</div>';
      (function () {
        var _y = E.yongShen(_gj);
        if (!_y) return;
        rows += '<div class="dress-txt">用神：<b>' + esc(_y.shi) + '</b>　<span class="mini">' +
          esc(_y.by) + '（相神说，仅供参照，未改算法）</span></div>';
      })();
      rows += '<div class="mini" style="margin-top:2px">十神据《三命通会》卷五；旺衰取卷二「要以中和為貴」；取格据《渊海子平》「月支取格，乃分贵贱」；成败据《看命口诀》「逢官看财，逢煞看印，逢印看官」；六亲据论父/论母/论妻妾/论子息。</div>';
      rows += '<div class="dress-txt">五行：' + E.WX_NAME.map(function (n, i) {
        return n + wx.counts[i];
      }).join(' ') + '</div>';
      rows += '<div class="favor"><span class="mini">喜</span>' + favChips(S.favNow) +
        '<span class="mini" style="margin-left:8px">忌</span>' + favChips(S.unfNow) +
        '<button class="chip" data-act="sheet:favor" style="margin-left:8px">调整</button></div>';
      if (S.favManual) rows += '<div class="mini" style="margin-top:6px">喜忌为手动设定；<span style="color:var(--red)" data-act="favreset">恢复自动</span></div>';
      /* 调候（穷通宝鉴） */
      (function () {
        var Q = window.XiejiQiongtong || {};
        var MON = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
        var mi = (b.month.z - 2 + 12) % 12;   // 寅=正月
        var cell = Q[GAN[b.dayMaster] + '|' + MON[mi]];
        if (!cell) return;
        rows += '<div class="hr" style="margin:12px 0 8px"></div>' +
          '<div class="dress-txt"><b>调候</b>（穷通宝鉴·' + esc(cell.sec) + '）' +
          (cell.use && cell.use.length ? '　原文主用：<b>' + cell.use.map(function (g) {
            return g + '（' + E.WX_NAME[[0, 0, 1, 1, 2, 2, 3, 3, 4, 4][GAN.indexOf(g)]] + '）';
          }).join('、') + '</b>' : '') +
          (cell.exact ? '' : '　<span class="mini">（此月无专条，取季论）</span>') +
          '　<span class="mini">仅作当值加权，不改写喜忌</span>' +
          (S.thConf && S.thConf.length ? '　<span class="mini" style="color:var(--red)">与旺衰相左（' +
            S.thConf.map(function (w) { return E.WX_NAME[w]; }).join('、') + '为所忌），宜参酌</span>' : '') +
          '</div>' +
          '<div class="quote" style="margin-top:6px">' + esc(cell.text.slice(0, 120)) + '…</div>';
      })();
    }
    rows += rel.list.length
      ? '<div class="dress-txt">与命局：' + rel.list.map(function (x) { return esc(x.text); }).join('、') + '</div>'
      : '<div class="dress-txt">与命局无冲、无刑、无合、无害。</div>';
    if (rel.kongHit.length) {
      rows += '<div class="dress-txt">今日旬空 ' + rel.kong.map(function (z) { return ZHI[z]; }).join('') +
        '，落你的' + rel.kongHit.join('、') + '柱。</div>';
    }
    rows += '<button class="btn ghost" data-act="poster" style="margin-top:10px">生成对比海报</button>';
    /* 大运与流年 */
    var gs = birthSolar();
    if (gs) {
      try {
        var dy = E.daYun(gs.year, gs.month, gs.day, S.bMale, 8);
        var age = S.y - gs.year;
        var cur = dy.list.filter(function (d2) { return age >= d2.from && age < d2.to; })[0] || dy.list[0];
        var ln = E.liuNian(S.y);
        var curSc = E.yunScore(cur.gan, cur.zhi, S.bz, S.favNow || [], S.unfNow || []);
        var lnSc = E.yunScore(ln.gan, ln.zhi, S.bz, S.favNow || [], S.unfNow || []);
        rows += '<div class="hr" style="margin:12px 0 8px"></div>' +
          '<div class="dress-txt">' + dy.startAge.toFixed(1) + ' 岁起运（' + (dy.forward ? '顺' : '逆') + '行）' +
          '　当前大运 <b>' + esc(cur.text) + '</b>（' + cur.from + '–' + cur.to + ' 岁 · ' + curSc.score + ' 分 · ' + esc(curSc.stage) + '）' +
          '　流年 <b>' + esc(ln.text) + '</b>（' + lnSc.score + ' 分 · ' + esc(lnSc.stage) + '）</div>' +
          (function () {
            var d2 = E.dayRelations(cur.gan, cur.zhi, S.bz);
            var rel = d2.list.filter(function (x) { return x.type === '冲' || x.type === '刑' || x.type === '天克地冲'; });
            return '<div class="dress-txt mini">大运看地支：' + ZHI[cur.zhi] + '（' + E.WX_NAME[E.ZHI_WX[cur.zhi]] + '）' +
              (rel.length ? '，冲刑命局：' + rel.map(function (x) { return x.text; }).join('、') : '，与命局无冲刑') +
              '；运干为你的「' + E.shiShen(S.bz.dayMaster, cur.gan) + '」</div>';
          })() +
          '<div class="dress-txt mini">大运：' + dy.list.map(function (d2) {
            var r2 = E.yunScore(d2.gan, d2.zhi, S.bz, S.favNow || [], S.unfNow || []);
            return esc(d2.text) + r2.score;
          }).join(' ') + '</div>' +
          '<div class="dress-txt mini">' + S.y + ' 流月：' + E.liuYue(S.y).map(function (m2) {
            var r3 = E.yunScore(m2.gan, m2.zhi, S.bz, S.favNow || [], S.unfNow || []);
            return m2.month + '月' + esc(m2.text) + r3.score;
          }).join(' ') + '</div>' +
          (function () {
            var bs = birthSolar();
            if (!bs) return '';
            var age = S.y - bs.year + 1;
            var xy = E.xiaoYun(age, S.bMale);
            var xs = E.yunScore(xy.gan, xy.zhi, S.bz, S.favNow || [], S.unfNow || []);
            return '<div class="dress-txt mini">小运：' + esc(xy.text) + '（' + S.y + ' 年虚岁 ' + age +
              ' · ' + xs.score + ' 分 · ' + esc(xs.stage) + '）</div>';
          })();
      } catch (e) { }
    }
    return '<div class="bazi">' + grid + '</div>' + rows;
  }

  function favChips(arr) {
    if (!arr || !arr.length) return '<span class="mini">—</span>';
    return arr.map(function (w) { return '<b class="wx w' + w + '">' + E.WX_NAME[w] + '</b>'; }).join('');
  }

  function viewHome(r) {
    var tags = [];
    var rel = null;
    if (S.bz) { try { rel = E.dayRelations(r.dayGZ, r.dayZhi, S.bz); } catch (e) { rel = null; } }
    var score = null;
    if (S.favNow) {
      score = E.scoreOf(r.dayGZ, r.dayZhi, S.favNow, S.unfNow || [], S.th);
      if (rel) rel.list.forEach(function (x) {
        if (x.type === '天克地冲') score -= 30;
        else if (x.type === '冲' && x.pillar === '日') score -= 25;
        else if (x.type === '冲') score -= 12;
        else if (x.type === '刑' || x.type === '自刑') score -= 8;
      });
      score = Math.max(0, Math.min(100, score));
    }
    S.scoreS = score; S.relNow = rel;
    if (isToday()) tags.push('<span class="tag red">今天</span>');
    tags.push('<span class="tag">农历' + esc(r.yearGZText) + '年</span>');
    tags.push('<span class="tag">' + esc(r.jianchuName) + '</span>');
    tags.push('<span class="tag' + (r.level >= 2 ? ' warn' : '') + '">' + esc(r.gradeName) + '·' + esc(r.levelText) + '</span>');
    if (score !== null) {
      tags.push('<span class="tag' + (score < 40 ? ' warn' : '') + '">对你 ' + score + ' 分</span>');
    }
    r.shensha.forEach(function (s) {
      if (s.kind === '吉') tags.push('<span class="tag tap" data-act="yili:' + encodeURIComponent(s.name) + '">' + esc(s.name) + '</span>');
    });
    r.shensha.forEach(function (s) {
      if (s.kind === '大凶') tags.push('<span class="tag warn tap" data-act="yili:' + encodeURIComponent(s.name) + '">' + esc(s.name) + '</span>');
      else if (s.kind === '凶') tags.push('<span class="tag warn tap" data-act="yili:' + encodeURIComponent(s.name) + '">' + esc(s.name) + '</span>');
    });

    var idx = isToday() ? Math.floor((new Date().getHours() + 1) / 2) % 12 : 0;
    var ts = r.hours[idx];

    var note = [];
    var D = displayLists(r);
    if (r.policy === 'none') note.push('本日等第「' + r.gradeName + '」，' + r.heavy.join('、') + '当值，诸事不宜；「止不忌」者只是不忌，不列为宜。');
    if (D.bothCount) note.push('神煞交战：' + D.bothCount + ' 项宜忌两见，依「' + (r.policy === 'both' ? '从宜亦从忌' : '从宜不从忌') + '」只列于忌。');
    if (r.baiji.length) note.push('彭祖百忌（俗忌，不参与判等）：' + esc(r.dayGZText) + '日忌' + r.baiji.join('、') + '。');

    var grid = [
      { ic: '择', t: '择日查询', act: 'tab:zeri' },
      { ic: '时', t: '十二时辰', act: 'sheet:ts' },
      { ic: '衣', t: '五行穿衣', act: 'sheet:dress' },
      { ic: '文', t: '协纪原文', act: 'tab:quotes' },
      { ic: '历', t: '老黄历', act: 'tab:detail' },
      { ic: '月', t: '月历', act: 'sheet:cal' },
      { ic: '知', t: '算法说明', act: 'tab:mine' },
      { ic: '自', t: '历法自检', act: 'tab:mine' }
    ].map(function (g, i) {
      return '<div class="gitem" data-act="' + g.act + '">' +
        '<div class="gicon serif' + (i < 4 ? ' filled' : '') + '">' + g.ic + '</div><div>' + g.t + '</div></div>';
    }).join('');

    var harsh = rel ? rel.list.filter(function (x) {
      return x.type === '冲' || x.type === '天克地冲' || x.type === '刑' || x.type === '自刑';
    }) : [];
    var clash = (S.zodiac !== null && S.zodiac !== undefined && r.dayZhi === (S.zodiac + 6) % 12);
    var alertHtml = '';
    if (harsh.length) {
      alertHtml = '<div class="alert">今日' + esc(r.dayGZText) + '日，与你的命局：' +
        harsh.map(function (x) { return esc(x.text); }).join('、') + '。遇冲刑之日，大事宜避。</div>';
    } else if (clash) {
      alertHtml = '<div class="alert">今日冲' + esc(ANIMALS[(r.dayZhi + 6) % 12]) + '（你的生肖），大事宜避；冲煞之日，只宜小事。</div>';
    }

    return '<div class="wrap">' +
      '<div class="datebar"><span>' + S.y + '年' + S.m + '月' + S.d + '日</span>' +
      '<span class="pick" data-act="sheet:birth">选择生日<span class="caret"></span></span>' +
      '<span class="pick" data-act="sheet:cal">选择日期<span class="caret"></span></span></div>' +

      '<div class="hero"><div class="hero-top">' +
      '<button class="arrow" data-act="prev">‹</button>' +
      '<div class="lunar-big serif' + (lunarText(r).length >= 5 ? ' sm' : '') + '" data-act="sheet:cal">' + lunarText(r) + '</div>' +
      '<button class="arrow" data-act="next">›</button></div>' +
      '<div class="gz-line">' + esc(r.yearGZText) + '年<span class="sep">·</span>' + esc(r.monthGZText) +
      '月<span class="sep">·</span>' + esc(r.dayGZText) + '日<span class="sep">·</span>星期' + esc(r.week) + '</div>' +
      '<div class="tags">' + tags.join('') + '</div></div>' +
      alertHtml +
      '<div class="yiji">' +
      '<div class="yiji-row"><div class="mark yi">宜</div><div class="yiji-txt">' + renderList(D.yi) + '</div></div>' +
      '<div class="yiji-row"><div class="mark ji">忌</div><div class="yiji-txt">' + renderList(D.ji) + '</div></div>' +
      (note.length ? '<div class="xj-note">' + note.join('') + '</div>' : '') +
      '</div>' +

      (S.bz ? '<div class="card"><div class="card-hd"><div class="card-title">命局与今日</div>' +
        '<div class="card-more">' + esc(S.bz.yearText + ' ' + S.bz.monthText + ' ' + S.bz.dayText + (S.bz.hourText ? ' ' + S.bz.hourText : '')) +
        '</div></div><div class="card-body" style="padding-top:6px">' + baziHtml(r, rel) + '</div></div>' : '') +
      '<div class="grid8">' + grid + '</div>' +
      '<div class="card"><div class="card-hd"><div class="card-title">每时必看</div>' +
      '<div class="card-more" data-act="sheet:ts">全部时辰 ›</div></div>' +
      '<div class="card-body">' +
      '<div class="shichen-now"><div class="sc-name serif">' + esc(ts.gz) + '时</div>' +
      '<div class="sc-time">' + esc(ts.range) + '</div>' +
      '<div class="luck-badge' + (ts.good === '吉' ? '' : ' xiong') + '">' + esc(ts.good) + '</div></div>' +
      '<div class="tri">' +
      '<div class="tri-cell"><div class="tri-v ' + (ts.good === '吉' ? 'good' : '') + '">' + esc(ts.good) + '</div><div class="tri-l">时辰吉凶</div></div>' +
      '<div class="tri-cell"><div class="tri-v">冲' + esc(ts.chongName) + '</div><div class="tri-l">煞' + esc(ts.sha) + '</div></div>' +
      '<div class="tri-cell"><div class="tri-v">' + ORGAN[ts.branch] + '</div><div class="tri-l">当令脏腑</div></div>' +
      '</div>' +
      (function () {
        var hp = hourPersonal(ts);
        if (!hp) return '';
        return '<div class="mini" style="margin-top:8px">对你 <b>' + hp.sc + '</b> 分（' + esc(hp.cs) + '）' +
          (hp.harm.length ? '　<span style="color:#B3202A">慎：' + hp.harm.join('、') + '</span>' : '') + '</div>';
      })() +
      '<div class="pos-row">' +
      '<div><div class="pos-v serif">' + esc(ts.shen) + '</div><div class="tri-l">值神</div></div>' +
      '<div><div class="pos-v serif">' + esc(ts.marks.length ? ts.marks.join('·') : '—') + '</div><div class="tri-l">时家吉神</div></div>' +
      '<div><div class="pos-v serif">' + esc(ts.isKong ? '空亡' : '不空') + '</div><div class="tri-l">旬空</div></div>' +
      '</div>' +
      '<div class="chips">' + ts.yi.map(function (w) {
        return '<span class="chip">' + esc(MODERN[w] || w) + '</span>';
      }).join('') + '</div>' +
      '</div></div>' +

      '<div class="card"><div class="card-hd"><div class="card-title">今日宜穿</div>' +
      '<div class="card-more" data-act="sheet:dress">更多 ›</div></div>' +
      '<div class="card-body">' + dressHtml(r, true) + '</div></div>' +

      '<div class="card"><div class="card-hd"><div class="card-title">卷十原文</div>' +
      '<div class="card-more" data-act="tab:quotes">全部 ›</div></div>' +
      '<div class="card-body"><div class="quote">' + esc(r.shensha[0] ? (r.shensha[0].cite || '').slice(0, 96) : '') + '…</div>' +
      '<div class="note">每条宜忌都能追到卷十原文，点"全部"看本日各神煞的出处。</div></div></div>' +

      '<div class="note">黄历属传统民俗资料，《协纪》御制序自言"如曰如是则吉，如是则凶……则明者所弗道也"。仅供参考。</div>' +
      '</div>';
  }

  function dressHtml(r, brief) {
    var w = r.wx, mu = shengWo(w), self = w, child = SHENG[w], ke = keWo(w);
    var text = '今日纳音「' + r.nayin + '」，' + w + '气当令。' +
      '穿' + mu + '色系（' + WX_WORDS[mu] + '）为贵人色，' + mu + '生' + w + '，得人相助；' +
      '同气' + w + '色（' + WX_WORDS[w] + '）为幸运色；' +
      w + '生' + child + '，' + child + '色（' + WX_WORDS[child] + '）为消耗色；' +
      ke + '克' + w + '，' + ke + '色（' + WX_WORDS[ke] + '）为慎用色。';
    var sw = [mu, self, child, ke].map(function (x, i) {
      var tones = WX_SWATCH[x];
      return '<div class="sw-wrap"><div class="sw" style="background:' + tones[1] + '"></div>' +
        '<span>' + ['贵人', '幸运', '消耗', '慎用'][i] + ' · ' + WX_WORDS[x] + '</span></div>';
    }).join('');
    return '<div class="dress-head"><div class="dress-name serif">' + WX_WORDS[mu] + '系</div>' +
      '<div class="luck-badge">贵人色</div></div>' +
      '<div class="dress-swatches">' + sw + '</div>' +
      (brief ? '<div class="dress-txt">' + esc(text) + '</div>' : '<div class="dress-txt">' + esc(text) + '</div>' +
        '<div class="dress-sub"><div>纳音 <b>' + esc(r.nayin) + '</b></div><div>日五行 <b>' + w + '</b></div></div>');
  }

  function viewDetail(r) {
    var D2 = displayLists(r);
    var groups = r.jiGroups.map(function (g) {
      return '<div class="ts-row"><div class="ts-gz" style="width:64px;font-size:12px">' + esc(g.name) + '</div>' +
        '<div class="ts-yi" style="white-space:normal">' + g.items.map(function (t) { return esc(MODERN[t] || t); }).join(' ') + '</div></div>';
    }).join('');

    var ss = r.shensha.map(function (s, i) {
      var cls = s.kind === '吉' ? 'j' : 'x';
      return '<div class="ts-row" data-act="quote:' + i + '">' +
        '<div class="ts-gz">' + esc(s.name) + '</div>' +
        '<div class="ts-luck ' + cls + '">' + esc(s.kind) + '</div>' +
        '<div class="ts-yi">宜 ' + s.yi.length + ' · 忌 ' + s.ji.length + '</div>' +
        '<div class="card-more">›</div></div>';
    }).join('');

    var ts = r.hours.map(function (h) {
      return '<div class="ts-row"><div class="ts-gz">' + esc(h.gz) + '</div>' +
        '<div class="ts-time">' + esc(h.range) + '</div>' +
        '<div class="ts-luck ' + (h.good === '吉' ? 'j' : 'x') + '">' + (h.good === '吉' ? '吉' : '凶') + '</div>' +
        '<div class="ts-yi">' + (h.yi.slice(0, 4).map(function (w) { return MODERN[w] || w; }).join(' ') + (h.yi.length > 4 ? '…' : '') || '诸事不宜') + '</div></div>';
    }).join('');

    return '<div class="wrap">' +
      '<div class="datebar"><span>' + S.y + '年' + S.m + '月' + S.d + '日</span><span>' + lunarText(r) + '</span></div>' +
      '<div class="hero"><div class="lunar-big serif sm" style="text-align:center">' + esc(r.dayGZText) + '日</div>' +
      '<div class="gz-line">' + esc(r.yearGZText) + '年<span class="sep">·</span>' + esc(r.monthGZText) + '月<span class="sep">·</span>' + esc(r.jianchuName) +
      '<span class="sep">·</span>' + esc(r.levelText) + '</div>' +
      '<div class="tags"><span class="tag">冲' + esc(r.chong.name) + ' 煞' + esc(r.chong.sha) + '</span>' +
      '<span class="tag">' + esc(r.term.name) + '</span><span class="tag">' + esc(r.nayin) + '</span></div></div>' +

      '<div class="yiji"><div class="yiji-row"><div class="mark yi">宜</div><div class="yiji-txt">' + renderList(D2.yi) + '</div></div>' +
      '<div class="yiji-row"><div class="mark ji">忌</div><div class="yiji-txt">' + renderList(D2.ji) + '</div></div></div>' +

      '<div class="card"><div class="card-hd"><div class="card-title">忌项分类</div><div class="card-more">按类分列</div></div>' +
      '<div class="card-body" style="padding-top:4px">' + (groups || '<div class="empty-tip">无忌</div>') + '</div></div>' +

      '<div class="card"><div class="card-hd"><div class="card-title">当值神煞</div><div class="card-more">' + r.shensha.length + ' 条</div></div>' +
      '<div class="card-body" style="padding-top:4px">' + ss + '</div></div>' +

      '<div class="card"><div class="card-hd"><div class="card-title">十二时辰</div><div class="card-more" data-act="sheet:ts">详情 ›</div></div>' +
      '<div class="card-body" style="padding-top:4px">' + ts + '</div></div>' +
      '</div>';
  }

  function viewQuotes(r) {
    var Q = window.XiejiQuotes || { yili: [], xulun: '', puzhu: '' };
    var items = r.shensha.map(function (s, i) {
      return '<div class="day-row" data-act="quote:' + i + '"><div class="day-info">' +
        '<b>' + esc(s.name) + '</b> <span class="mini">' + esc(s.kind) + '</span>' +
        '<p>' + esc((s.cite || '').slice(0, 54)) + '…</p></div><div class="card-more">›</div></div>';
    }).join('');

    var yili = Q.yili.map(function (x) {
      return '<details class="qitem"><summary>' + esc(x.name) +
        ' <span class="mini">' + esc(x.juan) + '·义例</span></summary>' +
        '<div class="quote">' + esc(x.text) + '</div></details>';
    }).join('');

    return '<div class="wrap">' +
      '<div class="datebar"><span>' + lunarText(r) + ' · ' + esc(r.dayGZText) + '日</span></div>' +

      (Q.xulun ? '<div class="card" style="margin-top:8px"><div class="card-hd"><div class="card-title">卷十·宜忌总论</div>' +
        '<div class="card-more">卷首</div></div><div class="card-body">' +
        '<div class="quote">' + esc(Q.xulun) + '</div></div></div>' : '') +

      '<div class="card"><div class="card-hd"><div class="card-title">今日神煞·卷十条文</div>' +
      '<div class="card-more">共 ' + r.shensha.length + ' 条</div></div>' +
      '<div class="card-body" style="padding-top:4px">' + items + '</div></div>' +

      '<div class="card"><div class="card-hd"><div class="card-title">义例·起例</div>' +
      '<div class="card-more">卷三~八 · ' + Q.yili.length + ' 条</div></div>' +
      '<div class="card-body" style="padding-top:2px">' + yili + '</div></div>' +

      (Q.puzhu ? '<div class="card"><div class="card-hd"><div class="card-title">卷十·铺注条例</div>' +
        '<div class="card-more">选段</div></div><div class="card-body">' +
        '<details class="qitem"><summary>铺注去取之法 <span class="mini">卷十</span></summary>' +
        '<div class="quote">' + esc(Q.puzhu) + '</div></details></div></div>' : '') +

      (function () {
        var M = (window.XiejiMingli || {}).items || [];
        if (!M.length) return '';
        return '<div class="card"><div class="card-hd"><div class="card-title">命理依据</div>' +
          '<div class="card-more">三命通会 · 渊海子平</div></div>' +
          '<div class="card-body" style="padding-top:2px">' +
          M.map(function (x) {
            return '<details class="qitem"><summary>' + esc(x.name) +
              ' <span class="mini">' + esc(x.src) + '·' + esc(x.juan) + '</span></summary>' +
              '<div class="quote">' + esc(x.text) + '</div></details>';
          }).join('') + '</div></div>';
      })() +

      '<div class="note">底本：《钦定协纪辨方书》，清乾隆六年武英殿刻本（四库全书本）。' +
      '全文据 <a href="https://github.com/wincard8/KR3g0051" style="color:inherit">Kanripo 校本</a> 录入，断句标点从之。</div>' +
      '</div>';
  }

  function viewZeri() {
    var th = THINGS[S.thing];
    var monthMode = S.zMode === 'month' && /^\d{4}-\d{2}$/.test(S.zMonth || '');
    var list = monthMode ? findGoodMonth(th, S.zMonth) : findGood(th, S.days);
    var rows = list.length ? list.map(function (x) {
      return '<div class="day-row" data-act="goto:' + x.y + '-' + x.m + '-' + x.d + '">' +
        '<div class="day-d"><b>' + x.d + '</b><span>' + x.m + '月</span></div>' +
        '<div class="day-info"><b>' + x.week + ' · ' + x.gz + '日</b><p>' + x.lunar + ' · ' + x.jc + ' · ' + x.lv + '</p></div>' +
        '<div class="off">' + (x.sc != null ? x.sc + ' 分' : x.lv) + '</div></div>';
    }).join('') : '<div class="empty-tip">' + (monthMode ? '这个月' : '未来 ' + S.days + ' 天内') +
      '没有适合「' + th.t + '」的日子，换个事项、月份或放宽天数。</div>';

    var things = THINGS.map(function (x, i) {
      return '<div class="thing' + (i === S.thing ? ' on' : '') + '" data-act="thing:' + i + '">' + x.t + '</div>';
    }).join('');

    return '<div class="wrap">' +
      '<div class="card" style="margin-top:12px"><div class="card-hd"><div class="card-title">择日</div>' +
      '<div class="card-more">按《协纪》日表</div></div><div class="card-body">' +
      '<div class="thing-grid">' + things + '</div>' +
      '<div class="hr"></div>' +
      '<div class="thing-grid">' + [60, 180, 365].map(function (d) {
        return '<div class="thing' + (!monthMode && S.days === d ? ' on' : '') + '" data-act="days:' + d + '">未来 ' + d + ' 天</div>';
      }).join('') + '</div>' +
      '<div class="hinge" style="margin-top:10px">或查某个月</div>' +
      '<input type="month" id="zmonth" class="dateinput" value="' + (S.zMonth || '') + '"' +
      (monthMode ? ' data-on="1"' : '') + '>' +
      '</div></div>' +
      '<div class="card"><div class="card-hd"><div class="card-title">宜「' + th.t + '」的日子</div>' +
      '<div class="card-more">' + list.length + ' 天</div></div>' +
      '<div class="card-body" style="padding-top:2px">' + rows + '</div></div>' +
      '<div class="note">筛选口径：该日"宜"中含此事项、且"忌"中不含。点一行跳到那天。</div>' +
      '</div>';
  }

  function findGoodMonth(th, ym) {
    var p = ym.split('-').map(Number), y = p[0], m = p[1];
    var start = E.gregorianToJDN(y, m, 1);
    var nm = (m === 12) ? [y + 1, 1] : [y, m + 1];
    var end = E.gregorianToJDN(nm[0], nm[1], 1);
    var out = [];
    for (var j = start; j < end; j++) {
      var g = E.jdnToGregorian(j), r;
      try { r = E.computeDay(g.year, g.month, g.day); } catch (e) { continue; }
      var hit = th.k.filter(function (k) { return r.yi.indexOf(k) >= 0 && r.ji.indexOf(k) < 0; });
      if (!hit.length) continue;
      out.push({
        y: g.year, m: g.month, d: g.day, gz: r.dayGZText, jc: r.jianchuName, lv: r.levelText,
        week: '星期' + r.week, lunar: lunarText(r), n: hit.length, sc: thingScore(r, th)
      });
    }
    return out.sort(function (a, b) {
      if (a.sc != null && b.sc != null && a.sc !== b.sc) return b.sc - a.sc;
      return 0;
    });
  }

  function findGood(th, days) {
    var out = [], base = E.gregorianToJDN(S.y, S.m, S.d);
    for (var i = 0; i < days && out.length < 40; i++) {
      var g = E.jdnToGregorian(base + i);
      var r;
      try { r = E.computeDay(g.year, g.month, g.day); } catch (e) { continue; }
      var hit = th.k.filter(function (k) { return r.yi.indexOf(k) >= 0 && r.ji.indexOf(k) < 0; });
      if (!hit.length) continue;
      out.push({
        y: g.year, m: g.month, d: g.day, gz: r.dayGZText, jc: r.jianchuName, lv: r.levelText,
        week: '星期' + r.week, lunar: lunarText(r), n: hit.length, sc: thingScore(r, th)
      });
    }
    return out.sort(function (a, b) {
      if (a.sc != null && b.sc != null && a.sc !== b.sc) return b.sc - a.sc;
      return 0;
    });
  }

  function viewMine() {
    var st = [
      ['2026-11-02 → 农历九月廿四 · 庚辰日 · 霜降', true],
      ['2026-02-17 → 农历正月初一', true],
      ['2026-10-08 → 寒露', true],
      ['2026-12-22 → 冬至', true],
      ['2023-03-22 → 闰二月初一', true],
      ['2020-05-23 → 闰四月初一', true]
    ].map(function (x) { return '<div class="st"><b>✓</b> ' + x[0] + '</div>'; }).join('');

    return '<div class="wrap">' +
      '<div class="card" style="margin-top:12px"><div class="card-hd"><div class="card-title">我的生肖</div>' +
      '<div class="card-more">用于冲煞提示</div></div><div class="card-body">' +
      '<div class="dress-txt">按<b>农历</b>填生日与时辰，推四柱八字；日支冲、刑你的命局时，首页出现红条。生肖按农历年（春节）定。</div>' +
      '<button class="btn ghost" data-act="sheet:birth">填写生日与时辰</button>' +
      '<button class="btn ghost" data-act="sheet:quiz" style="margin-top:8px">不想填生辰？做个体质测试</button>' +
      '<div class="mini" style="margin-top:8px">当前：' +
      (S.zodiac !== null && S.zodiac !== undefined ? '属' + ANIMALS[S.zodiac] + '（' + ZHI[S.zodiac] + '）' : '未设置') +
      (S.bz ? '　四柱 ' + esc(S.bz.yearText) + ' ' + esc(S.bz.monthText) + ' ' + esc(S.bz.dayText) + (S.bz.hourText ? ' ' + esc(S.bz.hourText) : '') : '') +
      '</div></div></div>' +
      '<div class="card"><div class="card-hd"><div class="card-title">算法与口径</div></div>' +
      '<div class="card-body">' +
      '<div class="dress-txt">宜忌条文出自《钦定协纪辨方书》卷十「宜忌」。建除十二神、月建（土府）、月破（大耗）、月厌、三煞、月刑、月害、大时、天吏、小耗、九空、天德月德、天赦、三合六合，皆按卷十原文与起例推算，每条都可点开看原文。</div>' +
      '<div class="dress-txt">时辰：十二值神（青龙…勾陈）按「子午日青龙在申、丑未日在戌、寅申日在子、卯酉日在寅、辰戌日在辰、巳亥日在午」顺行。时之宜忌以日为体、以黄黑道为用。</div>' +
      '<div class="dress-txt">历法：北京时间，定朔定气，无中气置闰；年柱以立春、月柱以节为界。1929 年前按当时官历用北京地方平太阳时（约 UTC+7:45），此后用东八区。</div>' +
      '<div class="dress-txt">节气精度：太阳黄经用中精度公式，实测系统偏早 3–8 分钟；交节落在北京时间 00:00–00:10 之间时，日期可能记早一天（如 2014 惊蛰）。朔望用 Meeus 算法，误差在秒级。</div>' +
      '<div class="dress-txt">可靠区间 1900–2100。全部实时推算，没有预生成表；1929 年前中国用平朔与北京地方时，个别农历日可能与旧历书差一天。</div>' +
      '<div class="hr"></div>' +
      '<div class="mini">等第：依卷十「月表」六等（上·上次·中·中次·下·下下）判日，遇德则依判词进退；月破固定最下。判词为「从宜亦从忌」者，两见的条目只列于忌、不再重复列于宜。「止不忌」依原义只从忌中剔出，不列入宜。彭祖百忌为后世俗忌，单列备参、不参与判等。德神取天德、月德、天德合、月德合、天赦，另据卷五月建条补月恩、四相。未实现：时德天愿天恩仅作吉神列示、不入德神，四离四绝往亡归忌等日类，财神福神喜神方位各家口诀不一，不列。</div>' +
      '</div></div>' +

      '<div class="card"><div class="card-hd"><div class="card-title">命局与今日 · 怎么看</div>' +
      '<div class="card-more">逐项读法</div></div><div class="card-body" style="padding-top:4px">' +
      [
        ['四柱', '把出生时刻换成四组干支。年柱以立春换年、月柱以节气换月，所以生日靠近立春时，年柱可能与农历年差一位。'],
        ['日主', '日柱的天干，代表「你」。后面所有十神、喜忌、长生都以它为中心。'],
        ['旺衰（支持·得令·得地·得势）', '把八个字连同地支所藏天干按五行折成力量：同我、生我算支持，月令加倍。支持率过半判「身强」，不足判「身弱」。得令看月支主气、得地看其余地支有无通根、得势看天干有无同类。'],
        ['十神（今日为你的什么）', '当日日干对日主的关系，共十种。正印＝贵人文书，可求学求人；七杀＝压力竞争，宜守不宜攻；正财＝正当收入，宜签约。括号内是白话。'],
        ['格局', '按月令取格：月支是日主临官则建禄格，阳干月支为帝旺则月刃格；否则从月支藏干里取透出天干者定格，无透干取本气。'],
        ['成败', '格遇破格之神（如正官格见伤官）判「破」；遇相神（如财生官）判「成」；月令被冲则格根不稳，「成」降为「平」。'],
        ['病药', '病＝破格的那个神；药＝能制它的神（如比劫夺财，药为官杀）。药已在喜用，说明当下有解；不在，则要等大运流年补。'],
        ['六亲', '父＝偏财、母＝正印、兄弟＝比劫；男命妻＝正财、子＝七杀、女＝正官，女命夫＝正官、子＝伤官、女＝食神。括号里是它落在哪一柱、以及在该支的长生状态。'],
        ['日主坐支', '日支是「坐基」。十二长生看生机：长生、临官、帝旺为有力；死、墓、绝为气弱。'],
        ['用神（相神）', '据「逢官看财、逢煞看印、逢印看官」推出这一格最需要的一路十神。只作参照，不参与打分。'],
        ['五行 · 喜忌', '把五行分成对你有利（喜）与不利（忌）两组，来自旺衰；点「调整」可手动改，体质测试也能写入。'],
        ['调候', '按《穷通宝鉴》该月该日干的原定「主用／次用」。只当值加分（主用＋9/+6，次用＋5/+3），不改写喜忌；与旺衰相左时会红字提示。'],
        ['与命局', '当日日支与你四柱的冲、合、害、刑。有冲或刑，首页顶部出现红条，提示大事宜避。'],
        ['大运 · 流年 · 流月 · 小运', '十年、一年、一月、一岁四级刻度。分数＝喜忌加减＋长生＋冲刑，权重为本程序自定，看相对高低即可，不必当绝对值。'],
        ['时辰（对你）', '每个时辰取当日时柱（五鼠遁定干）与你命局比：干支五行是否在喜忌、日主在该支的长生、是否冲刑你的四柱。分数高但仍冲日柱者标「慎」——黄黑道是通例，个人分是特例，两者会不一致。']
      ].map(function (d) {
        return '<details class="qitem"><summary>' + d[0] + '</summary>' +
          '<div class="quote">' + d[1] + '</div></details>';
      }).join('') +
      '<div class="mini" style="margin-top:8px">以上是读法说明，不改变任何算法。分数与判断均由前文所述口径实时计算。</div>' +
      '</div></div>' +

      '<div class="card"><div class="card-hd"><div class="card-title">历法自检</div><div class="card-more">对照香港天文台</div></div>' +
      '<div class="card-body">' + st + '</div></div>' +

      '<div class="card"><div class="card-hd"><div class="card-title">加入手机日历</div>' +
      '<div class="card-more">iCalendar</div></div><div class="card-body">' +
      '<div class="dress-txt">导出标准 .ics 文件：每天一条全天事件，标题为「农历日 + 宜忌摘要」，点开事件可看完整宜忌。</div>' +
      '<button class="btn" data-act="ics">导出每日黄历（未来 365 天）</button>' +
      '<div class="hr"></div>' +
      '<div class="dress-txt">时辰是定时事件：每个时辰一条 2 小时的事件，共 12 条/天。天数别太长，否则日历会被填满。</div>' +
      '<button class="btn ghost" data-act="icsh">导出时辰（未来 14 天 · 168 条）</button>' +
      '<div class="mini" style="margin-top:8px">iPhone：下载后用「文件」App 点开该 .ics → 选「日历」→ 添加全部。建议先新建一个「黄历」日历再导入，方便一键隐藏。</div>' +
      '</div></div>' +

      '<div class="card"><div class="card-hd"><div class="card-title">说明</div></div><div class="card-body">' +
      '<div class="dress-txt">黄历属传统民俗资料。《协纪辨方书》御制序自言"如曰如是则吉，如是则凶，如是则福，如是则祸，则明者所弗道也"；康熙谕旨亦称"事属渺茫难以凭信"。本程序只做规则复现，不主张吉凶实效，不构成医疗、投资、婚恋等任何建议。</div>' +
      '<div class="dress-sub"><div>底本 <b>四库全书本卷十</b></div><div>历法 <b>天文算法</b></div></div>' +
      '</div></div>' +
      '<div class="note" style="text-align:center">协纪黄历 · 本地计算 · 不联网</div>' +
      '</div>';
  }

  /* ---------------- 弹层 ---------------- */
  function sheetHtml(r) {
    if (S.sheet === 'quiz') {
      var qs = QUIZ.map(function (item, qi) {
        var opts = item.a.map(function (a, ai) {
          var on = S.quiz && S.quiz[qi] === ai;
          return '<span class="fchip' + (on ? ' on' : '') + '" style="flex:0 0 auto;padding:8px 12px" data-act="quizsel:' + qi + ':' + ai + '">' + a[0] + '</span>';
        }).join('');
        return '<div style="margin-top:14px"><div class="dress-txt"><b>' + (qi + 1) + '.</b> ' + item.q + '</div>' +
          '<div class="frow" style="flex-wrap:wrap">' + opts + '</div></div>';
      }).join('');
      var answered = (S.quiz || []).filter(function (x) { return x !== null && x !== undefined; }).length;
      var res = answered === QUIZ.length ? quizResult() : null;
      var out = res
        ? '<div style="margin:14px 0 0;border:1px solid var(--line);border-radius:10px;padding:12px">' +
        '<div class="dress-txt">你的能量偏「<b>' + res.fav.map(function (w) { return E.WX_NAME[w]; }).join('、') +
        '</b>」，建议补「' + res.unf.map(function (w) { return E.WX_NAME[w]; }).join('、') + '」以平衡。</div>' +
        '<div class="mini" style="margin-top:6px">趣味测试，不是命理判断；点下面按钮才写入喜忌。</div>' +
        '<button class="btn" data-act="quizapply" style="margin-top:10px">采用这个结果</button></div>'
        : '<div class="mini" style="margin-top:14px">已答 ' + answered + '/' + QUIZ.length + ' 题</div>';
      return '<div class="sheet-hd"><span>五行体质测试</span><span class="chip" data-act="closesheet">关闭</span></div>' +
        '<div class="mini">不想填生辰？用几道题估一个喜忌，作为初始值。</div>' + qs + out;
    }
    if (S.sheet === 'poster') {
      if (!S.poster) {
        try { S.poster = makePoster(r, S.scoreS, S.relNow); } catch (e) { S.poster = ''; }
      }
      return '<div class="sheet-hd"><span>对比海报</span><span class="chip" data-act="closesheet">关闭</span></div>' +
        (S.poster ? '<img src="' + S.poster + '" style="width:100%;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.12)">' +
          '<div class="mini" style="margin-top:10px;text-align:center">长按图片保存，或点按钮下载</div>' +
          '<a class="btn" download="xieji-compare.png" href="' + S.poster + '" style="display:block;text-align:center;margin-top:10px;text-decoration:none">下载图片</a>'
          : '<div class="empty-tip">未生成</div>');
    }
    if (S.sheet === 'favor') {
      if (!S.favManual) {
        S.favManual = S.wx ? S.wx.fav.slice() : [];
        S.unfManual = S.wx ? S.wx.unf.slice() : [];
      }
      var frow = function (list, kind) {
        return E.WX_NAME.map(function (n, i) {
          var on = list.indexOf(i) >= 0;
          return '<span class="fchip' + (on ? ' on' : '') + '" data-act="wtog:' + kind + ':' + i + '">' + n + '</span>';
        }).join('');
      };
      return '<div class="sheet-hd"><span>喜忌设置</span><span class="chip" data-act="closesheet">关闭</span></div>' +
        '<div class="hinge">喜用（对我有利）</div><div class="frow">' + frow(S.favManual, 'fav') + '</div>' +
        '<div class="hinge" style="margin-top:14px">忌讳（对我不利）</div><div class="frow">' + frow(S.unfManual, 'unf') + '</div>' +
        '<div class="mini" style="margin-top:12px">系统按四柱五行旺衰给初判；懂的可以自己改，不必照单全收。两边都勾时以"喜"为准。</div>' +
        '<button class="btn" data-act="favsave" style="margin-top:12px">保存</button>';
    }
    if (S.sheet === 'yili') {
      var Q0 = window.XiejiQuotes || { yili: [] };
      var ent = (Q0.yili || []).filter(function (x) { return x.name === S.qName; })[0];
      if (!ent) ent = (Q0.yili || []).filter(function (x) {
        return x.name.indexOf(S.qName) === 0 || S.qName.indexOf(x.name) === 0;
      })[0];
      if (!ent && /^[建除满平定执破危成收开闭]日$/.test(S.qName)) {
        ent = (Q0.yili || []).filter(function (x) { return x.name === '建除十二神'; })[0];
      }
      var cur = r.shensha.filter(function (s) { return s.name === S.qName; })[0];
      var body = ent
        ? '<div class="quote">' + esc(ent.text) + '</div>' +
        '<div class="mini" style="margin-top:8px">出处：' + esc(ent.juan) + '·义例</div>'
        : '<div class="empty-tip">此煞在义例中无专条（或在卷三~八未收）。</div>';
      if (cur && cur.cite) {
        body += '<div class="hinge" style="margin-top:12px">卷十条文</div>' +
          '<div class="quote" style="margin-top:6px">' + esc(cur.cite) + '</div>';
      }
      return '<div class="sheet-hd"><span>' + esc(S.qName) + '</span><span class="chip" data-act="closesheet">关闭</span></div>' + body;
    }
    if (S.sheet === 'birth') {
      var ms = E.lunarMonthsOf(S.bY);
      var yOpts = '';
      for (var yy = 2100; yy >= 1900; yy--) yOpts += '<option value="' + yy + '"' + (yy === S.bY ? ' selected' : '') + '>' + yy + ' 年</option>';
      var mOpts = ms.map(function (m, i) {
        var on = (m.month === S.bM && !!m.leap === !!S.bLeap);
        return '<option value="' + i + '"' + (on ? ' selected' : '') + '>' + (m.leap ? '闰' : '') + lunarMonthName(m.month) + '</option>';
      }).join('');
      var curM = ms.filter(function (m) { return m.month === S.bM && !!m.leap === !!S.bLeap; })[0] || ms[0];
      var maxD = curM ? curM.days : 30;
      var dOpts = '';
      for (var dd = 1; dd <= maxD; dd++) dOpts += '<option value="' + dd + '"' + (dd === S.bD ? ' selected' : '') + '>' + lunarDayName(dd) + '</option>';
      var HRANGE = ['23:00–00:59', '01:00–02:59', '03:00–04:59', '05:00–06:59', '07:00–08:59', '09:00–10:59',
        '11:00–12:59', '13:00–14:59', '15:00–16:59', '17:00–18:59', '19:00–20:59', '21:00–22:59'];
      var hOpts = '<option value=""' + (S.bHz === null || S.bHz === undefined ? ' selected' : '') + '>时辰不详</option>';
      for (var hi = 0; hi < 12; hi++) hOpts += '<option value="' + hi + '"' + (hi === S.bHz ? ' selected' : '') + '>' +
        ZHI[hi] + '时（' + HRANGE[hi] + '）</option>';
      var mode = S.bMode || 'lunar';
      var modeToggle = '<div class="frow" style="margin:2px 0 10px">' +
        '<span class="fchip' + (mode === 'lunar' ? ' on' : '') + '" data-act="bmode:lunar">农历</span>' +
        '<span class="fchip' + (mode === 'solar' ? ' on' : '') + '" data-act="bmode:solar">公历</span></div>';
      var lunarRow = '<div class="birth-row">' +
        '<select class="bsel" id="by">' + yOpts + '</select>' +
        '<select class="bsel" id="bm">' + mOpts + '</select>' +
        '<select class="bsel" id="bd">' + dOpts + '</select>' +
        '</div>';
      var bs0 = birthSolar();
      var solarRow = '<input type="date" id="bsolar" class="dateinput" min="1900-01-01" max="2100-12-31" value="' +
        (bs0 ? bs0.year + '-' + pad(bs0.month) + '-' + pad(bs0.day) : '') + '">';
      return '<div class="sheet-hd"><span>选择生日</span><span class="chip" data-act="closesheet">关闭</span></div>' +
        modeToggle +
        (mode === 'solar' ? solarRow : lunarRow) +
        '<div class="birth-row" style="margin-top:8px">' +
        '<select class="bsel" id="bh" style="flex:1">' + hOpts + '</select>' +
        '<select class="bsel" id="bg" style="flex:1">' +
        '<option value="1"' + (S.bMale ? ' selected' : '') + '>男</option>' +
        '<option value="0"' + (S.bMale ? '' : ' selected') + '>女</option>' +
        '</select>' +
        '</div>' +
        '<div class="mini" style="margin-top:10px">' + (mode === 'solar'
          ? '按<b>公历</b>填生日，程序自动转成农历与四柱。'
          : '按<b>农历</b>填生日（闰月另列）。') +
        '时辰可留空（四柱只缺时柱）。生肖按农历年（春节）定。</div>' +
        '<button class="btn" data-act="savebirth" style="margin-top:12px">保存生日</button>';
    }
    if (S.sheet === 'cal') {
      var first = new Date(S.calY, S.calM - 1, 1);
      var startW = first.getDay();
      var days = new Date(S.calY, S.calM, 0).getDate();
      var cells = '';
      for (var i = 0; i < startW; i++) cells += '<div class="cell empty"></div>';
      for (var d = 1; d <= days; d++) {
        var jdn = E.gregorianToJDN(S.calY, S.calM, d);
        var lu = '';
        try { var L = E.toLunar(jdn); lu = L.day === 1 ? lunarMonthName(L.month) : lunarDayName(L.day); } catch (e) { lu = ''; }
        var cls = 'cell';
        var t = new Date();
        if (t.getFullYear() === S.calY && t.getMonth() + 1 === S.calM && t.getDate() === d) cls += ' today';
        if (S.y === S.calY && S.m === S.calM && S.d === d) cls += ' sel';
        cells += '<div class="' + cls + '" data-act="pick:' + S.calY + '-' + S.calM + '-' + d + '">' + d + '<span class="lu">' + lu + '</span></div>';
      }
      var yOpts2 = '';
      for (var cy = 1900; cy <= 2100; cy++) yOpts2 += '<option value="' + cy + '"' + (cy === S.calY ? ' selected' : '') + '>' + cy + ' 年</option>';
      var mOpts2 = '';
      for (var cm = 1; cm <= 12; cm++) mOpts2 += '<option value="' + cm + '"' + (cm === S.calM ? ' selected' : '') + '>' + cm + ' 月</option>';
      return '<div class="sheet-hd"><span class="card-more" data-act="calprev">‹</span>' +
        '<span style="display:flex;gap:6px;align-items:center">' +
        '<select class="bsel" id="caly" style="width:104px;padding:4px 6px;font-size:14px">' + yOpts2 + '</select>' +
        '<select class="bsel" id="calm" style="width:82px;padding:4px 6px;font-size:14px">' + mOpts2 + '</select>' +
        '</span>' +
        '<span class="card-more" data-act="calnext">›</span></div>' +
        '<div class="week-hd"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>' +
        '<div class="cal">' + cells + '</div>' +
        '<div style="text-align:center;margin-top:10px"><span class="chip" data-act="caltoday">回到今天</span></div>';
    }
    if (S.sheet === 'ts') {
      var rows = r.hours.map(function (h, i) {
        var hp = hourPersonal(h);
        return '<div class="ts-row" style="flex-wrap:wrap;align-items:flex-start">' +
          '<div class="ts-gz">' + esc(h.gz) + '</div>' +
          '<div class="ts-time">' + esc(h.range) + '</div>' +
          '<div class="ts-luck ' + (h.good === '吉' ? 'j' : 'x') + '">' + (h.good === '吉' ? '吉' : '凶') + '</div>' +
          '<div class="ts-yi">冲' + esc(h.chongName) + ' 煞' + esc(h.sha) + ' · ' + esc(h.shen) + '</div>' +
          (hp ? '<div style="flex-basis:100%;font-size:11.5px;color:#6B6259;margin:2px 0 0 62px">对你 <b style="color:' +
            (hp.sc >= 60 ? '#B3202A' : '#6B6259') + '">' + hp.sc + '</b> 分（' + esc(hp.cs) + '）' +
            (hp.harm.length ? '　<span style="color:#B3202A">慎：' + hp.harm.join('、') + '</span>' : '') + '</div>' : '') +
          '<div style="flex-basis:100%;font-size:12px;color:#6B6259;margin:2px 0 0 62px">' +
          (h.yi.length ? '<b style="font-weight:400;color:#A2968A">宜 </b>' + h.yi.map(function (w) { return esc(MODERN[w] || w); }).join('、') : '<span style="color:#A2968A">诸事不宜</span>') +
          '</div></div>';
      }).join('');
      return '<div class="sheet-hd"><span>十二时辰</span><span class="chip" data-act="closesheet">关闭</span></div>' + rows +
        '<div class="note">时辰宜忌以本日宜忌为体、时之黄黑道为用；日忌之事任何时辰皆不宜。</div>';
    }
    if (S.sheet === 'dress') {
      return '<div class="sheet-hd"><span>五行穿衣</span><span class="chip" data-act="closesheet">关闭</span></div>' + dressHtml(r, false);
    }
    if (S.sheet === 'quote') {
      var s = r.shensha[S.quoteOpen];
      if (!s) return '';
      var detail = '';
      if (s.yi.length) detail += '<div class="ts-row"><div class="ts-gz" style="width:64px;font-size:12px">所宜</div><div class="ts-yi" style="white-space:normal">' + s.yi.map(function (x) { return esc(MODERN[x] || x); }).join(' ') + '</div></div>';
      if (s.ji.length) detail += '<div class="ts-row"><div class="ts-gz" style="width:64px;font-size:12px">所忌</div><div class="ts-yi" style="white-space:normal">' + s.ji.map(function (x) { return esc(MODERN[x] || x); }).join(' ') + '</div></div>';
      return '<div class="sheet-hd"><span>' + esc(s.name) + '</span><span class="chip" data-act="closesheet">关闭</span></div>' +
        '<div class="quote">' + esc(s.cite || '（卷十无专条）') + '</div>' + detail;
    }
    return '';
  }

  /* ---------------- 渲染 ---------------- */
  var TITLES = { home: '协纪黄历', detail: '老黄历', zeri: '择日', quotes: '协纪原文', mine: '说明' };
  var TABS = [
    { k: 'home', t: '黄历' },
    { k: 'zeri', t: '择日' },
    { k: 'detail', t: '老黄历' },
    { k: 'mine', t: '我的' }
  ];

  function render() {
    var r = day();
    S.wx = S.bz ? E.baziWuxing(S.bz) : null;
    S.th = tiaohouOf(S.bz);
    var f0 = (S.favManual && S.favManual.length) ? S.favManual.slice() : (S.wx ? S.wx.fav.slice() : []);
    var u0 = (S.unfManual && S.unfManual.length) ? S.unfManual.slice() : (S.wx ? S.wx.unf.slice() : []);
    /* 调候不再改写喜忌，只按"当值加权"计入分数；与旺衰相左时明示 */
    S.thConf = [];
    if (S.th) {
      [S.th.main, S.th.second].forEach(function (w) {
        if (w !== null && w !== undefined && u0.indexOf(w) >= 0) S.thConf.push(w);
      });
    }
    S.favNow = f0.length ? f0 : null;
    S.unfNow = u0;
    var body = S.tab === 'detail' ? viewDetail(r)
      : S.tab === 'zeri' ? viewZeri()
        : S.tab === 'quotes' ? viewQuotes(r)
          : S.tab === 'mine' ? viewMine()
            : viewHome(r);

    var tabs = TABS.map(function (t) {
      var on = (S.tab === t.k || (S.tab === 'quotes' && t.k === 'detail'));
      return '<div class="tb' + (on ? ' on' : '') + '" data-act="tab:' + t.k + '">' + t.t + '</div>';
    }).join('');

    var tabbar = '<div class="tabbar">' + tabs + '</div>';
    var sh = sheetHtml(r);
    document.getElementById('app').innerHTML =
      '<div class="navbar">' + (TITLES[S.tab] || '协纪黄历') + '</div>' +
      '<div class="scroll" id="scroll">' + body + '</div>' +
      tabbar +
      '<div class="mask' + (S.sheet ? ' on' : '') + '" data-act="closesheet"></div>' +
      '<div class="sheet' + (S.sheet ? ' on' : '') + '">' + sh + '</div>';
  }

  function go(dy, dm, dd) {
    S.y = dy; S.m = dm; S.d = dd;
    render();
    var sc = document.getElementById('scroll');
    if (sc) sc.scrollTop = 0;
  }

  /* ---------------- 事件 ---------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) {
      if (S.sheet && !e.target.closest('.sheet')) { S.sheet = ''; render(); }
      return;
    }
    var act = el.getAttribute('data-act'), p = act.split(':'), k = p[0];
    if (k === 'prev' || k === 'next') {
      var j = E.gregorianToJDN(S.y, S.m, S.d) + (k === 'next' ? 1 : -1);
      var g = E.jdnToGregorian(j); go(g.year, g.month, g.day); return;
    }
    if (k === 'sheet') { S.sheet = p[1]; render(); return; }
    if (k === 'closesheet') { S.sheet = ''; render(); return; }
    if (k === 'tab') { S.tab = p[1]; S.sheet = ''; render(); return; }
    if (k === 'thing') { S.thing = +p[1]; render(); return; }
    if (k === 'days') { S.days = +p[1]; render(); return; }
    if (k === 'goto') {
      var q = p[1].split('-').map(Number);
      S.tab = 'home'; go(q[0], q[1], q[2]); return;
    }
    if (k === 'pick') {
      var q2 = p[1].split('-').map(Number);
      S.calY = q2[0]; S.calM = q2[1];
      S.sheet = ''; S.tab = 'home'; go(q2[0], q2[1], q2[2]); return;
    }
    if (k === 'calprev' || k === 'calnext') {
      S.calM += (k === 'calnext' ? 1 : -1);
      if (S.calM > 12) { S.calM = 1; S.calY++; }
      if (S.calM < 1) { S.calM = 12; S.calY--; }
      render(); return;
    }
    if (k === 'caltoday') {
      var t = new Date(); S.calY = t.getFullYear(); S.calM = t.getMonth() + 1;
      S.sheet = ''; S.tab = 'home'; go(t.getFullYear(), t.getMonth() + 1, t.getDate()); return;
    }
    if (k === 'quote') { S.quoteOpen = +p[1]; S.sheet = 'quote'; render(); return; }
    if (k === 'ics') { downloadICS(); return; }
    if (k === 'icsh') { downloadHoursICS(); return; }
    if (k === 'quizsel') {
      if (!S.quiz) S.quiz = [];
      S.quiz[+p[1]] = +p[2];
      render(); return;
    }
    if (k === 'quizapply') {
      var qr = quizResult();
      S.favManual = qr.fav; S.unfManual = qr.unf;
      try { localStorage.setItem('xieji.favor', JSON.stringify({ fav: S.favManual, unf: S.unfManual })); } catch (e) { }
      S.sheet = '';
      toast('已按测试结果设定喜忌');
      render(); return;
    }
    if (k === 'poster') {
      try {
        S.poster = makePoster(day(), S.scoreS, S.relNow);
        S.sheet = 'poster';
        render();
      } catch (e) { toast('生成失败：' + e.message); }
      return;
    }
    if (k === 'wtog') {
      var kind = p[1], idx = +p[2];
      var arr = kind === 'fav' ? S.favManual : S.unfManual;
      if (!arr) arr = kind === 'fav' ? (S.favManual = []) : (S.unfManual = []);
      var at = arr.indexOf(idx);
      if (at >= 0) arr.splice(at, 1); else arr.push(idx);
      render(); return;
    }
    if (k === 'favsave') {
      try {
        localStorage.setItem('xieji.favor', JSON.stringify({ fav: S.favManual, unf: S.unfManual }));
      } catch (e) { }
      S.sheet = '';
      toast('已保存喜忌设定');
      render(); return;
    }
    if (k === 'favreset') {
      S.favManual = null; S.unfManual = null;
      try { localStorage.removeItem('xieji.favor'); } catch (e) { }
      toast('已恢复系统判定');
      render(); return;
    }
    if (k === 'yili') { S.qName = decodeURIComponent(p[1] || ''); S.sheet = 'yili'; render(); return; }
    if (k === 'bmode') { S.bMode = (p[1] === 'solar') ? 'solar' : 'lunar'; render(); return; }
    if (k === 'savebirth') {
      var jdnB = E.lunarToJDN(S.bY, S.bM, S.bD, S.bLeap);
      if (jdnB === null) { toast('没找到这个农历日子'); return; }
      var gB = E.jdnToGregorian(jdnB);
      /* 生肖按农历年（春节）定：1984 甲子，顺推 */
      var zhiB = (((S.bY - 1984) % 12) + 12) % 12;
      try {
        E.computeDay(gB.year, gB.month, gB.day);
        saveZodiac(zhiB);
        saveBirth();
        S.bz = bzNow();
        S.sheet = '';
        var bt = S.bz ? '　四柱：' + S.bz.yearText + ' ' + S.bz.monthText + ' ' + S.bz.dayText + (S.bz.hourText ? ' ' + S.bz.hourText : '') : '';
        toast('农历' + S.bY + '年' + (S.bLeap ? '闰' : '') + lunarMonthName(S.bM) + lunarDayName(S.bD) +
          '（' + gB.year + '-' + gB.month + '-' + gB.day + '）→ 属' + ANIMALS[zhiB] + bt);
        render(); return;
      } catch (e) { toast('该日期超出范围（1900–2100）'); return; }
    }
  });

  document.addEventListener('change', function (e) {
    var id = e.target && e.target.id;
    if (id === 'zmonth' && e.target.value) {
      S.zMonth = e.target.value; S.zMode = 'month'; render(); return;
    }
    if (id === 'by') {
      S.bY = +e.target.value;
      var ms1 = E.lunarMonthsOf(S.bY);
      var cur1 = ms1.filter(function (m) { return m.month === S.bM && !!m.leap === !!S.bLeap; })[0] || ms1[0];
      if (cur1) { S.bM = cur1.month; S.bLeap = cur1.leap; S.bD = Math.min(S.bD, cur1.days); }
      render(); return;
    }
    if (id === 'bm') {
      var ms2 = E.lunarMonthsOf(S.bY);
      var m2 = ms2[+e.target.value];
      if (m2) { S.bM = m2.month; S.bLeap = m2.leap; S.bD = Math.min(S.bD, m2.days); }
      render(); return;
    }
    if (id === 'bd') { S.bD = +e.target.value; return; }
    if (id === 'bh') { S.bHz = e.target.value === '' ? null : +e.target.value; return; }
    if (id === 'bg') { S.bMale = e.target.value === '1'; saveBirth(); render(); return; }
    if (id === 'caly') { S.calY = +e.target.value; render(); return; }
    if (id === 'calm') { S.calM = +e.target.value; render(); return; }
    if (id === 'bsolar' && e.target.value) {
      var sp = e.target.value.split('-').map(Number);
      if (sp.length === 3) {
        try {
          var lu = E.toLunar(E.gregorianToJDN(sp[0], sp[1], sp[2]));
          S.bY = lu.year; S.bM = lu.month; S.bD = lu.day; S.bLeap = !!lu.leap;
          render(); return;
        } catch (err) { }
      }
    }
  });

  function bootHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return false;
    var pairs = h.split('&'), any = false;
    pairs.forEach(function (seg) {
      var kv = seg.split('=');
      var k = kv[0], v = kv[1];
      if (k === 'tab' && TITLES[v]) { S.tab = v; any = true; }
      else if (k === 'sheet') { S.sheet = v; any = true; }
      else if (k === 'date' && v) {
        var p = v.split('-').map(Number);
        if (p.length === 3) { S.y = p[0]; S.m = p[1]; S.d = p[2]; S.calY = p[0]; S.calM = p[1]; any = true; }
      } else if (k === 'birth' && v) {
        var q = v.split('-').map(Number);
        if (q.length >= 3) {
          try {
            S.bz = E.baziOf(q[0], q[1], q[2], q.length > 3 ? q[3] : null);
            S.zodiac = S.bz.year.z;
            var _lu = E.toLunar(E.gregorianToJDN(q[0], q[1], q[2]));
            S.bY = _lu.year; S.bM = _lu.month; S.bD = _lu.day; S.bLeap = !!_lu.leap;
            if (q.length > 3) S.bHz = q[3];
            any = true;
          } catch (e) { }
        }
      }
    });
    return any;
  }
  bootHash();
  window.addEventListener('hashchange', function () { bootHash(); render(); });

  render();
})();

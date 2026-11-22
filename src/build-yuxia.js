/* 把《玉匣记》黄历打包成单文件 site/yuxiaji.html（与协纪并列、各自一体）
 * 数据修正：动土开基剔除「癸未、戊午」（原书明注忌动土），合帐裁衣补「壬戌」
 */
const fs = require('fs');
const path = require('path');

const SRC = 'E:/workbuddy/玉匣记黄历';
const OUT = path.join(__dirname, '..', 'site', 'yuxiaji.html');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

let html = read('index.html').replace(/\r\n/g, '\n');

/* 1. 顶部换成体系切换 */
const headerRe = /<h1 class="serif" id="hdr">[^<]*<\/h1>/;
if (!headerRe.test(html)) { console.error('顶部结构不符预期'); process.exit(1); }
html = html.replace(headerRe,
  '<div class="appsw-wrap">' +
  '<a class="appsw" href="./">协纪黄历</a>' +
  '<span class="appsw on">玉匣记黄历</span></div>');

/* 2. 补切换器样式 */
const cssExtra = `
.appsw-wrap{display:flex;gap:8px;align-items:center}
.appsw{font-size:13px;padding:5px 13px;border-radius:15px;border:1px solid var(--line);
  background:#fff;color:var(--ink2);text-decoration:none;letter-spacing:0;line-height:1.2;font-family:inherit}
.appsw.on{background:var(--red);border-color:var(--red);color:#fff;font-weight:600}
`;
html = html.replace('</style>', cssExtra + '</style>');

/* 3. 内联脚本（顺序：cal → data → 修正 → qiongtong → bazi → app） */
const fix = `
/* 与原书比对后的数据修正（2026-11-22） */
(function(){
  var z = window.YXJ.zeri;
  z['动土开基'] = z['动土开基'].filter(function(x){ return x !== '癸未' && x !== '戊午'; });
  if (z['合帐裁衣'].indexOf('壬戌') < 0) z['合帐裁衣'].push('壬戌');
})();
`;
const parts = [
  ['cal.js', read('cal.js')],
  ['data.js', read('data.js') + '\n' + fix],
  ['qiongtong.js', read('qiongtong.js')],
  ['bazi.js', read('bazi.js')],
  ['app.js', read('app.js')]
];
for (const [name, code] of parts) {
  const tag = `<script src="${name}"></script>`;
  if (!html.includes(tag)) { console.error('找不到脚本标签', name); process.exit(1); }
  html = html.replace(tag, '<script>\n' + code + '\n</script>');
}

/* 4. PWA/离线元信息 */
html = html.replace('</head>',
  '<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  '<meta name="apple-mobile-web-app-title" content="玉匣记黄历">\n</head>');

fs.writeFileSync(OUT, html, 'utf8');
console.log('written', OUT, (html.length / 1024).toFixed(1) + ' KB');

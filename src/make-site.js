/* 生成可上传的站点目录 site/（含图标与 manifest） */
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const site = path.join(dir, '..', 'site');
if (!fs.existsSync(site)) fs.mkdirSync(site);

/* 1. 主页：单文件 App + 图标声明 */
let html = fs.readFileSync(path.join(dir, '..', 'xieji-app.html'), 'utf8');
const headTags = [
  '<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">',
  '<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="协纪黄历">',
  '<meta name="mobile-web-app-capable" content="yes">'
].join('\n');
if (!html.includes('apple-touch-icon')) html = html.replace('</head>', headTags + '\n</head>');
fs.writeFileSync(path.join(site, 'index.html'), html, 'utf8');

/* 2. manifest */
fs.writeFileSync(path.join(site, 'manifest.webmanifest'), JSON.stringify({
  name: '协纪黄历',
  short_name: '黄历',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#F7F2E9',
  theme_color: '#B3202A',
  lang: 'zh-CN',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
  ]
}, null, 2), 'utf8');

/* 3. 日历文件 */
for (const f of ['xieji-huangli.ics', 'xieji-shichen.ics']) {
  const src = path.join(dir, '..', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(site, f));
}

/* 4. 说明 */
fs.writeFileSync(path.join(site, 'README.txt'), [
  '协纪黄历 · 静态站点',
  '',
  'index.html            手机版黄历（单文件，离线可用）',
  'apple-touch-icon.png  iOS 主屏幕图标 180×180',
  'manifest.webmanifest  PWA 声明',
  'xieji-huangli.ics     每日黄历，2026–2027，可导入 iOS 日历',
  'xieji-shichen.ics     十二时辰，90 天，可导入 iOS 日历',
  '',
  '部署：把整个目录上传到任意静态托管即可（GitHub Pages / Netlify / 对象存储）。',
  '规则底本：《钦定协纪辨方书》卷十「宜忌」'
].join('\n'), 'utf8');

const list = fs.readdirSync(site).map(f => {
  const st = fs.statSync(path.join(site, f));
  return `${f.padEnd(24)} ${(st.size / 1024).toFixed(1)} KB`;
});
console.log(list.join('\n'));

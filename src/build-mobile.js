/* 打包手机版单文件：engine.js + mobile.js + mobile.css */
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

const css = read('mobile.css');
const engine = read('engine.js');
const quotes = read('quotes-data.js');
const mingli = read('mingli-data.js');
const qiongtong = read('qiongtong-data.js');
const app = read('mobile.js');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="协纪黄历">
<meta name="format-detection" content="telephone=no">
<meta name="theme-color" content="#F7F2E9">
<title>协纪黄历 · 老黄历</title>
<style>
${css}
</style>
</head>
<body>
<div id="app"><noscript>本页需要 JavaScript。</noscript></div>
<script>
${engine}
</script>
<script>
${quotes}
</script>
<script>
${mingli}
</script>
<script>
${qiongtong}
</script>
<script>
${app}
</script>
</body>
</html>
`;

const out = path.join(dir, '..', 'xieji-app.html');
fs.writeFileSync(out, html, 'utf8');
console.log('written', out, (html.length / 1024).toFixed(1) + ' KB');

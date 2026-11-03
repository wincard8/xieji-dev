/* 把 index.html + style.css + engine.js + ui.js 打包成单文件 HTML */
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

const css = read('style.css');
const engine = read('engine.js');
const ui = read('ui.js');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>协纪黄历 · 依《钦定协纪辨方书》卷十</title>
<style>
${css}
</style>
</head>
<body>
<div class="page" id="app"><noscript>本页需要 JavaScript 才能排历。</noscript></div>
<script>
${engine}
</script>
<script>
${ui}
</script>
<script>XiejiUI.init();</script>
</body>
</html>
`;

const out = path.join(dir, '..', 'xieji-huangli.html');
fs.writeFileSync(out, html, 'utf8');
console.log('written', out, (html.length / 1024).toFixed(1) + ' KB');

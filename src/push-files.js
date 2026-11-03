/* 上传指定文件到 GitHub 仓库（带 sha 覆盖），逐步打印 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = process.env.GH_TOKEN;
const OWNER = 'wincard8', REPO = 'huangli';
const SITE = path.join(__dirname, '..', 'site');
if (!TOKEN) { console.error('need GH_TOKEN'); process.exit(1); }

function api(method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path: p, method,
      headers: Object.assign({
        'User-Agent': 'xieji', 'Authorization': 'Bearer ' + TOKEN,
        'Accept': 'application/vnd.github+json'
      }, data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        let j = null; try { j = JSON.parse(b); } catch (e) { }
        resolve({ status: res.statusCode, json: j, raw: b });
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(new Error('timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const files = process.argv.slice(2);
  for (const f of files) {
    const full = path.join(SITE, f);
    const buf = fs.readFileSync(full);
    console.log(`${f}  ${(buf.length / 1024).toFixed(0)} KB  → base64 ${((buf.length * 4 / 3) / 1024).toFixed(0)} KB`);
    const content = buf.toString('base64');
    let sha = null;
    const cur = await api('GET', `/repos/${OWNER}/${REPO}/contents/${f}`);
    if (cur.status === 200) sha = cur.json.sha;
    console.log('  现有 sha:', sha || '(新文件)');
    const put = await api('PUT', `/repos/${OWNER}/${REPO}/contents/${f}`,
      sha ? { message: 'update ' + f, content, sha } : { message: 'add ' + f, content });
    console.log('  上传:', put.status, put.status < 300 ? 'OK' : put.raw.slice(0, 160));
  }
})().catch(e => { console.error('FATAL', (e && e.stack) || e); process.exit(1); });

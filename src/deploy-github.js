/* 自动部署到 GitHub Pages
 * 用法：GH_TOKEN=xxx node deploy-github.js [repoName]
 * 做四件事：建仓库 → 上传 site/ 里的文件 → 开 Pages → 验证网址可访问
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GH_REPO || process.argv[2] || 'huangli';
const SITE = path.join(__dirname, '..', 'site');
if (!TOKEN) { console.error('缺少 GH_TOKEN'); process.exit(1); }

function api(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: urlPath,
      method,
      headers: Object.assign({
        'User-Agent': 'xieji-deploy',
        'Authorization': 'Bearer ' + TOKEN,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }, data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        let json = null;
        try { json = buf ? JSON.parse(buf) : null; } catch (e) { /* ignore */ }
        resolve({ status: res.statusCode, json, raw: buf });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* 1. 身份 */
  const me = await api('GET', '/user');
  if (me.status !== 200) { console.error('令牌无效：', me.status, me.raw.slice(0, 200)); process.exit(1); }
  const owner = me.json.login;
  console.log('账号：', owner);

  /* 2. 建仓库 */
  let r = await api('POST', '/user/repos', { name: REPO, private: false, auto_init: false, description: '协纪黄历 · 传统历法查询' });
  if (r.status === 201) console.log('仓库已创建：', r.json.full_name);
  else if (r.status === 422 || r.status === 403) console.log('仓库已存在或无权限新建，按已存在处理');
  else { console.error('建仓库失败：', r.status, r.raw.slice(0, 300)); process.exit(1); }

  /* 3. 上传文件 */
  const files = fs.readdirSync(SITE).filter(f => fs.statSync(path.join(SITE, f)).isFile());
  for (const f of files) {
    const content = fs.readFileSync(path.join(SITE, f)).toString('base64');
    let put = await api('PUT', `/repos/${owner}/${REPO}/contents/${encodeURIComponent(f)}`, {
      message: 'add ' + f, content
    });
    if (put.status === 422) {  // 已存在，取 sha 覆盖
      const cur = await api('GET', `/repos/${owner}/${REPO}/contents/${encodeURIComponent(f)}`);
      if (cur.status === 200) {
        put = await api('PUT', `/repos/${owner}/${REPO}/contents/${encodeURIComponent(f)}`, {
          message: 'update ' + f, content, sha: cur.json.sha
        });
      }
    }
    console.log(put.status === 201 || put.status === 200 ? '✓ ' + f : '✗ ' + f + ' ' + put.status + ' ' + put.raw.slice(0, 160));
  }

  /* 4. 开 Pages */
  let p = await api('POST', `/repos/${owner}/${REPO}/pages`, { source: { branch: 'main', path: '/' } });
  if (p.status === 201) console.log('Pages 已开启（main / root）');
  else if (p.status === 409) {
    const patch = await api('PUT', `/repos/${owner}/${REPO}/pages`, { source: { branch: 'main', path: '/' } });
    console.log(patch.status < 300 ? 'Pages 已更新' : 'Pages 更新失败 ' + patch.status);
  } else console.log('开 Pages 返回', p.status, p.raw.slice(0, 200));

  /* 5. 等构建并验证 */
  const url = `https://${owner}.github.io/${REPO}/`;
  for (let i = 0; i < 20; i++) {
    await sleep(6000);
    const st = await api('GET', `/repos/${owner}/${REPO}/pages`);
    const status = st.json && st.json.status;
    process.stdout.write(`  [${i + 1}/20] Pages 状态：${status}\r`);
    if (status === 'built') break;
  }
  console.log('\n网址：', url);

  /* 6. curl 式校验 */
  await sleep(3000);
  https.get(url, res => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      const ok = res.statusCode === 200 && body.includes('协纪黄历');
      console.log(ok ? '✓ 首页可访问，内容正确' : '✗ 校验失败 ' + res.statusCode);
      console.log('  状态码', res.statusCode, '| 长度', body.length);
      process.exit(ok ? 0 : 1);
    });
  }).on('error', e => { console.error('访问失败', e.message); process.exit(1); });
})().catch(e => { console.error('FATAL', (e && e.stack) || e); process.exit(1); });

/* 一条命令跑完所有测试：node run-tests.js
 * 自动把 ../data 里的数据文件复制到同目录（测试按同级路径 require） */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const DATA = path.join(DIR, '..', 'data');
if (fs.existsSync(DATA)) {
  for (const f of fs.readdirSync(DATA)) {
    if (f.endsWith('.js')) fs.copyFileSync(path.join(DATA, f), path.join(DIR, f));
  }
}

const TESTS = [
  ['历法', 'test.js'],
  ['时辰', 'hour-test.js'],
  ['渲染', 'render-test.js'],
  ['义例起例', 'verify-yili.js'],
  ['命理层审计', 'audit-mingli.js']
];

let failed = 0;
for (const [name, file] of TESTS) {
  process.stdout.write('── ' + name + ' … ');
  const r = spawnSync(process.execPath, [file], { cwd: DIR, encoding: 'utf8' });
  const out = (r.stdout || '').trim().split('\n').filter(Boolean);
  const last = out.length ? out[out.length - 1] : '';
  if (r.status === 0) console.log('✓ ' + last);
  else { failed++; console.log('✗'); console.log(r.stdout || ''); console.log(r.stderr || ''); }
}
console.log(failed ? `\n${failed} 套失败` : '\n全部通过');
process.exit(failed ? 1 : 0);

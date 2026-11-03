/* 本地 md（按季分节，段首写"正月甲木，…"）→ 月格表；与语料库版比对用神 */
const fs = require('fs');
const md = fs.readFileSync('C:/Users/Administrator/Desktop/New folder/穷通宝鉴.md', 'utf8');

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const MON = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const WX = ['木','木','火','火','土','土','金','金','水','水'];

const paras = md.split(/\n{2,}/).map(p => p.replace(/^#{2,4}\s*[^\n]*\n?/, '').trim()).filter(Boolean);
const mdCells = {};
for (const p of paras) {
  const t = p.replace(/\s/g, '');
  for (const g of GAN) for (let mi = 0; mi < 12; mi++) {
    const key = MON[mi] + g + WX[GAN.indexOf(g)];
    if (t.startsWith(key) && !mdCells[key]) mdCells[key] = p;
  }
}

const useOf = t => {
  const head = t.slice(0, 60);
  const out = [];
  const r = /(?:专用|專用|先取|次用|取|用|宜|须|須|先|端)[：:]?([甲乙丙丁戊己庚辛壬癸])/g;
  let x;
  while ((x = r.exec(head)) !== null) if (out.indexOf(x[1]) < 0) out.push(x[1]);
  return out;
};

global.window = {};
require('./qiongtong-data.js');
const Q = window.XiejiQiongtong;

let both = 0, agree = 0, differ = 0, onlyCorpus = 0;
const diffs = [];
for (const g of GAN) for (let mi = 0; mi < 12; mi++) {
  const key = MON[mi] + g + WX[GAN.indexOf(g)];
  const c = Q[g + '|' + MON[mi]];
  const d = mdCells[key];
  if (!c && !d) continue;
  if (!d) { onlyCorpus++; continue; }
  if (!c) continue;
  both++;
  const u1 = (c.use || []).join(''), u2 = useOf(d).join('');
  if (u1 === u2) agree++;
  else { differ++; diffs.push([key, u1 || '—', u2 || '—', (c.text || '').slice(0, 30), d.slice(0, 30)]); }
}
console.log(`本地 md 命中格 ${Object.keys(mdCells).length}／120；两版皆有时 ${both}`);
console.log(`用神一致 ${agree}，不一致 ${differ}，仅语料有 ${onlyCorpus}`);
diffs.slice(0, 10).forEach(d => console.log(`  ${d[0]}  语料[${d[1]}] md[${d[2]}]\n      语料: ${d[3]}\n      md  : ${d[4]}`));

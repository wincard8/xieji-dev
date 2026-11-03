/* 第三方仲裁：把 11 个有差异的格，在 scripta/daizhige 两个独立文本里查出来 */
const fs = require('fs');

const src = fs.readFileSync('mingli/qt3/scripta.txt', 'utf8').replace(/\s+/g, '');
const dz = fs.readFileSync('mingli/qt3/daizhige.txt', 'utf8').replace(/\s+/g, '');

const CELLS = ['九月甲木', '二月乙木', '十一月乙木', '三月丙火', '正月己土',
  '二月庚金', '七月庚金', '八月庚金', '八月辛金', '六月癸水'];

for (const k of CELLS) {
  const i = src.indexOf(k);
  const seg = i >= 0 ? src.slice(i, i + 60) : '（未找到）';
  const j = dz.indexOf(k);
  const seg2 = j >= 0 ? dz.slice(j, j + 60) : '（未找到）';
  console.log('【' + k + '】');
  console.log('  scripta : ' + seg);
  console.log('  daizhige: ' + seg2);
}
console.log('\n两源是否一致：', src === dz ? '完全相同' : '有差异（长度 ' + src.length + ' vs ' + dz.length + '）');

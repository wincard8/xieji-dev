# 协纪黄历 · 开发档案

《钦定协纪辨方书》择日程序 + 四柱命理层的开发档案：源码、测试、底本、核验报告。

线上成品：<https://wincard8.github.io/huangli/>

## 目录

```
src/        源码与测试
  engine.js          历法（定朔定气、干支、农历）、神煞、月表等第、八字（藏干/十神/旺衰/格局/六亲/长生/大运）
  mobile.js          手机版单页外壳（视图、交互、海报、导出）
  mobile.css         样式
  build-mobile.js    打包成单文件 xieji-app.html
  ics.js             导出 iCalendar
  test.js            历法 48 项
  hour-test.js       时辰 610 天不变量
  render-test.js     渲染 468 天
  verify-book.js     卷十 138 项起例位次
  verify-yili.js     义例 120 项独立重算
  verify6.js         月表 730 天直读比对
  audit-mingli.js    命理层 119 项审计
  build-quotes.js    抽卷十原文与义例
  build-mingli.js    抽三命通会/渊海子平条文
  build-qiongtong.js 建调候表（含人工校订）
data/       生成的数据（原文、命理依据、调候表）
books/      底本文本
  xieji/       《钦定协纪辨方书》36 卷（Kanripo KR3g0051，四库本）
  sanming/     《三命通会》12 卷（Kanripo KR3g0042，四库本）
  yuanhai/     《渊海子平》（维基文库 wikitext）
  qiongtong/   《穷通宝鉴》第三方校对本两种
reports/    核验报告
references/ 第三方来源、许可与致谢
xieji-app.html  当前线上单文件成品
```

## 校准方法

四层可复算，每层都有脚本：

| 层 | 方法 | 结果 |
|---|---|---|
| 历法 | 对照香港天文台公开数据 | 48 项 |
| 起例 | 用卷三~八「义例」原文独立重算，与引擎 730 天输出比对 | 120 项 |
| 条文 | 卷十宜忌逐条比对（含他校） | 逐条，修 10 处 |
| 等第 | 据卷十月表逐日比对 | 730 天 |
| 命理层 | 藏干/长生/十神/建禄月刃/大运/小运/流月/打分边界 | 119 项 |

```
node test.js && node hour-test.js && node render-test.js
node verify-yili.js && node verify6.js && node audit-mingli.js
```

## 已知边界

- 旺衰权重、个人评分、大运流年分、场景加权：**算法自定**，古籍只给原则。
- 调候用神：96 格自动抽取 + 15 格人工补定，2 格原文无明言，留空。
- 病药仅到「认病指药」，不判轻重。
- 用神（相神说）只显示，不参与打分。
- 节气精度约 ±15 分钟，交节近子夜可能差一日；1929 年前用平朔与北京地方时。

## 许可

源码 MIT。底本均为公有领域古籍，转录来源与许可见 [references/第三方来源与许可.md](references/第三方来源与许可.md)。

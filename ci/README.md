# CI 配置（需手动启用）

`workflow-ci.yml` 是 GitHub Actions 的测试工作流，但**没能自动上传**：

> 用 Contents API 创建 `.github/workflows/` 下的文件，token 必须带 `workflow` 权限；
> 当前 token 只有 `repo`，GitHub 返回 404。

## 启用方法（任选其一）

**A. 网页上传（最快）**

1. 打开 <https://github.com/wincard8/xieji-dev>
2. Add file → Create new file
3. 文件名填 `.github/workflows/ci.yml`
4. 把本目录 `workflow-ci.yml` 的内容粘进去，提交

**B. 给 token 加权限后重跑**

到 Settings → Developer settings → Personal access tokens，勾上 `workflow`，然后：

```bash
GH_TOKEN=新token node publish-archive.js xieji-dev
```

## 工作流做什么

```
checkout → setup-node 20
cp data/*.js src/        # 测试脚本按同级路径 require 数据
cd src
node test.js             历法 48
node hour-test.js        时辰 610 天不变量
node render-test.js      渲染 468 天
node verify-yili.js      义例 120
node audit-mingli.js     命理层 119
```

任何一步非零退出即失败。

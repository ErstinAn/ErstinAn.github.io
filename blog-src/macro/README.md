# MACRO blog — website source

这是个人主页中 MACRO 文章的维护源码，取自交付稿的 `latest/`，包含已审阅的 Sections 0–4。网站导出文件是 `../../dist/blog/macro/index.html`。

## 打开或分享

先运行 `python3 build.py` 生成本地 `index.html`，再直接打开它。分享时只需发送这个文件；正文、样式、数据、公式和交互都已内嵌，不需要服务器、CDN 或其他文件。收件人需下载后用浏览器打开。

## 修改位置

| 内容 | 文件 |
|---|---|
| 引言及其共享来源 | `src/introduction.html`、`src/introduction-sources.html` |
| 引言插图、图注和折叠入口 | `src/intro-media/post.html`、`weights.html`；帖子截图与两张 RMS 原图在 `references/introduction/` |
| 各节正文、公式和控件 | `src/sections/0.html` 至 `4.html` |
| 标题、目录、页面骨架 | `src/page.html` |
| Sources / Methods and data | `src/sources.html` |
| 配色与排版 | `src/styles.css` |
| 各节图表与交互 | `src/scripts/section0.js` 至 `section4.js` |
| 图内动态文案 | `src/copy/section0.json`、`section1.json`、`section2.json`、`section4.json`；Section 3 位于其 JS 中 |
| 图表数据 | `data/section0.json` 至 `section4.json` |
| 首屏及无 JavaScript 时的图 | `src/figures/*.svg` |

修改图表文字或数据时，也要同步相应的初始 HTML / SVG，避免首次打开与交互后的内容不一致。公式保留已审阅的 MathML，无额外 LaTeX 编译环境。

## 构建和检查

在此目录执行：

```sh
python3 build.py
python3 tests/run.py
```

只需要 Python 3 标准库和 Node.js，无 npm 或 pip 依赖。网站接入时已在 Python 3.12 / Node 22 环境通过全部测试。

`build.py` 展开 `{{include:相对路径}}`，并将 `{{image:相对路径}}` 指定的 PNG / SVG 内嵌为 data URL，生成单文件 `index.html`。所有引用都限定在此目录内。它不读取旧页面，不执行文字替换补丁，也不联网。`python3 build.py --check` 可检查输出是否与源码一致。

`tests/results.json` 和 `tests/results.txt` 记录最近一次实际测试。测试涵盖五节图表、数值计算、模型/范围/坐标切换、折叠区与跨图独立性。DOM 测试使用 Node，不能代替真实浏览器。真实浏览器的显示检查应在网站 HTTP 预览中另行完成；这些报告只描述自动化代码测试。

`INTRODUCTION_COPY_REVIEW.md` 从最终 HTML 提取当前引言。截图、原图、脚注和范围测试会生成 `tests/introduction-results.json`。

`SECTION_0_COPY_REVIEW.md` 从最终 HTML 提取当前 Section 0 正文、半径 Proposition 和图表文案。`tests/section0-interaction-scope.txt` 记录最近一次修改前后实际 HTML 的 33 个交互状态比较；半径与 oblique v2 修订保留了算法、收敛说明、Figure 0.2 数据及其他章节。

`SECTION_1_COPY_REVIEW.md` 从最终 HTML 提取 Section 1 文案。过渡稿 v2 的范围核对与交互对比分别记录在 `tests/section1-transitions-scope.json` 和 `tests/section1-interaction-scope.txt`。

`SECTION_2_COPY_REVIEW.md` 从最终 HTML 提取 Section 2 正文、公式、折叠说明和图表文案。蓝图 v1 的范围核对与 33 个交互状态对比分别记录在 `tests/section2-copy-scope.json` 和 `tests/section2-interaction-scope.txt`；三张图、表格及其他章节保持原样。

`SECTIONS_3_4_COPY_REVIEW.md` 从最终 HTML 提取 Sections 3–4 的当前文案。蓝图 v2 的范围核对与交互对比分别记录在 `tests/sections34-copy-scope.json` 和 `tests/sections34-interaction-scope.txt`；六张图保留，Figure 3.3 仅新增两种指标的区别说明，数据与计算未改动。

## 网站导出

在个人主页根目录执行 `python3 scripts/build-macro-blog.py`，生成带有站内返回导航的 `dist/blog/macro/index.html`。不要手工修改生成文件。导出不改变正文、公式、数据和交互逻辑；`--check` 检查网站文件是否与源码一致。

## 保留的数据

本目录只保留构建与测试所需的七份图表 JSON、源码、测试基准、三张引言 PNG 及其校验记录。原始实验历史、旧交付稿、迁移记录和下载缓存未导入网站仓库。文章中已有的研究来源与 W&B 链接保持原样。

`tests/results.json`、`tests/results.txt`、`tests/introduction-results.json` 是本地运行报告，不提交。GitHub Pages 只部署 `dist/`；本目录作为维护源码保留在 GitHub 仓库中。

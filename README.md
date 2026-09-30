# Kang An 的个人主页模板

本版采用你选中的第三种“实验室笔记”风格：浅灰窄侧栏、白色正文区、克制的蓝紫链接、等宽标题和元信息。使用原生 HTML + CSS，没有框架、安装依赖或构建步骤。当前仍是本地预览，未公开发布。

## 查看

用浏览器打开 `dist/index.html`；也可以在项目文件夹运行：

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
```

访问 `http://127.0.0.1:8765/`。按 Control-C 停止服务器。

## 页面安排

- **Home**：照片、个人简介、联系方式、博士后及工业界求职信息、News、访客区。没有 Research 项目列表和 Blog 摘要。
- **Research**：三条研究方向、Google Scholar、维护日期及三个 Selected projects：ASGO、Manifold Constraints、Learning Rate Warmup。ASGO 已有图片，其余两个项目保留左侧配图位置。
- **Activities**：报告、演讲和学术活动，当前保留占位。
- **Blog**：文章目录和每个项目的独立博客模板。
- **CV**：直接打开 `KangAn_CV_1page.pdf`。

News 仅在主页出现。旧 `news.html` 自动跳到首页的 News 区域，不再提供独立内容或侧栏入口。

## 文件位置

| 文件 | 用途 |
| --- | --- |
| `dist/index.html` | 个人介绍、联系方式、求职提示和 News |
| `dist/research.html` | 研究综述及项目列表 |
| `dist/activities.html` | Activities |
| `dist/blog/index.html` | 博客目录 |
| `dist/blog/project-01.html` | 第一篇文章模板 |
| `dist/blog/project-02.html` | 第二篇文章模板 |
| `dist/assets/css/style.css` | 全站实验室笔记主题 |
| `dist/assets/files/KangAn_CV_1page.pdf` | 原始一页 CV 的完整副本 |
| `dist/assets/files/profile_pic.jpg` | 你提供的个人照片 |
| `dist/assets/files/asgo.png` | ASGO 算法关系图，可点击查看原图 |
| `docs/visitor-map.html.txt` | 当前访客地图代码备份，保留原编号以延续统计 |
| `dist/design-compare.html` | 之前的三种风格对比，供参考 |
| `.openai/hosting.json` | 静态目录说明，无远程 Site ID |

`dist/` 中是直接编辑的源码，不是需要重新生成的构建产物。页面不依赖 JavaScript、外部字体或前端框架 CDN；访客地图使用 FlagCounter 在线图片。

## 已填的真实信息

姓名 Kang An（安康）、Rice University 博士生身份、研究简介、Email、GitHub、Google Scholar、LinkedIn 均来自你的明确说明或 `KangAn_CV_1page.pdf`。首页简介和三条 News 已按你提供的内容填好，并润色英文拼写与语法。简介包含导师 Shiqian Ma、合作导师 Donald Goldfarb 的主页链接，以及博士后、工业界全职和实习求职信息。News 按 2026 年 9 月 29 日、9 月 9 日、8 月 23 日倒序排列，Jiaxiang Li 的主页已链接。

CV 最初使用 `/Users/evelyn/Documents/KangAn_CV_1page.pdf` 的副本。这次首页修改保留了你当前放在网站中的 PDF，没有改写、重新导出或覆盖它。以后更新简历，覆盖 `dist/assets/files/KangAn_CV_1page.pdf` 即可，各页链接保持有效。

可入职时间仍待确认；当前 CV 没有给出预计毕业日期。照片使用你提供的 `profile_pic.jpg`。Research 的三个项目已填写，Activities 仍待填写。首页求职句使用 `.opportunity-highlight` 加粗和着色；简介中的邮箱保留你修改后的纯文本。

## 如何更新

### 首页

编辑 `dist/index.html` 中的 `.profile`。简介及求职信息位于 `.profile-bio`，照片位于 `.portrait`。更换同名照片后，同时更新图片的 `width`、`height` 和 `alt` 属性。News 位于 `#news` 下的 `.news-list`，新消息放在最上面；同时更新可见日期和 `<time datetime="YYYY-MM-DD">` 的机器可读日期。

### Research

每个项目是一个 `<article class="research-item">`，保留 `project-01`、`project-02`、`project-03` 的稳定锚点。修改标题、作者、发表信息、摘要和资源链接。Research 页头的 Google Scholar 指向你的个人主页；项目下方使用 arXiv 提供的 Scholar 论文查询链接（`scholar_lookup?arxiv_id=...`）。这些入口依赖 Scholar 的收录和可用性，不是假造的个人 citation ID。

ASGO 与 Manifold 项目简介根据当前 CV 和对应论文整理，Warmup 根据论文整理，统一用 “We” 描述合作成果。ASGO 的显存与运行开销数字来自 CV，并保留了比较对象和实验范围；不要将 8% overhead 改写为 8% speedup。ASGO 标为 NeurIPS 2025，另两篇分别标为 Preprint 2026 和 Preprint 2025。Warmup 在 arXiv 摘要元数据中误写为 “An Kang”，网站依照论文正文写为 “Kang An”。

论文来源：[ASGO](https://arxiv.org/abs/2503.20762)、[Manifold Constraints](https://arxiv.org/abs/2605.04418)、[Warmup](https://arxiv.org/abs/2509.07972)。ASGO 会议信息也由 [NeurIPS 2025 proceedings](https://proceedings.neurips.cc/paper_files/paper/2025/hash/b862a40b617719cde47fa268b8d5c91d-Abstract-Conference.html) 核对。

目前不从 Research 链接未写好的 Blog 模板。文章完成后，在相应 `.project-links` 中加入 Blog 链接。

将新图片放在 `dist/assets/files/`（或按需新建 `dist/assets/images/`），在 `.project-content` 之前加入：

```html
<figure class="project-figure">
  <a href="assets/files/project-02.png" target="_blank" rel="noopener">
    <img class="project-image" src="assets/files/project-02.png"
         alt="用一句话解释图片内容" width="640" height="450" loading="lazy">
  </a>
  <figcaption>Click to enlarge.</figcaption>
</figure>
```

`width`、`height` 应填写图片真实尺寸。项目只在 Research 页维护，不需要同时更新首页列表。后两项的配图尚未选定，所以当前不渲染占位图；桌面上保留图栏，手机上正文使用整行。

### Activities

编辑 `dist/activities.html` 中的 `.activity-list`。每项填写日期、活动类别、标题、说明以及已有的相关链接；没有链接时删除对应占位即可。

### Blog

1. 复制 `dist/blog/project-01.html` 并取一个稳定的文件名。
2. 修改标题、日期、摘要和 `<article class="article-content">` 中的内容。
3. 同步更新文章目录锚点及相关项目链接。
4. 在 `dist/blog/index.html` 增加文章条目，并在对应 Research 项目中更新 Blog 链接。

文章模板包含正文、图注、引用、代码块和公式预留位置；公式目前没有接入 LaTeX 渲染库。中文文章可直接写，将页面 `lang="en"` 改为 `lang="zh-CN"`。

### 导航

所有页面的侧栏直接写在 HTML 中。改动菜单时需同步首页、Research、Activities、博客目录和文章页。博客目录下的资源使用 `../` 相对路径。

## 访客统计

已为该主页启用独立的 FlagCounter 地图，编号 `bpT9`，统计页为 <https://info.flagcounter.com/bpT9>。首页 `.visitor-section` 内为实际代码，`docs/visitor-map.html.txt` 保留备份。你于 2026 年 9 月 29 日确认启用，并同意[服务条款](https://flagcounter.com/terms.html)和[隐私政策](https://flagcounter.com/privacy.html)。没有提交邮箱、创建密码或购买付费服务。

地图使用原生 HTML 图片，加载时由 FlagCounter 根据 IP 估计国家/地区，不要求精确位置权限。当前仅统计包含该图片的主页，且本地预览访问也会计入；最初几次访问包含接入检查，不能回溯接入前的访问。Pageviews 是图片加载次数，不等于独立访客人数；独立访客默认按 24 小时去重。地图图片可能有约 5 分钟刷新延迟。点击地图或 View statistics 可打开统计详情。如果网络或浏览器拦截第三方图片，地图可能无法加载或计数。

保留同一个计数器编号和官方图片链接，更新页面不需要重新生成计数器。不要下载地图作为静态图片替换，否则无法统计新访问。免费计数器连续 30 天没有新访客可能被删除；未提供邮箱的计数器没有管理后台。详见 [FlagCounter FAQ](https://flagcounter.com/faq.html)。

## 后续发布

本地 Git 仓库已建立。Git 全局用户为 `ErstinAn`，邮箱为 `ka56@rice.edu`；此前检查 GitHub CLI 尚未登录，没有设置 origin 或推送。以后计划使用 `erstinan.github.io`。

网站源码位于 `dist/`，正式发布时可以配置 GitHub Actions 上传该目录，或调整到适合分支发布的目录。预览版保留 `noindex, nofollow`；填好正式内容后再移除，并确认简历内容适合公开。

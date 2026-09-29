# Kang An 的个人主页模板

本版采用你选中的第三种“实验室笔记”风格：浅灰窄侧栏、白色正文区、克制的蓝紫链接、等宽标题和元信息。使用原生 HTML + CSS，没有框架、安装依赖或构建步骤。当前仍是本地预览，未公开发布。

## 查看

用浏览器打开 `dist/index.html`；也可以在项目文件夹运行：

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
```

访问 `http://127.0.0.1:8765/`。按 Control-C 停止服务器。

## 页面安排

- **Home**：个人简介、联系方式、工业界求职提示、News、访客区。没有 Research 项目列表和 Blog 摘要。
- **Research**：研究综述、Google Scholar、维护日期、左图右文的项目列表。
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
| `dist/design-compare.html` | 之前的三种风格对比，供参考 |
| `.openai/hosting.json` | 静态目录说明，无远程 Site ID |

`dist/` 中是直接编辑的源码，不是需要重新生成的构建产物。页面不依赖 JavaScript、外部字体或 CDN。

## 已填的真实信息

姓名 Kang An、Rice University 博士生身份、研究简介、Email、GitHub、Google Scholar、LinkedIn 均来自你的明确说明或 `KangAn_CV_1page.pdf`。简介仅概括优化、深度学习及大模型预训练，不将未经确认的项目结果写成事实。

CV 使用 `/Users/evelyn/Documents/KangAn_CV_1page.pdf` 的原文件副本，与 Downloads 中同名文件一致。没有改写或重新导出 PDF。以后更新简历，覆盖 `dist/assets/files/KangAn_CV_1page.pdf` 即可，各页链接保持有效。

具体岗位与可入职时间仍待填写。CV 的预计毕业时间不等同于入职时间。照片、项目图、项目详情、News 和 Activities 使用明确的占位；没有虚构成果、日期或访客统计。

## 如何更新

### 首页

编辑 `dist/index.html` 中的 `.profile`。求职行位于 `.job-note`，照片占位位于 `.portrait-slot`。News 位于 `#news` 下的 `.news-list`，新消息放在最上面，日期与正文分别填写。

### Research

每个项目是一个 `<article class="research-item">`。修改标题、作者、发表信息、摘要、个人贡献和三项链接。Research 页头的 Google Scholar 已指向你的个人主页；每个项目的 Scholar 链接需要对应到单篇论文，当前仍待补充。

将论文链接的 `span` 换成真实的 `a`，并移除 `aria-disabled`、`unavailable` 和 `pending`。例如：

```html
<a class="project-link" href="真实的论文地址" target="_blank" rel="noopener noreferrer">arXiv</a>
```

将图片放在 `dist/assets/images/` 中（按需新建），并将图片占位框替换为：

```html
<img class="project-image" src="assets/images/project-01.webp"
     alt="用一句话解释图片内容" width="640" height="450" loading="lazy">
```

项目只在 Research 页维护，不再需要同时更新首页列表。

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

当前显示未接入状态，没有发送访客数据或显示模拟数字。正式上线后再接入统计服务，明确访问次数的口径，位置使用国家/地区等粗粒度信息。

## 后续发布

本地 Git 仓库已建立。Git 全局用户为 `ErstinAn`，邮箱为 `ka56@rice.edu`；此前检查 GitHub CLI 尚未登录，没有设置 origin 或推送。以后计划使用 `erstinan.github.io`。

网站源码位于 `dist/`，正式发布时可以配置 GitHub Actions 上传该目录，或调整到适合分支发布的目录。预览版保留 `noindex, nofollow`；填好正式内容后再移除，并确认简历内容适合公开。

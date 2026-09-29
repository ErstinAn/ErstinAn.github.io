# ErstinAn 的个人主页模板

这是一份本地设计预览，使用原生 HTML 和共用 CSS。无需安装 npm，也没有构建步骤。当前没有发布到公网、创建远程 GitHub 仓库或接入访客统计。

## 打开预览

最方便的方法：直接用浏览器打开 `dist/index.html`。所有页面、CSS 和页内链接均使用相对路径，支持本地文件方式浏览。

也可以在这个文件夹运行：

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
```

然后访问 `http://127.0.0.1:8765/`。按 Control-C 停止预览。

## 文件对应关系

| 文件 | 修改内容 |
| --- | --- |
| `dist/index.html` | 姓名、个人介绍、求职信息、首页项目、最新动态、最新文章 |
| `dist/research.html` | 研究综述、维护日期、完整项目介绍和链接 |
| `dist/news.html` | 历史动态 |
| `dist/blog/index.html` | 博客目录 |
| `dist/blog/project-01.html` | 第一篇项目博客模板 |
| `dist/blog/project-02.html` | 第二篇项目博客模板 |
| `dist/assets/css/style.css` | 全站颜色、字体、间距、手机排版 |
| `.openai/hosting.json` | 静态网站目录说明；当前无远程 Site ID |

`dist` 里就是直接编辑的网站源码，不是需要反复生成的构建产物。保留它是为了让静态预览与后续发布使用同一份文件。

## 当前使用的真实信息

- GitHub：`ErstinAn`，链接 `https://github.com/ErstinAn`
- 联系邮箱：暂使用你提供的 `ka56@rice.edu`；如果主页需要其他联系邮箱，替换各页面的 `mailto:`。
- 求职方向：工业界。岗位类型和可入职时间仍保留占位。
- 显示名称暂用 GitHub 用户名；没有推断你的真实姓名、所属机构或研究方向。

所有方括号内容均待填写。照片和论文图是明确标记的占位框，没有编造论文、成果、访客数字或地图数据。CV、arXiv、Google Scholar 没有使用虚假链接；Blog 按钮可以打开真实存在的本地文章模板。

## 替换项目图片

在 `dist/assets/images/` 下放置图片（需要时新建该目录），把项目的整个 `figure-slot` 占位元素替换为：

```html
<img class="project-image"
     src="assets/images/project-01.webp"
     alt="用一句话说明图里的方法或结果"
     width="640" height="450" loading="lazy">
```

博客文章里的图片路径应使用 `../assets/images/...`。项目标题、图和链接在首页与 Research 页面各有一份，修改时需同步。

## 填写研究综述

`research.html` 中已经保留：Research 标题 → Scholar 引导 → 手动维护日期 → 综述 → Selected publications。

综述建议覆盖三个问题：你研究什么问题；你用什么方法；它对实际应用或未来研究有什么价值。当前的英文句子只提供结构，不代表已经确认的个人经历。

全站 Google Scholar 应指向你的个人文献列表；每个项目的 Google Scholar 应指向对应论文。两者不要混用。

## 激活 CV、arXiv 和 Scholar

把灰色占位 `span` 替换为带真实 `href` 的 `a`，同时去掉 `aria-disabled`、`pending` 和 `unavailable`。

```html
<a class="project-link" href="你的真实论文地址"
   target="_blank" rel="noopener noreferrer">arXiv ↗</a>
```

CV 建议放在 `dist/assets/files/cv.pdf`。顶栏和简介的 CV 占位都需要替换为链接；博客子目录里使用 `../assets/files/cv.pdf`。

## 新增博客

1. 复制 `dist/blog/project-01.html`，换成稳定、有意义的文件名。
2. 修改 `<title>`、主标题、作者、日期、摘要和正文。正文直接写在 `<article class="article-content">` 中。
3. 更新目录锚点以及“Related project / Back to the project”的地址。
4. 在 `dist/blog/index.html` 和首页添加或更新文章卡片。
5. 给对应的 Research 项目补上 Blog 链接。

文章模板含正文、目录、图片与图注、引用、代码块以及公式预留位置。公式位置目前只是占位，尚未加载 LaTeX 渲染库。有实际公式时再配置。中英文都可直接编写；中文文章将最上方 `lang="en"` 改为 `lang="zh-CN"`。

本地查看模板不依赖 JavaScript、远程字体或 CDN。网站导航是静态 HTML，修改导航时要同步各页面。

## 访客统计

目前没有启用统计。Visitors 区域显示“Not connected”和破折号。正式上线时可以接入 MapMyVisitors 等服务，并确认它统计的是访问次数还是独立访客数。位置只使用粗粒度国家/地区展示。服务不可用时不应影响正文阅读。

## GitHub 状态与后续发布

制作时检查到 Git 已安装，全局用户名是 `ErstinAn`，邮箱为 `ka56@rice.edu`；`gh auth status` 显示 GitHub CLI 尚未登录。这个结果不代表你的浏览器、GitHub Desktop 或其他 Git 凭据一定未登录。

后续计划用个人仓库 `erstinan.github.io`，网址为 `https://erstinan.github.io/`。已在当前文件夹初始化独立的本地 Git 仓库并保存初版。这次只做本地模板，没有设置远程 origin 或推送。

当前站点文件在 `dist/` 下，因此不能直接将仓库根目录设为 Pages 发布源。正式发布时可选择配置 GitHub Actions 上传 `dist`，或调整网站目录后再使用分支发布。到时只选择一种发布方式并更新这份说明。

正式上线前，把待填内容换成真实内容，并移除每页的 `noindex, nofollow` 标签及模板标记。预览版的这些标记用于明确区分模板和正式个人主页。

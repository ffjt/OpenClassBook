# OpenClassBook

[![CI](https://github.com/ffjt/OpenClassBook/actions/workflows/ci.yml/badge.svg)](https://github.com/ffjt/OpenClassBook/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

OpenClassBook is a local-first, open-source workspace for turning a class magazine or school publication into a print-ready book. It brings the complete workflow into one place: invite contributors, collect articles, review submissions, arrange the book, and export a PDF.

OpenClassBook 是一个本地优先的开源班级文集/校刊出版工作台。它把“邀请投稿、收集文章、审核内容、编排书籍、导出 PDF”整合成一条完整流程，让组织者不必反复收 Word、统一格式或手工排版。

## What it does / 核心能力

- **Book workspace / 书籍工作区** — Create and manage multiple books with book-scoped settings and content. / 创建并管理多本书，每本书拥有独立的设置与内容。
- **Invite and join / 邀请与加入** — Share a book-specific invite code; contributors can join without an account. / 使用每本书独立的邀请码邀请投稿人，无需注册账号即可加入。
- **Submission workspace / 投稿工作台** — Draft, edit, preview, and submit articles with optional images. / 支持文章草稿、编辑、预览、提交与配图。
- **Review / 审核** — Review article-level submissions, approve or reject them, and control publication order. / 以 Article 为审核单元，通过、退回并调整出版顺序。
- **Numbering / 编号** — Choose no numbering, automatic numbering, or an imported number pool that authors claim explicitly. / 支持不编号、自动编号，以及投稿人主动认领的导入编号池。
- **Template and layout / 模板与排版** — Persist typography in a book template and arrange front matter, articles, and back matter with drag and drop. / 以书籍 Template 统一保存字体与页面规则，并拖拽编排前言、文章、后记等内容。
- **PDF export / PDF 导出** — Inspect lightweight metadata first, render the actual PDF only on demand, then preview or download it. / 先加载轻量预检信息，用户明确操作后再渲染实际 PDF，并支持预览与下载。
- **Bilingual and accessible UI / 双语与无障碍界面** — English and Simplified Chinese copy, light and dark themes, reduced-motion support. / 提供英文与简体中文、浅色与深色主题，并支持减少动态效果。

## Workflow / 使用流程

```text
Create a book / 创建书籍
        ↓
Configure submission rules and template / 配置投稿规则与模板
        ↓
Invite contributors / 生成邀请码并邀请投稿人
        ↓
Join and optionally claim a number / 加入并按需认领编号
        ↓
Write and submit articles / 编辑并提交文章
        ↓
Review and arrange / 审核并编排顺序
        ↓
Render and export PDF / 渲染并导出 PDF
```

## Architecture / 架构

```text
React + TypeScript + Vite
            │
            ▼
FastAPI API → Service → Repository → SQLite
            │
            ├─ Local upload storage / 本地上传存储
            └─ PDF and page-asset renderers / PDF 与页面资源渲染器
```

The API layer handles HTTP contracts, services hold business rules, repositories own database access, and SQLite stores the local application data. A book-scoped `Template` is the single source of truth for formatting; an `Article` stores content and its image-placement metadata, not book-wide typography.

API 层负责 HTTP 契约，Service 层承载业务规则，Repository 层统一访问数据库，SQLite 保存本地数据。每本书的 `Template` 是排版规则的唯一来源；`Article` 只保存内容与配图位置元数据，不保存全书字体等格式规则。

## Repository layout / 目录结构

```text
frontend/                 React application / React 前端
  src/pages/              Route-level screens / 页面与路由页面
  src/repositories/       API clients / 前端数据仓库
backend/                  FastAPI application / FastAPI 后端
  app/api/v1/             REST endpoints / REST 接口
  app/services/           Business logic / 业务逻辑
  app/repositories/       SQLite access / 数据库访问
  app/storage/            Uploaded files / 上传文件存储
docs/                     Release and project notes / 发布与项目文档
```

## Requirements / 环境要求

- Node.js 20 or newer / Node.js 20 或更高版本
- pnpm 10 or newer / pnpm 10 或更高版本
- Python 3.12 or newer / Python 3.12 或更高版本
- [uv](https://docs.astral.sh/uv/) (recommended / 推荐)
- Docker Desktop (optional / 可选)
- Microsoft Word (optional; enables native DOCX conversion when available) / Microsoft Word（可选；安装后可启用 DOCX 原生转换）

DOCX assets use `docx2pdf` when Word is available. If native conversion cannot be used, the backend falls back to its cross-platform renderer, so Linux and Docker do not require Office.

安装 Word 时，DOCX 资源会优先通过 `docx2pdf` 转换；无法使用原生转换时，后端会自动回退到跨平台渲染器，因此 Linux 与 Docker 无需安装 Office。

## Run locally / 本地运行

Install JavaScript and Python dependencies / 安装前端与后端依赖：

```bash
pnpm install --frozen-lockfile
cd backend
uv sync --frozen --group dev
```

Start the backend in one terminal / 在一个终端启动后端：

```bash
cd backend
uv run uvicorn app.main:app --reload
```

Start the frontend in another terminal / 在另一个终端启动前端：

```bash
pnpm dev
```

Open the application at <http://localhost:5173>. The API is available at <http://localhost:8000>, with interactive documentation at <http://localhost:8000/docs>.

访问 <http://localhost:5173> 打开应用。API 地址为 <http://localhost:8000>，交互式接口文档位于 <http://localhost:8000/docs>。

Configuration examples are in [`.env.example`](.env.example) and [`backend/.env.example`](backend/.env.example). By default, SQLite data and uploaded files remain on the local machine.

配置示例见 [`.env.example`](.env.example) 与 [`backend/.env.example`](backend/.env.example)。默认情况下，SQLite 数据库和上传文件均保存在本机。

## Docker / Docker 运行

```bash
# Copy .env.production.example to .env, set the required public domains,
# JWT secret, and one email provider before starting.
# 先将 .env.production.example 复制为 .env，并填写公网域名、JWT 密钥和一种邮件服务。
docker compose up --build
```

The Compose deployment requires explicit production settings and is intended to sit behind an HTTPS reverse proxy. The frontend is served by Nginx on port 5173; the backend listens on port 8000. Docker volumes persist the SQLite database and uploaded files.

Compose 部署必须提供明确的生产配置，并应置于 HTTPS 反向代理之后。前端由 Nginx 提供并运行在 5173 端口，后端运行在 8000 端口。Docker 卷会持久化 SQLite 数据库和上传文件。

## Quality checks / 质量检查

Run the frontend gates from the repository root / 在仓库根目录运行前端检查：

```bash
pnpm check
```

Run backend linting and tests / 运行后端代码检查与测试：

```bash
cd backend
uv run ruff check app tests
uv run pytest -q
```

Validate the Compose file / 校验 Docker Compose 配置：

```bash
docker compose config --quiet
```

GitHub Actions runs the frontend lint/test/build gates and backend lint/test gates for pull requests and pushes to `main`. The release review and known limitations are documented in [`docs/V1_RELEASE_REVIEW.md`](docs/V1_RELEASE_REVIEW.md).

GitHub Actions 会在 Pull Request 和推送到 `main` 时执行前端 lint/test/build、后端 lint/test。发布结论与已知限制记录在 [`docs/V1_RELEASE_REVIEW.md`](docs/V1_RELEASE_REVIEW.md)。

## Scope and security / 产品边界与安全

V1 is designed for trusted local or private-LAN use. It is intentionally account-free: there is no login, JWT, email, phone, cloud sync, or concurrent collaborative editing. Do not expose the backend directly to the public internet.

V1 面向可信的本机或私有局域网环境，并且刻意保持免账号设计：不包含登录、JWT、邮箱、手机号、云同步或多人实时协作。请勿将后端直接暴露到公网。

## Contributing / 参与贡献

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report security issues privately according to [SECURITY.md](SECURITY.md), rather than through a public issue.

提交 Pull Request 前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。安全问题请按照 [SECURITY.md](SECURITY.md) 私下报告，不要通过公开 Issue 提交。

## License / 许可证

OpenClassBook is released under the [MIT License](LICENSE).

OpenClassBook 使用 [MIT 许可证](LICENSE)发布。

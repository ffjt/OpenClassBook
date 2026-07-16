# OpenClassBook

[![CI](https://github.com/ffjt/OpenClassBook/actions/workflows/ci.yml/badge.svg)](https://github.com/ffjt/OpenClassBook/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

OpenClassBook is a local-first, open-source publishing workflow for collecting essays, reviewing submissions, arranging a book, and exporting a print-ready PDF.

OpenClassBook 是一个本地优先的开源出版工作流，用于收集文章、审核投稿、编排书籍并导出可直接印刷的 PDF。

## V1.0 features / V1.0 功能

- Create and manage multiple books / 创建并管理多本书籍
- Invite authors with a book-specific code / 使用每本书独立的邀请码邀请作者
- Generate or import claimable article numbers from XLSX, CSV, or TXT / 自动生成编号，或从 XLSX、CSV、TXT 导入可认领编号
- Author submission workspace with drafts, images, and live preview / 作者投稿工作台，支持草稿、配图与实时预览
- Review, approve, reject, and order submissions / 审核、通过、退回并排序投稿
- Shared typography and page template persisted per book / 每本书持久化统一的字体与页面模板
- Drag-and-drop book layout with uploaded front/back matter / 拖拽编排书籍，并上传封面、前言、后记等内容
- Print-ready PDF preview, generation, and download / 预览、生成并下载可印刷 PDF
- English, Simplified Chinese, light, and dark interfaces / 英文、简体中文、浅色与深色界面
- Accessible route and interaction animation with reduced-motion support / 支持“减少动态效果”的无障碍页面与交互动效

## Architecture / 架构

```text
React + TypeScript + Vite
            │
            ▼
FastAPI API → Service → Repository → SQLite
            │
            ├─ Local upload storage / 本地上传存储
            └─ ReportLab PDF renderer / PDF 渲染
```

The backend keeps business rules out of API handlers and database access behind repositories. A book-scoped template is the single source of truth for formatting; articles only store content.

后端将业务规则放在 Service 层，并通过 Repository 访问数据库。每本书的 Template 是格式的唯一来源，Article 只保存内容。

## Requirements / 环境要求

- Node.js 20+
- pnpm 10+
- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (recommended / 推荐)
- Docker Desktop (optional / 可选)
- Microsoft Word (optional; enables native DOCX-to-PDF conversion on Windows and macOS) / Microsoft Word（可选；在 Windows 和 macOS 上启用原生 DOCX 转 PDF）

DOCX page resources automatically use Microsoft Word through `docx2pdf` when Word is installed. If Word is unavailable or native conversion fails, OpenClassBook falls back to its cross-platform compatible renderer; Linux and Docker therefore require no Office installation.

导入的 DOCX 页面资源会在已安装 Word 时自动通过 `docx2pdf` 使用 Word 原生转换。未安装 Word 或原生转换失败时，OpenClassBook 会自动回退到跨平台兼容渲染器，因此 Linux 与 Docker 无需安装 Office。

## Local development / 本地开发

Install dependencies / 安装依赖：

```bash
pnpm install --frozen-lockfile
cd backend
uv sync --frozen --group dev
```

Start the backend / 启动后端：

```bash
cd backend
uv run uvicorn app.main:app --reload
```

Start the frontend in another terminal / 在另一个终端启动前端：

```bash
pnpm dev
```

Open / 访问：

- App / 应用: <http://localhost:5173>
- API: <http://localhost:8000>
- API docs / 接口文档: <http://localhost:8000/docs>

Configuration examples are available in [`.env.example`](.env.example) and [`backend/.env.example`](backend/.env.example). The default SQLite database and uploaded files stay on the local machine.

配置示例见 [`.env.example`](.env.example) 与 [`backend/.env.example`](backend/.env.example)。默认 SQLite 数据库和上传文件均保存在本机。

## Docker

```bash
docker compose up --build
```

The production container serves the built frontend with Nginx and persists both SQLite data and uploads in Docker volumes.

生产容器使用 Nginx 提供构建后的前端，并通过 Docker 卷持久化 SQLite 数据和上传文件。

## Quality checks / 质量检查

```bash
# Frontend / 前端
pnpm check

# Backend / 后端
cd backend
uv run ruff check app tests
uv run pytest -q

# Containers / 容器配置
docker compose config --quiet
```

GitHub Actions runs the same lint, test, and build gates for pushes and pull requests.

GitHub Actions 会在推送和拉取请求中执行相同的代码检查、测试与构建门槛。

The release decision, resolved blockers, evidence, and accepted limitations are documented in [`docs/V1_RELEASE_REVIEW.md`](docs/V1_RELEASE_REVIEW.md).

发布结论、已解决阻断项、验证证据与接受的限制记录在 [`docs/V1_RELEASE_REVIEW.md`](docs/V1_RELEASE_REVIEW.md)。

## V1.0 scope and security / V1.0 范围与安全说明

V1.0 is designed for trusted local or private-LAN use. It does not include accounts, authentication, authorization, cloud sync, or concurrent collaborative editing. Do not expose the backend directly to the public internet.

V1.0 面向可信的本机或私有局域网使用，不包含账号、身份认证、权限系统、云同步或多人实时协作。请勿将后端直接暴露在公网。

## Contributing / 参与贡献

See [CONTRIBUTING.md](CONTRIBUTING.md) for development rules and quality gates. Please report security issues using [SECURITY.md](SECURITY.md), not a public issue.

开发规则与质量门槛见 [CONTRIBUTING.md](CONTRIBUTING.md)。安全问题请按 [SECURITY.md](SECURITY.md) 私下报告，不要提交公开 Issue。

## License / 许可证

OpenClassBook is released under the [MIT License](LICENSE).

OpenClassBook 使用 [MIT 许可证](LICENSE)发布。
